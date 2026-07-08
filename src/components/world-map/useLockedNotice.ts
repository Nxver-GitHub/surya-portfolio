"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const NOTICE_MS = 1400;

/**
 * Shared behavior for locked pavilions: a click triggers a short
 * mechanical shake and a transient "unlocks soon" notice.
 */
export function useLockedNotice() {
  const [noticedId, setNoticedId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = useCallback((id: string) => {
    setNoticedId(null);
    // restart the CSS animation even when the same node is clicked twice
    requestAnimationFrame(() => setNoticedId(id));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setNoticedId(null), NOTICE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return { noticedId, notify };
}
