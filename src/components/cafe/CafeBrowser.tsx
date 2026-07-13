"use client";

import dynamic from "next/dynamic";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { menuBooks, type MenuBook } from "../../../content/menu-books";
import { exhibits, type Exhibit } from "../../../content/cafe-exhibits";
import { BookList } from "./BookList";
import { BookPanel } from "./BookPanel";
import { CafeBackdrop } from "./CafeBackdrop";
import { ExhibitList } from "./ExhibitList";
import { ExhibitPlate } from "./ExhibitPlate";
import { SceneErrorBoundary } from "./SceneErrorBoundary";
import { Terminal } from "./terminal/Terminal";
import { useTerminalChat } from "./terminal/useTerminalChat";
import { useReducedMotion } from "../garage/useReducedMotion";
import type { CafeFocus } from "./CafeScene";

/** Tailwind's `sm` breakpoint — below it the in-screen terminal drops its
 * embedded input for the thumb-reachable bottom bar (soft-keyboard-safe). */
const MOBILE_QUERY = "(max-width: 639px)";

function subscribeMobileQuery(onChange: () => void): () => void {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/** Is the viewport below the `sm` breakpoint? The media query is an external
 * store (SSR snapshot: false), so it tracks live resizes without effects. */
function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribeMobileQuery,
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false,
  );
}

// Code-split the WebGL café off the initial bundle. Client-only: ssr:false is
// required (and only allowed) inside a Client Component — this one.
const CafeScene = dynamic(
  () => import("./CafeScene").then((m) => m.CafeScene),
  {
    ssr: false,
    loading: () => <CafeBackdrop reason="loading" />,
  },
);

/** In-page lozenge button (the GT2 back-button shape) for scene actions that
 * are not navigation — e.g. returning to the room overview. */
function LozengeButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="lozenge ts-hard inline-flex items-center gap-2 px-4 py-1.5 font-display text-sm font-bold tracking-widest text-white uppercase outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-chrome disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/** The active book's audience label + title, mirrored in the 2D UI so keyboard
 * users get the same info the 3D hover overlay shows pointer users. */
function FocusLabel({ book }: { book: MenuBook }) {
  return (
    <div
      className="plate ts-hard inline-flex flex-col gap-0.5 px-3 py-1.5"
      style={{ borderColor: book.cover.color }}
    >
      <span
        className="font-display text-[10px] font-black tracking-[0.18em] uppercase"
        style={{ color: book.cover.color }}
      >
        {book.cover.label}
      </span>
      <span className="font-display text-xs font-bold tracking-wide text-chrome uppercase">
        {book.title}
      </span>
    </div>
  );
}

/**
 * The GT Café browser: a 3D café scene (enhancement) beside a semantic Menu
 * Book list and detail panel (the real, keyboard-driven UI). Book selection
 * lives in the URL (`?book=`) so back/forward and marker clicks stay in sync;
 * a local `focus` drives the scripted camera flights (a book's table, the CRT
 * desk, or the room overview). The scene degrades to a styled 2D backdrop when
 * the glb is absent, and every scene-dependent control is gated on that.
 */
export function CafeBrowser() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const bookId = searchParams.get("book");
  const selected = menuBooks.find((b) => b.id === bookId) ?? menuBooks[0];

  // Camera focus (scene-only). Starts at room view; book selection flies to the
  // table, the CRT flies to the desk. The 2D UI stays authoritative for content.
  const [focus, setFocus] = useState<CafeFocus>({ kind: "room" });
  // Whether the loaded glb actually contains the CRT node — gates the CRT UI.
  const [crtPresent, setCrtPresent] = useState(false);
  // Whether the 3D scene mounted at all (false → 2D fallback is showing).
  const [sceneReady, setSceneReady] = useState(false);
  // Ids of exhibits whose glb loaded successfully — the UI lists only these.
  const [liveExhibitIds, setLiveExhibitIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  // The terminal is "open" whenever the CRT is the focus. It works with the 3D
  // scene present (real CRT) or, via the fallback lozenge below, without it.
  const terminalOpen = focus.kind === "crt";

  const select = useCallback(
    (book: MenuBook) => {
      if (book.id !== selected.id) {
        router.replace(`/cafe?book=${book.id}`, { scroll: false });
      }
      setFocus({ kind: "book", bookId: book.id });
    },
    [router, selected.id],
  );

  // Mobile full-screen takeover: after the tap, the dock flight plays as a
  // short cinematic, then the terminal hard-cuts to a fixed full-screen
  // window (the café page sits untouched behind it). Reset on every open so
  // the zoom beat replays.
  const [mobileTakeover, setMobileTakeover] = useState(false);

  const selectCrt = useCallback(() => {
    setMobileTakeover(false);
    setFocus({ kind: "crt" });
  }, []);
  const roomView = useCallback(() => setFocus({ kind: "room" }), []);

  // Whether the CRT's screen mesh was found (gates the in-monitor terminal).
  const [screenSurface, setScreenSurface] = useState(false);
  // Visitor popped the terminal out of the 3D screen into the flat overlay.
  const [expanded, setExpanded] = useState(false);
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();

  // Close the terminal: back to room view. The session persists in the module
  // store, so reopening restores the conversation — and each open starts back
  // in the immersive in-screen mode.
  const closeTerminal = useCallback(() => {
    setFocus({ kind: "room" });
    setExpanded(false);
    setMobileTakeover(false);
  }, []);

  // The terminal's session controller — called ONCE here and passed down to
  // every surface (in-screen panel, overlay, mobile input bar). `open` gates
  // the cold boot to the first open (not page load).
  const chat = useTerminalChat({ open: terminalOpen, onExit: closeTerminal });

  // The immersive path: terminal rendered ON the 3D CRT screen. Desktop only —
  // on phones the camera still docks for the cinematic (the texture mirror
  // keeps the tube alive) but reading/typing happens in the flat panel, which
  // a ~390px-wide perspective plane can't do readably. Also falls back to the
  // overlay when there's no scene/screen mesh, under reduced motion, or when
  // the visitor explicitly expanded out.
  const inScreen =
    terminalOpen &&
    !isMobile &&
    sceneReady &&
    crtPresent &&
    screenSurface &&
    !expanded &&
    !reducedMotion;

  // Phone takeover timing: give the dock flight ~0.95s to read as a zoom
  // into the monitor, then present the full-screen window (instant under
  // reduced motion — the flight is an instant cut there too).
  useEffect(() => {
    if (!terminalOpen || !isMobile) return;
    const t = setTimeout(
      () => setMobileTakeover(true),
      reducedMotion ? 0 : 950,
    );
    return () => clearTimeout(t);
  }, [terminalOpen, isMobile, reducedMotion]);

  const takeoverVisible = terminalOpen && isMobile && mobileTakeover;

  // While the full-screen window is up, the page behind must not scroll (this
  // is also what keeps the soft keyboard from shoving the log out of view —
  // the window is fixed, only the scrollback scrolls).
  useEffect(() => {
    if (!takeoverVisible) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [takeoverVisible]);

  const selectExhibit = useCallback((exhibit: Exhibit) => {
    setFocus({ kind: "exhibit", exhibitId: exhibit.id });
  }, []);

  const onCrtFound = useCallback((present: boolean) => {
    setSceneReady(true);
    setCrtPresent(present);
  }, []);

  // Fold each exhibit's load result into the live set (immutable update).
  const onExhibitAvailability = useCallback(
    (exhibit: Exhibit, available: boolean) => {
      setLiveExhibitIds((prev) => {
        const has = prev.has(exhibit.id);
        if (available === has) return prev;
        const next = new Set(prev);
        if (available) next.add(exhibit.id);
        else next.delete(exhibit.id);
        return next;
      });
    },
    [],
  );

  // The live exhibits, in roster order, and the focused one (for the plate).
  const liveExhibits = useMemo(
    () => exhibits.filter((e) => liveExhibitIds.has(e.id)),
    [liveExhibitIds],
  );
  const focusedExhibit =
    focus.kind === "exhibit"
      ? liveExhibits.find((e) => e.id === focus.exhibitId) ?? null
      : null;

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* Semantic spine: the tablist that drives selection */}
      <nav aria-label="Menu Books" className="lg:order-1">
        <BookList selectedId={selected.id} onSelect={select} />
      </nav>

      <div className="flex flex-col gap-6 lg:order-2">
        {/* 3D café — enhancement only; falls back to a 2D backdrop. Sized to
            read like a ROOM, not a letterbox: portrait-ish on mobile so the
            floor-to-ceiling of the room is visible, ~3:2 with real height on
            desktop. Height is viewport-relative and capped so it never
            dominates the page. */}
        <div className="aspect-[4/5] max-h-[620px] min-h-[420px] overflow-hidden border border-steel bg-[#0d0d0f] shadow-[2px_3px_0_rgba(0,0,0,0.7)] sm:aspect-[16/10] sm:max-h-none sm:min-h-[480px] lg:aspect-[3/2] lg:min-h-[520px]">
          <SceneErrorBoundary fallback={<CafeBackdrop reason="error" />}>
            <Suspense fallback={<CafeBackdrop reason="loading" />}>
              <CafeScene
                selectedId={selected.id}
                focus={focus}
                onSelect={select}
                onSelectCrt={selectCrt}
                onCrtFound={onCrtFound}
                onSelectExhibit={selectExhibit}
                onExhibitAvailability={onExhibitAvailability}
                terminalActive={crtPresent && chat.lines.length > 0}
                terminalLines={chat.lines}
                onScreenSurface={setScreenSurface}
                screenContent={
                  inScreen ? (
                    <Terminal
                      chat={chat}
                      variant={isMobile ? "log-only" : "screen"}
                      onClose={closeTerminal}
                      onToggleExpand={() => setExpanded(true)}
                    />
                  ) : null
                }
              />
            </Suspense>
          </SceneErrorBoundary>
        </div>


        {/* Scene controls — gated on the 3D scene actually being present, so
            nothing dangles when the glb failed to load (2D fallback path). */}
        {sceneReady ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <LozengeButton
                onClick={roomView}
                disabled={focus.kind === "room"}
              >
                <span aria-hidden="true">⤢</span> Room view
              </LozengeButton>
              {/* Keyboard path to the house terminal — the 3D CRT is a
                  pointer-only target, so mirror it here like the exhibits'
                  "On display" buttons. Hidden while the terminal is open
                  (the status chip below takes its place). */}
              {crtPresent && focus.kind !== "crt" ? (
                <LozengeButton onClick={selectCrt}>
                  <span aria-hidden="true">▸</span> Terminal
                </LozengeButton>
              ) : null}
              {/* Book chip only while a book is the focus — during an exhibit
                  or CRT visit the dedicated plate below carries the context. */}
              {focus.kind === "book" || focus.kind === "room" ? (
                <FocusLabel book={selected} />
              ) : null}
              {focus.kind === "crt" && crtPresent ? (
                <span className="plate-hot ts-hard inline-flex flex-col gap-0.5 px-3 py-1.5">
                  <span className="font-display text-[10px] font-black tracking-[0.18em] text-white/80 uppercase">
                    Terminal
                  </span>
                  <span className="font-display text-xs font-bold tracking-wide text-white uppercase">
                    Online — CAFE-OS v2.2
                  </span>
                </span>
              ) : null}
            </div>

            {/* "On display" — one button per live exhibit; renders nothing when
                the roster is empty. Same focus state as an in-scene click. */}
            <ExhibitList
              available={liveExhibits}
              activeId={focus.kind === "exhibit" ? focus.exhibitId : null}
              onSelect={selectExhibit}
            />

            {/* The focused exhibit's plate: name, flavour, and full CC credit. */}
            {focusedExhibit ? <ExhibitPlate exhibit={focusedExhibit} /> : null}
          </div>
        ) : null}

        {/* No-WebGL fallback: a plain lozenge to open the terminal, so the
            (pure-DOM) house terminal still works without the 3D scene. */}
        {!sceneReady && !terminalOpen ? (
          <div>
            <LozengeButton onClick={selectCrt}>
              <span aria-hidden="true">▸</span> Open terminal
            </LozengeButton>
          </div>
        ) : null}

        {/* The flat overlay terminal — the fallback (no WebGL, no screen mesh,
            reduced motion) and the "Expand" target from the in-screen view.
            Escape / `exit` closes back to room view; the toggle returns to the
            3D screen only when that path actually exists. */}
        {terminalOpen && !inScreen && !isMobile ? (
          <div className="h-[420px] sm:h-[460px]">
            <Terminal
              chat={chat}
              variant="overlay"
              onClose={closeTerminal}
              onToggleExpand={
                sceneReady && crtPresent && screenSurface && !reducedMotion
                  ? () => setExpanded(false)
                  : undefined
              }
            />
          </div>
        ) : null}

        {/* Phone: full-screen terminal window. The tap's dock flight plays as
            a zoom into the monitor, then this hard-cuts over everything —
            fixed at 100dvh so the soft keyboard resizes the window instead of
            scrolling the page, and Exit drops back to the café overview. */}
        {takeoverVisible ? (
          <div
            className="fixed inset-0 z-50 bg-[#020604] p-2"
            style={{ height: "100dvh" }}
          >
            <Terminal
              chat={chat}
              variant="overlay"
              onClose={closeTerminal}
              closeLabel="Exit ✕"
            />
          </div>
        ) : null}

        {/* Detail panel — the live counterpart to the selected tab */}
        <div
          id={`book-panel-${selected.id}`}
          role="tabpanel"
          aria-labelledby={`book-tab-${selected.id}`}
        >
          <BookPanel book={selected} />
        </div>
      </div>
    </div>
  );
}
