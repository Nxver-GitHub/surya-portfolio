import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDebouncedToast } from "@/components/toast/toastDebounce";

describe("createDebouncedToast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows once on the first notify() and hides after delayMs", () => {
    const onShow = vi.fn();
    const onHide = vi.fn();
    const toast = createDebouncedToast({ delayMs: 1500, onShow, onHide });

    toast.notify();
    expect(onShow).toHaveBeenCalledTimes(1);
    expect(onHide).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1499);
    expect(onHide).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onHide).toHaveBeenCalledTimes(1);
  });

  it("debounces rapid notify() calls: shows once, refreshes the same timer", () => {
    const onShow = vi.fn();
    const onHide = vi.fn();
    const toast = createDebouncedToast({ delayMs: 1500, onShow, onHide });

    toast.notify(); // Sound toggled
    vi.advanceTimersByTime(500);
    toast.notify(); // CRT FX toggled shortly after — should refresh, not restack
    vi.advanceTimersByTime(500);
    toast.notify();

    // Only ever shown once for the whole burst.
    expect(onShow).toHaveBeenCalledTimes(1);
    expect(onHide).not.toHaveBeenCalled();

    // Full delay from the LAST notify(), not the first.
    vi.advanceTimersByTime(1499);
    expect(onHide).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onHide).toHaveBeenCalledTimes(1);
  });

  it("a notify() after the toast has hidden shows it again", () => {
    const onShow = vi.fn();
    const onHide = vi.fn();
    const toast = createDebouncedToast({ delayMs: 1500, onShow, onHide });

    toast.notify();
    vi.advanceTimersByTime(1500);
    expect(onHide).toHaveBeenCalledTimes(1);

    toast.notify();
    expect(onShow).toHaveBeenCalledTimes(2);
  });

  it("cancel() clears a pending hide without calling onHide", () => {
    const onShow = vi.fn();
    const onHide = vi.fn();
    const toast = createDebouncedToast({ delayMs: 1500, onShow, onHide });

    toast.notify();
    toast.cancel();
    vi.advanceTimersByTime(5000);
    expect(onHide).not.toHaveBeenCalled();
  });

  it("cancel() before any notify() does not throw", () => {
    const toast = createDebouncedToast({
      delayMs: 1500,
      onShow: vi.fn(),
      onHide: vi.fn(),
    });
    expect(() => toast.cancel()).not.toThrow();
  });
});
