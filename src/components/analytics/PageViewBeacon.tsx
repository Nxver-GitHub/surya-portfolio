"use client";

/**
 * PageViewBeacon — anonymized page-view pings (E11 telemetry).
 *
 * Mounted once in the root layout. On every route change it POSTs the normalized
 * route to /api/beacon via navigator.sendBeacon (which survives navigation and
 * never blocks the UI). Only routes in the known list are sent; anything else is
 * skipped. No identifiers are attached — the server stores a bare per-route,
 * per-day counter. Renders nothing.
 *
 * sendBeacon can't set a JSON content-type, so we send a Blob typed
 * application/json; the route reads it with request.json() all the same.
 */

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { normalizePathname } from "@/lib/routes";

export function PageViewBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof navigator === "undefined" || !("sendBeacon" in navigator)) return;
    const route = normalizePathname(pathname);
    if (!route) return;
    try {
      const blob = new Blob([JSON.stringify({ route })], {
        type: "application/json",
      });
      navigator.sendBeacon("/api/beacon", blob);
    } catch {
      // A failed beacon must never affect browsing — swallow silently.
    }
  }, [pathname]);

  return null;
}
