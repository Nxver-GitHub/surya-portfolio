"use client";

import dynamic from "next/dynamic";
import { Suspense, useCallback, useMemo, useState } from "react";
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
import type { TerminalLine } from "./terminal/terminalLines";
import type { CafeFocus } from "./CafeScene";

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
  // Live terminal scrollback, mirrored up from the Terminal panel so the 3D CRT
  // screen can paint it. Empty unless the terminal is open.
  const [terminalLines, setTerminalLines] = useState<readonly TerminalLine[]>(
    () => [],
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

  const selectCrt = useCallback(() => setFocus({ kind: "crt" }), []);
  const roomView = useCallback(() => setFocus({ kind: "room" }), []);
  // Close the terminal: back to room view and drop the mirrored scrollback so
  // the 3D CRT feed clears (the panel itself unmounts and stops reporting).
  const closeTerminal = useCallback(() => {
    setTerminalLines([]);
    setFocus({ kind: "room" });
  }, []);

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
                terminalActive={terminalOpen && crtPresent}
                terminalLines={terminalLines}
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

        {/* The house terminal. Rendered whenever the CRT is the focus — beside
            the visible scene on desktop, full-width below on mobile, and as the
            sole surface in the no-WebGL fallback. Escape / `exit` closes it back
            to room view. It reports its scrollback up so the 3D CRT can mirror
            it (see CrtScreenFeed). */}
        {terminalOpen ? (
          <div className="h-[420px] sm:h-[460px]">
            <Terminal onClose={closeTerminal} onLinesChange={setTerminalLines} />
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
