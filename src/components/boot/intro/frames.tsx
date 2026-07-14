import { liveries, type LiveryId } from "../../../../content/liveries";
import type { CarSilhouetteId, Frame } from "./sequence";

/**
 * Beat 2 montage renderer — one view per frame kind. The reel itself (which
 * frames, in what order) lives in sequence.ts; this file only draws. Every hero
 * centres inside a 9:16 story-safe band while colour backgrounds bleed full.
 *
 * Car silhouettes are the garage's real hero cars: their glb side profiles were
 * rendered to transparent PNGs (public/intro/cars/<id>.png) and are used here as
 * CSS masks so they tint to any tone. Cars are normalised to face right.
 */

const HERO = "absolute inset-0 flex items-center justify-center bg-asphalt";

/** Cars whose rendered profile faces left — flipped so all face right. */
const FACE_LEFT = new Set<CarSilhouetteId>(["nodegent"]);
const TONE_COLOR = {
  chrome: "var(--color-chrome)",
  orange: "var(--color-gt-bright)",
} as const;

function LiverySlam({ livery }: { livery: LiveryId }) {
  const { bars } = liveries[livery];
  return (
    <div className="absolute inset-0 overflow-hidden bg-asphalt">
      <div className="flex h-full w-[132%] -translate-x-[12%] -skew-x-12">
        {bars.map((c, i) => (
          <div key={i} className="h-full flex-1" style={{ background: c }} />
        ))}
      </div>
    </div>
  );
}

function StartLights({ lit }: { lit: boolean }) {
  const color = lit ? "#12b657" : "#c81f1f";
  const glow = lit ? "rgba(18,182,87,0.75)" : "rgba(200,31,31,0.7)";
  return (
    <div className={HERO}>
      <div className="flex gap-3 md:gap-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-sm bg-black/70 p-2 ring-1 ring-steel"
          >
            {[0, 1].map((r) => (
              <span
                key={r}
                className="block h-6 w-6 rounded-full md:h-9 md:w-9"
                style={{ background: color, boxShadow: `0 0 18px ${glow}` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Silhouette({
  car,
  tone,
}: {
  car: CarSilhouetteId;
  tone: "chrome" | "orange";
}) {
  const url = `/intro/cars/${car}.png`;
  const flip = FACE_LEFT.has(car);
  return (
    <div className={HERO}>
      <div
        className="w-[clamp(300px,84vw,1040px)]"
        style={{
          aspectRatio: "1600 / 666",
          transform: flip ? "scaleX(-1)" : undefined,
          background: TONE_COLOR[tone],
          WebkitMaskImage: `url(${url})`,
          maskImage: `url(${url})`,
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
          WebkitMaskSize: "contain",
          maskSize: "contain",
        }}
      />
    </div>
  );
}

function SpeedBlur() {
  return (
    <div className="absolute inset-0 bg-asphalt">
      <div className="intro-speedlines absolute inset-0 opacity-80" />
    </div>
  );
}

function Tach({ redline }: { redline?: boolean }) {
  const angle = redline ? 74 : -40;
  return (
    <div className={HERO}>
      <svg viewBox="0 0 200 148" className="w-[min(72vw,52vh)]" aria-hidden="true">
        {/* dial */}
        <path
          d="M20 116 A80 80 0 0 1 180 116"
          fill="none"
          stroke="#34363a"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* redline zone (upper right) */}
        <path
          d="M161 65 A80 80 0 0 1 180 116"
          fill="none"
          stroke="#c81f1f"
          strokeWidth="7"
          strokeLinecap="round"
        />
        {/* ticks */}
        {Array.from({ length: 9 }).map((_, i) => (
          <line
            key={i}
            transform={`rotate(${-72 + i * 18} 100 116)`}
            x1="100"
            y1="40"
            x2="100"
            y2="50"
            stroke="#a4a7ad"
            strokeWidth="2"
          />
        ))}
        {/* needle */}
        <g
          transform={`rotate(${angle} 100 116)`}
          className={redline ? "intro-flash" : undefined}
        >
          <line
            x1="100"
            y1="116"
            x2="100"
            y2="48"
            stroke="#ffb000"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx="100" cy="116" r="8" fill="#ffb000" />
        </g>
      </svg>
    </div>
  );
}

function Rim() {
  return (
    <div className={HERO}>
      <svg
        viewBox="0 0 120 120"
        className="intro-spin w-[min(52vw,44vh)]"
        style={{ transformOrigin: "50% 50%" }}
        aria-hidden="true"
      >
        <circle cx="60" cy="60" r="56" fill="#0d0d0e" stroke="#1b1c1f" strokeWidth="6" />
        <circle cx="60" cy="60" r="40" fill="none" stroke="#c6c9ce" strokeWidth="4" />
        {Array.from({ length: 5 }).map((_, i) => (
          <line
            key={i}
            transform={`rotate(${i * 72} 60 60)`}
            x1="60"
            y1="60"
            x2="60"
            y2="24"
            stroke="#9fa3aa"
            strokeWidth="5"
            strokeLinecap="round"
          />
        ))}
        <circle cx="60" cy="60" r="8" fill="#ffb000" />
      </svg>
    </div>
  );
}

function Numerals() {
  return (
    <div className={HERO}>
      <span className="intro-flash ts-hard font-display text-[clamp(44px,13vw,150px)] font-black tracking-tight text-gt-bright tabular-nums">
        00:00.<span className="text-chrome">000</span>
      </span>
    </div>
  );
}

function WordSlam({ text }: { text: string }) {
  return (
    <div className={`${HERO} overflow-hidden`}>
      <span className="ts-hard font-display text-[clamp(64px,20vw,240px)] leading-none font-black tracking-[-0.03em] text-chrome uppercase -skew-x-6">
        {text}
      </span>
    </div>
  );
}

function Grid() {
  return (
    <div
      className="intro-scanlines absolute inset-0 bg-asphalt"
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,176,0,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(255,176,0,0.16) 1px, transparent 1px)",
        backgroundSize: "26px 26px",
      }}
    />
  );
}

export function FrameView({ frame }: { frame: Frame }) {
  switch (frame.kind) {
    case "grid":
      return <Grid />;
    case "livery":
      return <LiverySlam livery={frame.livery} />;
    case "lights":
      return <StartLights lit={frame.lit} />;
    case "silhouette":
      return <Silhouette car={frame.car} tone={frame.tone} />;
    case "blur":
      return <SpeedBlur />;
    case "tach":
      return <Tach redline={frame.redline} />;
    case "rim":
      return <Rim />;
    case "numerals":
      return <Numerals />;
    case "word":
      return <WordSlam text={frame.text} />;
  }
}
