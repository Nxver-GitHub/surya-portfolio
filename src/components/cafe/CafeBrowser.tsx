"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { menuBooks, type MenuBook } from "../../../content/menu-books";
import { BookList } from "./BookList";
import { BookPanel } from "./BookPanel";
import { CafeBackdrop } from "./CafeBackdrop";
import { SceneErrorBoundary } from "./SceneErrorBoundary";

// Code-split the WebGL café off the initial bundle. Client-only: ssr:false is
// required (and only allowed) inside a Client Component — this one.
const CafeScene = dynamic(
  () => import("./CafeScene").then((m) => m.CafeScene),
  {
    ssr: false,
    loading: () => <CafeBackdrop reason="loading" />,
  },
);

/**
 * The GT Café browser: a 3D café scene (enhancement) beside a semantic Menu
 * Book list and detail panel (the real, keyboard-driven UI). Selection lives
 * in the URL (`?book=`) so back/forward and marker clicks all stay in sync,
 * and the 3D scene degrades to a styled 2D backdrop when the glb is absent.
 */
export function CafeBrowser() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const bookId = searchParams.get("book");
  const selected =
    menuBooks.find((b) => b.id === bookId) ?? menuBooks[0];

  const select = (book: MenuBook) => {
    if (book.id !== selected.id) {
      router.replace(`/cafe?book=${book.id}`, { scroll: false });
    }
  };

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* Semantic spine: the tablist that drives selection */}
      <nav aria-label="Menu Books" className="lg:order-1">
        <BookList selectedId={selected.id} onSelect={select} />
      </nav>

      <div className="flex flex-col gap-6 lg:order-2">
        {/* 3D café — enhancement only; falls back to a 2D backdrop */}
        <div className="min-h-72 overflow-hidden border border-steel bg-[#0d0d0f] shadow-[2px_3px_0_rgba(0,0,0,0.7)] lg:min-h-96">
          <SceneErrorBoundary fallback={<CafeBackdrop reason="error" />}>
            <Suspense fallback={<CafeBackdrop reason="loading" />}>
              <CafeScene selectedId={selected.id} onSelect={select} />
            </Suspense>
          </SceneErrorBoundary>
        </div>

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
