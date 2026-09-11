"use client";

import { useEffect, useRef, useState } from "react";
import {
  createDebouncedToast,
  type DebouncedToastController,
} from "./toastDebounce";

/** ~1.5s visible, per the acceptance criteria. */
const TOAST_MS = 1500;

export interface MemoryCardToast {
  visible: boolean;
  /** Call from a preference's change handler — shows/refreshes the toast. */
  notify: () => void;
}

/**
 * Drives the "Saving to Memory Card" toast. One controller instance per
 * mount; rapid toggles within {@link TOAST_MS} of each other refresh the
 * same visible toast instead of stacking or re-announcing it (see
 * `createDebouncedToast`).
 */
export function useMemoryCardToast(): MemoryCardToast {
  const [visible, setVisible] = useState(false);
  const controllerRef = useRef<DebouncedToastController | null>(null);

  useEffect(() => {
    const controller = createDebouncedToast({
      delayMs: TOAST_MS,
      onShow: () => setVisible(true),
      onHide: () => setVisible(false),
    });
    controllerRef.current = controller;
    return () => controller.cancel();
  }, []);

  return {
    visible,
    notify: () => controllerRef.current?.notify(),
  };
}
