"use client";

import { useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  licenses,
  licenseTierOrder,
  type LicenseTierId,
} from "../../../content/licenses";
import { LicenseTierButton } from "./LicenseTierButton";
import { LicenseDetail } from "./LicenseDetail";

function isTierId(value: string | null): value is LicenseTierId {
  return value !== null && licenseTierOrder.includes(value as LicenseTierId);
}

/**
 * License board: the B→A→IB→IA→S tier grid (an ARIA tablist) plus the detail
 * panel for the selected tier. Selection lives in the URL (`?tier=`) so
 * back/forward and deep links work, matching the Garage browser's pattern.
 * Arrow keys move between tiers with a roving tabindex; the detail panel is an
 * aria-live tabpanel so screen readers announce the change.
 */
export function LicenseBoard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const raw = searchParams.get("tier");
  const selectedId: LicenseTierId = isTierId(raw) ? raw : licenseTierOrder[0];
  const selected =
    licenses.find((l) => l.id === selectedId) ?? licenses[0];

  const select = useCallback(
    (id: LicenseTierId) => {
      if (id !== selectedId) {
        router.replace(`/license-center?tier=${id}`, { scroll: false });
      }
    },
    [router, selectedId],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const { key } = event;
      const current = licenseTierOrder.indexOf(selectedId);
      let nextIndex = current;

      if (key === "ArrowRight" || key === "ArrowDown") {
        nextIndex = (current + 1) % licenseTierOrder.length;
      } else if (key === "ArrowLeft" || key === "ArrowUp") {
        nextIndex =
          (current - 1 + licenseTierOrder.length) % licenseTierOrder.length;
      } else if (key === "Home") {
        nextIndex = 0;
      } else if (key === "End") {
        nextIndex = licenseTierOrder.length - 1;
      } else {
        return;
      }

      event.preventDefault();
      const nextId = licenseTierOrder[nextIndex];
      select(nextId);
      tabRefs.current[nextId]?.focus();
    },
    [selectedId, select],
  );

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
      <div
        role="tablist"
        aria-label="License tiers"
        onKeyDown={onKeyDown}
        className="grid grid-cols-2 gap-3 self-start sm:grid-cols-3 lg:grid-cols-2"
      >
        {licenses.map((license) => (
          <LicenseTierButton
            key={license.id}
            license={license}
            isActive={license.id === selectedId}
            onSelect={select}
            tabIndex={license.id === selectedId ? 0 : -1}
            buttonRef={(el) => {
              tabRefs.current[license.id] = el;
            }}
          />
        ))}
      </div>

      <div
        id="license-detail-panel"
        role="tabpanel"
        aria-live="polite"
        aria-labelledby={`license-tab-${selected.id}`}
        tabIndex={0}
        className="outline-none focus-visible:ring-2 focus-visible:ring-chrome"
      >
        <LicenseDetail license={selected} />
      </div>
    </div>
  );
}
