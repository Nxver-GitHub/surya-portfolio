"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SESSION_KEY = "sr-boot-seen";

type Phase = "cut-orange" | "cut-black" | "title" | "exit" | "done";

const PHASE_MS: Record<Exclude<Phase, "done">, number> = {
  "cut-orange": 280,
  "cut-black": 220,
  title: 1300,
  exit: 250,
};

/**
 * First-load boot: hard cuts between solid fields, then the wordmark,
 * then a slide out — GT2 console-on energy, no sound, no bounce.
 * Runs once per session; any input skips it; reduced motion skips it.
 */
export function BootSequence() {
  const [phase, setPhase] = useState<Phase | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finish = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    sessionStorage.setItem(SESSION_KEY, "1");
    setPhase("done");
  }, []);

  useEffect(() => {
    // decide after paint: avoids SSR/hydration mismatch on sessionStorage
    const id = requestAnimationFrame(() => {
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const seen = sessionStorage.getItem(SESSION_KEY);
      setPhase(reducedMotion || seen ? "done" : "cut-orange");
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!phase || phase === "done") return;
    if (phase === "exit") {
      timer.current = setTimeout(finish, PHASE_MS.exit);
      return () => {
        if (timer.current) clearTimeout(timer.current);
      };
    }
    const order: Exclude<Phase, "done">[] = [
      "cut-orange",
      "cut-black",
      "title",
      "exit",
    ];
    const next = order[order.indexOf(phase) + 1];
    timer.current = setTimeout(() => setPhase(next), PHASE_MS[phase]);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [phase, finish]);

  // Any key or click skips
  useEffect(() => {
    if (!phase || phase === "done") return;
    const skip = () => finish();
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    return () => {
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
  }, [phase, finish]);

  if (!phase || phase === "done") return null;

  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={`fixed inset-0 z-60 transition-transform duration-(--duration-panel) ease-(--ease-mech) ${
        phase === "exit" ? "-translate-y-full" : ""
      } ${phase === "cut-orange" ? "bg-gt" : "bg-asphalt"}`}
    >
      {(phase === "title" || phase === "exit") && (
        <div className="flex h-full flex-col items-center justify-center px-6">
          <p className="ts-hard font-display text-sm font-bold tracking-[0.4em] text-gt-bright uppercase">
            Portfolio system
          </p>
          <h1 className="gt-title mt-2 text-center text-5xl text-chrome md:text-7xl">
            Surya Racing
          </h1>
          <div className="gt-rule mt-3 w-48 md:w-72" />
          <p className="mt-6 font-display text-xs font-semibold tracking-[0.3em] text-silver uppercase">
            Press any key
          </p>
        </div>
      )}
    </div>
  );
}
