"use client";

/**
 * useTerminalChat — the café terminal's client controller (E11).
 *
 * Bridges the AI SDK v6 `useChat` hook (streaming replies from
 * /api/cafe-terminal) with a local scrollback log that also carries boot
 * chatter and the output of client-only commands (help/about/projects/contact/
 * clear/exit) which never hit the API. Responsibilities:
 *
 *   - Boot sequence on open (instant under reduced motion).
 *   - Route each submission: local command → handled here; anything else →
 *     model via `sendMessage`. The request body is flattened to the route's
 *     `{ messages: [{role, content}] }` contract via `prepareSendMessagesRequest`.
 *   - Keep ONE ordered scrollback: user echoes are appended at submit time,
 *     finished replies are folded in via `onFinish`, and the in-flight reply
 *     renders as a transient tail — so errors and later commands always appear
 *     in true session order (and `clear` wipes the whole screen).
 *   - Enforce a per-session user-message cap, then nudge to the contact links.
 *   - Map 429/503 errors to themed lines instead of raw errors.
 *
 * The heavy lifting of command resolution and error mapping lives in pure,
 * separately-tested modules (localCommands.ts, errorMapping.ts).
 */

import { useCallback, useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { resolveLocalCommand } from "./localCommands";
import { themedErrorLine } from "./errorMapping";
import {
  BOOT_LINES,
  MAX_USER_MESSAGES,
  SESSION_LIMIT_LINE,
  makeLine,
  makeLines,
  type TerminalLine,
} from "./terminalLines";

const API_PATH = "/api/cafe-terminal";

/** Extract the concatenated text of a UIMessage's text parts. */
function messageText(message: UIMessage): string {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");
}

export interface UseTerminalChat {
  /** The full ordered scrollback (boot + commands + streamed turns). */
  lines: readonly TerminalLine[];
  /** True while a model reply is in flight (drives the caret/"working" state). */
  busy: boolean;
  /** Submit a line of input (command or chat). No-op on empty input. */
  submit: (input: string) => void;
  /** Whether the session message cap has been reached. */
  atSessionLimit: boolean;
}

interface UseTerminalChatOptions {
  /** Called when the user runs `exit` (or otherwise closes from within). */
  onExit: () => void;
}

export function useTerminalChat({
  onExit,
}: UseTerminalChatOptions): UseTerminalChat {
  // Seed the boot chatter as the initial scrollback (instant; the view handles
  // any reveal timing). The hook mounts fresh each time the terminal opens and
  // unmounts on close, so this is the whole boot sequence — no reset effect.
  const [localLines, setLocalLines] = useState<readonly TerminalLine[]>(() =>
    makeLines("system", BOOT_LINES),
  );
  const [userTurns, setUserTurns] = useState(0);

  const appendLocal = useCallback((toAdd: readonly TerminalLine[]) => {
    if (toAdd.length === 0) return;
    setLocalLines((prev) => [...prev, ...toAdd]);
  }, []);

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
              .map((m) => ({ role: m.role, content: messageText(m) }))
              .filter((m) => m.content.trim().length > 0),
          },
        }),
      }),
    [],
  );

  const { messages, sendMessage, status } = useChat({
    transport,
    // Groq streams hundreds of chunks/second; unthrottled, every chunk is a
    // state update whose render cascades (via the parent scrollback mirror)
    // past React's update-depth limit. Batch UI updates to ~16fps.
    experimental_throttle: 60,
    onError: (error) => {
      appendLocal([makeLine("error", themedErrorLine(error))]);
    },
    // Fold the finished reply into the ordered scrollback; the transient
    // streaming tail below stops rendering once `status` leaves streaming.
    onFinish: ({ message }) => {
      const text = messageText(message);
      if (message.role === "assistant" && text.length > 0) {
        appendLocal([makeLine("reply", text)]);
      }
    },
  });

  const busy = status === "submitted" || status === "streaming";
  const atSessionLimit = userTurns >= MAX_USER_MESSAGES;

  const submit = useCallback(
    (input: string) => {
      const resolved = resolveLocalCommand(input);

      switch (resolved.kind) {
        case "print":
          // Echo the command, then its output (echo only for non-empty input).
          if (input.trim().length > 0) {
            appendLocal([
              makeLine("prompt", `> ${input.trim()}`),
              ...makeLines("system", resolved.lines),
            ]);
          }
          return;
        case "clear":
          appendLocal([makeLine("prompt", "> clear")]);
          setLocalLines([]);
          return;
        case "exit":
          onExit();
          return;
        case "chat": {
          if (busy) return; // ignore submits while a reply is streaming
          if (atSessionLimit) {
            appendLocal([
              makeLine("prompt", `> ${resolved.text}`),
              makeLine("system", SESSION_LIMIT_LINE),
            ]);
            return;
          }
          setUserTurns((n) => n + 1);
          // Echo the user line into the scrollback NOW, so anything that
          // follows (streamed reply, themed error, a later command) renders
          // after it in true session order.
          appendLocal([makeLine("prompt", `> ${resolved.text}`)]);
          sendMessage({ text: resolved.text });
          return;
        }
      }
    },
    [appendLocal, atSessionLimit, busy, onExit, sendMessage],
  );

  // The scrollback IS localLines, in append order (boot, echoes, command
  // output, errors, finished replies). While a reply is in flight, the
  // partial assistant text renders as a transient tail row; `onFinish` folds
  // the final text into the log the moment the tail stops rendering.
  const lines = useMemo<readonly TerminalLine[]>(() => {
    if (!busy) return localLines;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return localLines;
    const tail = messageText(last);
    if (tail.length === 0) return localLines;
    return [
      ...localLines,
      { id: "streaming-tail", tone: "reply", text: tail },
    ];
  }, [busy, localLines, messages]);

  return { lines, busy, submit, atSessionLimit };
}
