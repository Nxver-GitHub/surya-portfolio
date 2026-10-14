"use client";

import { useEffect } from "react";
import { useFrame, useThree, type RootState } from "@react-three/fiber";

const TOUCH_ACTION = "pan-y";

/**
 * Lets a vertical swipe that starts on a 3D canvas scroll the page, while a
 * horizontal drag still reaches OrbitControls. On a phone the canvas is close
 * to half the screen, so `touch-action: none` there trapped the page.
 *
 * `touch-action: pan-y` hands vertical pans to the browser (which then sends
 * `pointercancel`, and OrbitControls drops the pointer) and keeps horizontal
 * moves as pointer events (which rotate). Mouse input is unaffected.
 *
 * OrbitControls.connect() writes `touch-action: none` inline on its element
 * (R3F's event-source wrapper), so a className cannot win. This re-asserts
 * the value every frame — one string compare — which also survives the
 * controls re-connecting. Render it inside the `<Canvas>`; order relative to the controls does not
 * matter, since the value is re-pinned every frame.
 *
 * `allowPinch`: `pan-y` excludes `pinch-zoom`, so a two-finger gesture would be
 * read as a page scroll. With this set, any touch event carrying two or more
 * fingers is cancelled before the browser can act on it, and the pinch goes to
 * OrbitControls' dolly instead. One-finger behaviour is unchanged.
 */
export function TouchPanY({ allowPinch = false }: { allowPinch?: boolean }) {
  const getState = useThree((s) => s.get);

  useFrame((state) => pinTouchAction(controlsElement(state)));

  useEffect(() => {
    const target = controlsElement(getState());
    pinTouchAction(target);
    if (!allowPinch) return;
    const holdMultiTouch = (event: TouchEvent) => {
      if (event.targetTouches.length >= 2 && event.cancelable) event.preventDefault();
    };
    target.addEventListener("touchstart", holdMultiTouch, { passive: false });
    target.addEventListener("touchmove", holdMultiTouch, { passive: false });
    return () => {
      target.removeEventListener("touchstart", holdMultiTouch);
      target.removeEventListener("touchmove", holdMultiTouch);
    };
  }, [getState, allowPinch]);

  return null;
}

/** The element drei's OrbitControls binds to: R3F's event source (the Canvas
 * wrapper), falling back to the canvas itself. */
function controlsElement(state: RootState): HTMLElement {
  return (state.events.connected as HTMLElement | undefined) ?? state.gl.domElement;
}

function pinTouchAction(element: HTMLElement) {
  if (element.style.touchAction !== TOUCH_ACTION) {
    element.style.touchAction = TOUCH_ACTION;
  }
}
