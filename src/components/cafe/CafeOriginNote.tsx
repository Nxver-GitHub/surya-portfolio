import Image from "next/image";
import { CAFE_ORIGIN_PHOTOS } from "./terminal/cafeOrigin";

/**
 * Small collapsible origin note under the GT Café intro: the pavilion was
 * inspired by the owner's visit to Motoring Coffee in San Francisco. Native
 * <details>/<summary> — no JS, keyboard-accessible, closed by default so the
 * page keeps its shape. Expanding reveals the two photos from the visit
 * (shared with the Scapes gallery and the terminal's café-origin cards).
 */
export function CafeOriginNote() {
  return (
    <details className="group mt-4 w-fit max-w-2xl">
      <summary className="plate ts-hard inline-flex cursor-pointer list-none items-center gap-2 px-3 py-1.5 font-display text-xs font-bold tracking-widest text-silver uppercase outline-none [&::-webkit-details-marker]:hidden hover:text-gt-bright focus-visible:ring-2 focus-visible:ring-gt-bright">
        <span aria-hidden="true" className="text-gt-bright">
          ☕
        </span>
        Inspired by Motoring Coffee, SF
        <span
          aria-hidden="true"
          className="text-gt-bright transition-transform duration-(--duration-snap) group-open:rotate-90"
        >
          ›
        </span>
      </summary>
      <div className="bg-grid-paper mt-2 border-2 border-gt bg-asphalt p-3 shadow-[3px_4px_0_rgba(0,0,0,0.8)]">
        <p className="max-w-[52ch] text-sm text-ink leading-snug">
          The GT Café is modeled on a real visit: Motoring Coffee in San
          Francisco, where a green Lancia Fulvia sits on a rug between the
          espresso bar and the window. One flat white later, this pavilion was
          inevitable.
        </p>
        <div className="mt-3 flex gap-3">
          {CAFE_ORIGIN_PHOTOS.map((photo) => (
            <Image
              key={photo.src}
              src={photo.src}
              alt={photo.alt}
              width={240}
              height={320}
              className="h-auto w-1/2 max-w-60 border border-gt/60 object-cover"
            />
          ))}
        </div>
      </div>
    </details>
  );
}
