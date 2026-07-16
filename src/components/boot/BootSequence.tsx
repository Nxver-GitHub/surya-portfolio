"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IntroMonogram } from "./intro/IntroMonogram";
import { IntroMontage } from "./intro/IntroMontage";
import { IntroTitle } from "./intro/IntroTitle";

const SESSION_KEY = "sr-boot-seen";

type Phase = "logo" | "montage" | "title" | "exit" | "done";

const LOGO_MS = 850;
const EXIT_MS = 250;

/**
 * Signature first-load intro — a trademark-safe homage to the GT2 boot-to-menu:
 * studio monogram (Beat 1) → heritage hard-cut montage (Beat 2) → title +
 * PRESS START (Beat 3) → slide out to reveal the World Map. Timeless by design
 * (no projects/stats). Runs once per session; reduced motion skips it entirely.
 * The montage self-advances via onComplete; logo and exit are timed. The title
 * is a REAL gate (authentic GT2): it holds until the visitor clicks or presses
 * a key. Input during logo/montage jumps to the title screen, not past it —
 * exactly how pressing Start during the GT2 FMV behaved. Every beat centres
 * its content for a 9:16 story-safe frame.
 */
export function BootSequence() {
  const [phase, setPhase] = useState<Phase | null>(null);
  const [compact, setCompact] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finish = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    sessionStorage.setItem(SESSION_KEY, "1");
    setPhase("done");
  }, []);

  const startTitle = useCallback(() => setPhase("title"), []);

  useEffect(() => {
    // decide after paint: avoids SSR/hydration mismatch on sessionStorage
    const id = requestAnimationFrame(() => {
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const seen = sessionStorage.getItem(SESSION_KEY);
      setCompact(window.innerWidth < 768);
      setPhase(reducedMotion || seen ? "done" : "logo");
    });
    return () => cancelAnimationFrame(id);
  }, []);

  // Timed beats. The montage is self-driven (advances on onComplete) and the
  // title holds for input, so neither has a timer here.
  useEffect(() => {
    if (phase !== "logo" && phase !== "exit") return;
    const ms = phase === "logo" ? LOGO_MS : EXIT_MS;
    timer.current = setTimeout(() => {
      if (phase === "logo") setPhase("montage");
      else finish();
    }, ms);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [phase, finish]);

  // Any key or click advances: logo/montage jump to the title gate; the title
  // gate itself is the only way into the World Map.
  useEffect(() => {
    if (phase !== "logo" && phase !== "montage" && phase !== "title") return;
    const advance = () => {
      setPhase(phase === "title" ? "exit" : "title");
    };
    window.addEventListener("keydown", advance);
    window.addEventListener("pointerdown", advance);
    return () => {
      window.removeEventListener("keydown", advance);
      window.removeEventListener("pointerdown", advance);
    };
  }, [phase]);

  if (!phase || phase === "done") return null;

  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={`fixed inset-0 z-60 overflow-hidden bg-asphalt bg-grid-paper transition-transform duration-(--duration-panel) ease-(--ease-mech) ${
        phase === "exit" ? "-translate-y-full" : ""
      }`}
    >
      {phase === "logo" && <IntroMonogram />}
      {phase === "montage" && (
        <IntroMontage compact={compact} onComplete={startTitle} />
      )}
      {(phase === "title" || phase === "exit") && <IntroTitle />}
    </div>
  );
}
