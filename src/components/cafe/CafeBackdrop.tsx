import { LiveryStripe } from "../livery/LiveryStripe";

/**
 * Styled 2D GT-café backdrop, shown whenever the 3D scene is unavailable —
 * while the glb loads (Suspense fallback) or if it fails to load (error
 * boundary). Pure CSS/gradient, no external assets, CSP-safe. The 3D canvas
 * is enhancement-only, so this is a complete visual for the scene zone; the
 * Menu Book list beside it stays fully functional either way.
 */
export function CafeBackdrop({ reason }: { reason: "loading" | "error" }) {
  return (
    <div
      aria-hidden="true"
      className="relative flex h-full min-h-72 flex-col items-center justify-center overflow-hidden lg:min-h-96"
      style={{
        background:
          "radial-gradient(120% 90% at 50% 8%, #23201a 0%, #141311 46%, #0a0a0b 100%)",
      }}
    >
      {/* warm café glow — a hanging-lamp pool of light */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-40"
        style={{
          background:
            "radial-gradient(60% 100% at 50% 0%, rgba(201,165,74,0.28) 0%, rgba(201,165,74,0.06) 55%, transparent 100%)",
        }}
      />
      {/* faint floorboard grid — the PS2-café floor, flattened to 2D */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 opacity-40"
        style={{
          background:
            "repeating-linear-gradient(90deg, transparent 0 46px, rgba(120,110,90,0.14) 46px 48px)",
          maskImage: "linear-gradient(to top, black, transparent)",
          WebkitMaskImage: "linear-gradient(to top, black, transparent)",
        }}
      />

      <div className="relative flex flex-col items-center gap-3 px-6 text-center">
        <div className="w-28">
          <LiveryStripe livery="warsteiner" />
        </div>
        <span className="ts-hard font-display text-lg font-black tracking-[0.2em] text-chrome uppercase">
          GT Café
        </span>
        <span className="ts-hard font-display text-xs font-semibold tracking-widest text-silver uppercase">
          {reason === "loading"
            ? "Brewing the scene…"
            : "Café view unavailable — the menu is still open"}
        </span>
      </div>
    </div>
  );
}
