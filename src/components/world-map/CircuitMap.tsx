"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { useSound } from "@/components/sound/SoundProvider";
import { pavilions } from "../../../content/pavilions";

export function CircuitMap() {
  const [selectedId, setSelectedId] = useState("cafe");
  const [lockedNotice, setLockedNotice] = useState(false);
  const controls = useRef<(HTMLAnchorElement | HTMLButtonElement | null)[]>([]);
  const { tick } = useSound();
  const selected = pavilions.find((p) => p.id === selectedId) ?? pavilions[0];

  // Focus and mouseEnter both land here, so the tick belongs to the SELECTION
  // CHANGE, not to the pointer: re-entering the destination you are already on
  // — or clicking it, which fires focus after mouseEnter — stays silent.
  function select(id: string) {
    if (id !== selectedId) tick();
    setSelectedId(id);
    setLockedNotice(false);
  }

  function move(event: KeyboardEvent, index: number) {
    const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1
      : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!direction && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? pavilions.length - 1
      : (index + direction + pavilions.length) % pavilions.length;
    select(pavilions[next].id);
    controls.current[next]?.focus();
  }

  return (
    <section className="world-map" aria-label="World map destinations">
      <div className="world-map-landscape">
        <Image
          src="/images/world-map-console.png"
          alt="A low-polygon coastal racing circuit linking the portfolio pavilions, with a dirt spur leading to the GTM engineering Special Stage."
          fill priority sizes="(min-width: 1500px) 1440px, 100vw"
          className="world-map-art" unoptimized
        />
        <nav aria-label="Circuit destinations" className="world-map-nodes">
          {pavilions.map((p, index) => {
            const { x, y } = p.map;
            const active = p.id === selected.id;
            const className = `map-node ${active ? "map-node-selected" : ""} ${p.status === "locked" ? "map-node-locked" : ""}`;
            const style = { "--node-x": `${x}%`, "--node-y": `${y}%` } as CSSProperties;
            const label = <><span className="map-node-name">{p.name}</span><span className="map-node-glyph" aria-hidden="true">{p.glyph}</span>{p.status === "locked" && <span className="map-node-status">Locked</span>}<span className="map-cursor" aria-hidden="true" /></>;
            const common = {
              // Hover/focus already ticks via select(); the click is the
              // outcome — crossing into the destination, or being refused.
              className, style, "data-sfx": p.status === "open" ? "enter" : "locked",
              onFocus: () => select(p.id), onMouseEnter: () => select(p.id),
              onKeyDown: (event: KeyboardEvent) => move(event, index),
              "aria-label": `${p.name}: ${p.caption}${p.status === "locked" ? " — locked" : ""}`,
            };
            return p.status === "open" ? (
              <Link key={p.id} href={`/${p.slug}`} transitionTypes={["nav-forward"]}
                ref={(el) => { controls.current[index] = el; }} {...common}>{label}</Link>
            ) : (
              <button key={p.id} type="button" aria-disabled="true"
                ref={(el) => { controls.current[index] = el; }} {...common}
                onClick={() => { setSelectedId(p.id); setLockedNotice(true); }}>{label}</button>
            );
          })}
        </nav>
      </div>

      <div className="map-information">
        <div aria-live="polite" aria-atomic="true">
          <h2>{selected.name}</h2>
          <p>{lockedNotice ? "This pavilion is not open yet. Choose another destination." : selected.caption}</p>
        </div>
        {selected.status === "open" ? (
          <Link className="map-enter" href={`/${selected.slug}`} data-sfx="enter"
            transitionTypes={["nav-forward"]} aria-label={`Enter ${selected.name}`}>Enter <span aria-hidden="true">▸</span></Link>
        ) : <span className="map-unavailable">Locked</span>}
      </div>

      <nav className="map-mobile-directory" aria-label="All destinations">
        {pavilions.map((p) => p.status === "open" ? (
          <Link key={p.id} href={`/${p.slug}`} data-sfx="enter" transitionTypes={["nav-forward"]}>
            <span>{p.glyph}</span>{p.name}<span aria-hidden="true">▸</span>
          </Link>
        ) : <span key={p.id} className="directory-locked"><span>{p.glyph}</span>{p.name}<small>Locked</small></span>)}
      </nav>
      <div className="map-control-strip"><span>Arrows: select <span className="map-desktop-hint"> · Enter: open</span></span><span>World Map</span></div>
    </section>
  );
}
