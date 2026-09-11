import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createIdleTimer } from "@/components/attract/idleTimer";

describe("createIdleTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fires onIdle after timeoutMs once reset() is called", () => {
    const onIdle = vi.fn();
    const timer = createIdleTimer({ timeoutMs: 1000, onIdle });

    timer.reset();
    vi.advanceTimersByTime(999);
    expect(onIdle).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it("does nothing until reset() is called", () => {
    const onIdle = vi.fn();
    createIdleTimer({ timeoutMs: 1000, onIdle });

    vi.advanceTimersByTime(5000);
    expect(onIdle).not.toHaveBeenCalled();
  });

  it("reset() replaces a pending timer instead of stacking a second one", () => {
    const onIdle = vi.fn();
    const timer = createIdleTimer({ timeoutMs: 1000, onIdle });

    timer.reset();
    vi.advanceTimersByTime(600);
    timer.reset(); // simulates activity — the countdown starts over
    vi.advanceTimersByTime(600);
    expect(onIdle).not.toHaveBeenCalled(); // only 600ms since the last reset

    vi.advanceTimersByTime(400);
    expect(onIdle).toHaveBeenCalledTimes(1); // fires exactly once, not twice
  });

  it("repeated reset() calls before the timeout never fire onIdle early", () => {
    const onIdle = vi.fn();
    const timer = createIdleTimer({ timeoutMs: 1000, onIdle });

    for (let i = 0; i < 10; i += 1) {
      timer.reset();
      vi.advanceTimersByTime(200);
    }
    expect(onIdle).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it("stop() clears a pending timer so onIdle never fires", () => {
    const onIdle = vi.fn();
    const timer = createIdleTimer({ timeoutMs: 1000, onIdle });

    timer.reset();
    timer.stop();
    vi.advanceTimersByTime(5000);
    expect(onIdle).not.toHaveBeenCalled();
  });

  it("stop() after stop() (double cleanup) does not throw", () => {
    const onIdle = vi.fn();
    const timer = createIdleTimer({ timeoutMs: 1000, onIdle });

    timer.reset();
    expect(() => {
      timer.stop();
      timer.stop();
    }).not.toThrow();
  });

  it("reducedMotion disables the timer entirely — the off-switch", () => {
    const onIdle = vi.fn();
    const timer = createIdleTimer({
      timeoutMs: 1000,
      onIdle,
      reducedMotion: true,
    });

    timer.reset();
    vi.advanceTimersByTime(100_000);
    expect(onIdle).not.toHaveBeenCalled();
  });

  it("reducedMotion still allows stop() to be called safely", () => {
    const onIdle = vi.fn();
    const timer = createIdleTimer({
      timeoutMs: 1000,
      onIdle,
      reducedMotion: true,
    });

    timer.reset();
    expect(() => timer.stop()).not.toThrow();
    vi.advanceTimersByTime(100_000);
    expect(onIdle).not.toHaveBeenCalled();
  });
});
