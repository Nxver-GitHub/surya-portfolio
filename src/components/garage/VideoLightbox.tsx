"use client";

import Image from "next/image";
import { useRef } from "react";

interface VideoLightboxProps {
  src: string;
  poster?: string;
  note?: string;
  title: string;
}

/**
 * Collapsed: poster thumbnail with a play plate.
 * Expanded: native <dialog> at near-full viewport width — Esc or
 * backdrop click closes; video pauses on close.
 */
export function VideoLightbox({ src, poster, note, title }: VideoLightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const open = () => {
    dialogRef.current?.showModal();
    videoRef.current?.play().catch(() => {
      /* autoplay refusal is fine — controls are visible */
    });
  };

  const close = () => {
    videoRef.current?.pause();
    dialogRef.current?.close();
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label={`Play ${title} demo video in large view`}
        className="group relative block w-full overflow-hidden border border-steel outline-none focus-visible:ring-2 focus-visible:ring-gt-bright"
      >
        {poster ? (
          <Image
            src={poster}
            alt=""
            width={1280}
            height={480}
            className="w-full opacity-80 transition-opacity duration-(--duration-snap) group-hover:opacity-100"
          />
        ) : (
          <span className="block h-24 w-full bg-asphalt" />
        )}
        <span className="plate-hot ts-hard absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 font-display text-sm font-black tracking-widest text-white uppercase">
          ▶ Play
        </span>
      </button>
      {note ? <p className="mt-1 text-xs text-silver">{note}</p> : null}

      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === dialogRef.current) close();
        }}
        onClose={() => videoRef.current?.pause()}
        aria-label={`${title} demo video`}
        className="m-auto w-[min(92vw,1100px)] border border-steel bg-panel p-0 shadow-[4px_6px_0_rgba(0,0,0,0.8)] backdrop:bg-black/80"
      >
        <div className="flex items-center justify-between px-4 py-2">
          <p className="ts-hard font-display text-sm font-bold tracking-widest text-chrome uppercase">
            {title} — onboard footage
          </p>
          <button
            type="button"
            onClick={close}
            className="lozenge ts-hard px-3 py-1 font-display text-xs font-bold tracking-widest text-white uppercase outline-none focus-visible:ring-2 focus-visible:ring-chrome"
          >
            Close ✕
          </button>
        </div>
        <video
          ref={videoRef}
          controls
          playsInline
          preload="metadata"
          src={src}
          poster={poster}
          className="block w-full"
        />
        {note ? (
          <p className="px-4 py-2 text-xs text-silver">{note}</p>
        ) : null}
      </dialog>
    </>
  );
}
