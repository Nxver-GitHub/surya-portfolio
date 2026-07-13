"use client";

/**
 * useTerminalChat — the café terminal's client controller (E11).
 *
 * Bridges the AI SDK v6 `useChat` hook (streaming replies from
 * /api/cafe-terminal) with the terminal's SESSION STORE (terminalSession.ts) —
 * a module-level external store whose scrollback, login step, turn count and
 * command history survive the Terminal component unmounting. That's the whole
 * point of the store: close the overlay and reopen it later in the same page
 * visit, and the conversation is still there. This hook is now owned by the
 * PARENT (CafeBrowser) and called EXACTLY ONCE — its return value is passed
 * down to every terminal surface (the overlay/screen panel and the mobile
 * input bar), so they all read and drive one shared session.
 *
 * Responsibilities:
 *   - Boot: on the first open of the visit, play BOOT_LINES + the login prompt;
 *     on reopen, print a single "session restored." line. Both are idempotent
 *     against the store's `booted` flag.
 *   - Route each submission:
 *       login !== "authed" → the login fiction (handleLoginInput); never a
 *         command, never the API.
 *       authed → local command (help/about/…/clear/exit) handled here, or a
 *         chat message routed to the model via `sendMessage`.
 *   - Keep ONE ordered scrollback in the store: user echoes are appended at
 *     submit time, finished replies folded in via `onFinish`, and the in-flight
 *     reply renders as a transient tail (derived here, never committed) — so
 *     errors and later commands always appear in true session order.
 *   - Enforce a per-session user-message cap, then nudge to the contact links.
 *   - Map 429/503 errors to themed lines instead of raw errors.
 *
 * Command resolution, error mapping, the login fiction, the portrait card and
 * history cycling all live in pure, separately-tested modules.
 */

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { resolveLocalCommand } from "./localCommands";
import { themedErrorLine } from "./errorMapping";
import { handleLoginInput, LOGIN_PROMPT } from "./loginMachine";
import { isWhoIsSurya, makePortraitLine } from "./portrait";
import {
  appendSessionLines,
  clearSessionLines,
  patchTerminalSession,
  pushSessionHistory,
  useTerminalSession,
  type LoginState,
} from "./terminalSession";
import {
  BOOT_LINES,
  MAX_USER_MESSAGES,
  SESSION_LIMIT_LINE,
  makeLine,
  makeLines,
  type TerminalLine,
} from "./terminalLines";

const API_PATH = "/api/cafe-terminal";

/** Dim one-liner shown when the terminal is reopened mid-visit (boot already
 * played once, so we don't replay the whole cold-start sequence). */
const SESSION_RESTORED_LINE = "session restored.";

/** Extract the concatenated text of a UIMessage's text parts. The model is
 * told plain-text-only but still leaks markdown bold markers occasionally;
 * the terminal renders raw text, so strip `**` rather than display it. */
function messageText(message: UIMessage): string {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .replaceAll("**", "");
}

/**
 * The controller surface passed down to every terminal view. One instance per
 * page visit (the parent calls the hook once); the overlay panel, the in-screen
 * panel and the mobile input bar all render from and drive this same object.
 */
export interface TerminalChatApi {
  /** The full ordered scrollback (boot + login + commands + streamed turns). */
  lines: readonly TerminalLine[];
  /** True while a model reply is in flight (drives the caret/"working" state). */
  busy: boolean;
  /** Submit a line of input (login step, command, or chat). No-op on empty
   * input once authed; the login step handles its own empty-Enter semantics. */
  submit: (input: string) => void;
  /** Whether the session message cap has been reached. */
  atSessionLimit: boolean;
  /** The current login-fiction step — drives password masking in the inputs. */
  login: LoginState;
  /** Submitted-input history (oldest → newest) for ↑/↓ cycling in the inputs. */
  history: readonly string[];
}

interface UseTerminalChatOptions {
  /** Whether the terminal surface is currently open (drives boot/restore).
   * The hook is mounted for the whole page visit; boot must wait for the FIRST
   * open, not page load, so the parent passes its open state through. */
  open: boolean;
  /** Called when the user runs `exit` (or otherwise closes from within). */
  onExit: () => void;
}

export function useTerminalChat({
  open,
  onExit,
}: UseTerminalChatOptions): TerminalChatApi {
  // The session (scrollback, login step, turn count, history, booted flag)
  // lives in the module store so it survives the overlay unmounting. This hook
  // is the single writer of chat/login lines; it never holds session state in
  // component-local useState.
  const session = useTerminalSession();
  const { lines: sessionLines, login, userTurns, history, booted } = session;

  // Track the previous open state so each open EDGE (closed → open) runs the
  // boot-or-restore step exactly once — the hook stays mounted across
  // close/reopen, so we key off the transition, not mount.
  const wasOpenRef = useRef(false);

  // On each open edge: cold-boot the very first time this visit (BOOT_LINES +
  // login prompt), or print a single dim "session restored." line on reopen.
  // The `booted` flag lives in the store, so it holds across the whole visit.
  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }
    if (wasOpenRef.current) return; // already handled this open edge
    wasOpenRef.current = true;
    if (booted) {
      appendSessionLines([makeLine("system", SESSION_RESTORED_LINE)]);
      return;
    }
    patchTerminalSession({ booted: true, login: "login" });
    appendSessionLines([
      ...makeLines("system", BOOT_LINES),
      makeLine("system", LOGIN_PROMPT),
    ]);
  }, [open, booted]);

  // One transport for the hook's lifetime. Flattens AI-SDK UI messages to the
  // route's strict {role, content} shape — only user/assistant text turns cross
  // the wire; nothing else (no system prompt, no extra keys).
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: API_PATH,
        prepareSendMessagesRequest: ({ messages: uiMessages }) => ({
          body: {
            messages: uiMessages
              .filter((m) => m.role === "user" || m.role === "assistant")
              .map((m) => ({
                role: m.role,
                // Mirror the route's per-role caps (user 500 / assistant
                // 2400) so an unusually long reply can never poison the next
                // turn's validation.
                content: messageText(m)
                  .trim()
                  .slice(0, m.role === "assistant" ? 2400 : 500),
              }))
              .filter((m) => m.content.length > 0),
          },
        }),
      }),
    [],
  );

  const { messages, sendMessage, status } = useChat({
    transport,
    // Groq streams hundreds of chunks/second; unthrottled, every chunk is a
    // state update whose render cascades past React's update-depth limit. Batch
    // UI updates to ~16fps.
    experimental_throttle: 60,
    onError: (error) => {
      appendSessionLines([makeLine("error", themedErrorLine(error))]);
    },
    // Fold the finished reply into the ordered scrollback; the transient
    // streaming tail below stops rendering once `status` leaves streaming.
    onFinish: ({ message }) => {
      const text = messageText(message);
      if (message.role === "assistant" && text.length > 0) {
        appendSessionLines([makeLine("reply", text)]);
      }
    },
  });

  const busy = status === "submitted" || status === "streaming";
  const atSessionLimit = userTurns >= MAX_USER_MESSAGES;

  const submit = useCallback(
    (input: string) => {
      // --- Login fiction: everything before the guest shell. Never a command,
      // never the API. Record history for every non-empty input EXCEPT while
      // masking a password (don't stash typed passwords in ↑/↓ history). ---
      if (login !== "authed") {
        const wasPassword = login === "password";
        if (!wasPassword) pushSessionHistory(input);
        const result = handleLoginInput(login, input);
        appendSessionLines(result.lines);
        if (result.next !== login) patchTerminalSession({ login: result.next });
        return;
      }

      // --- Authed guest shell: local command or chat. ---
      const resolved = resolveLocalCommand(input);

      switch (resolved.kind) {
        case "print":
          // Echo the command, then its output (echo only for non-empty input).
          // Command output is plain strings; the one marker line localCommands
          // can't express (its result type is string-only) becomes the real
          // portrait media card here — the seam is the "[portrait:" prefix.
          if (input.trim().length > 0) {
            pushSessionHistory(input);
            appendSessionLines([
              makeLine("prompt", `> ${input.trim()}`),
              ...resolved.lines.map((text) =>
                text.startsWith("[portrait:")
                  ? makePortraitLine()
                  : makeLine("system", text),
              ),
            ]);
          }
          return;
        case "clear":
          pushSessionHistory(input);
          appendSessionLines([makeLine("prompt", "> clear")]);
          clearSessionLines();
          return;
        case "exit":
          pushSessionHistory(input);
          onExit();
          return;
        case "chat": {
          if (busy) return; // ignore submits while a reply is streaming
          pushSessionHistory(resolved.text);
          if (atSessionLimit) {
            appendSessionLines([
              makeLine("prompt", `> ${resolved.text}`),
              makeLine("system", SESSION_LIMIT_LINE),
            ]);
            return;
          }
          patchTerminalSession({ userTurns: userTurns + 1 });
          // Echo the user line into the scrollback NOW, so anything that
          // follows (streamed reply, themed error, a later command) renders
          // after it in true session order. When the visitor asks who Surya is,
          // drop the portrait card right after the echo (the question still
          // goes to the model for a real answer).
          const echo: TerminalLine[] = [makeLine("prompt", `> ${resolved.text}`)];
          if (isWhoIsSurya(resolved.text)) echo.push(makePortraitLine());
          appendSessionLines(echo);
          sendMessage({ text: resolved.text });
          return;
        }
      }
    },
    [atSessionLimit, busy, login, onExit, sendMessage, userTurns],
  );

  // The scrollback IS the store's committed lines, in append order (boot,
  // login, echoes, command output, errors, finished replies). While a reply is
  // in flight, the partial assistant text renders as a transient tail row that
  // is NEVER committed to the store; `onFinish` folds the final text in the
  // moment the tail stops rendering.
  const lines = useMemo<readonly TerminalLine[]>(() => {
    if (!busy) return sessionLines;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return sessionLines;
    const tail = messageText(last);
    if (tail.length === 0) return sessionLines;
    return [...sessionLines, { id: "streaming-tail", tone: "reply", text: tail }];
  }, [busy, sessionLines, messages]);

  return { lines, busy, submit, atSessionLimit, login, history };
}
