"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { cars, type Car } from "../../../content/cars";
import { liveries } from "../../../content/liveries";
import { LiveryStripe } from "../livery/LiveryStripe";
import { SceneErrorBoundary } from "../cafe/SceneErrorBoundary";
import { GarageSceneFallback } from "./GarageSceneFallback";
import { preloadCarModel } from "./preloadCarModel";
import { SpecSheet } from "./SpecSheet";

const GarageScene = dynamic(
  () => import("./GarageScene").then((m) => m.GarageScene),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-64 items-center justify-center">
        <p className="ts-hard font-display text-sm font-bold tracking-widest text-silver uppercase">
          Rolling out…
        </p>
      </div>
    ),
  },
);

function CarListButton({
  car,
  isActive,
  onSelect,
}: {
  car: Car;
  isActive: boolean;
  onSelect: (car: Car) => void;
}) {
  const locked = car.status === "locked";
  const warm = () => {
    if (car.status === "hero" && car.modelPath) preloadCarModel(car.modelPath);
  };
  return (
    <button
      type="button"
      onClick={() => onSelect(car)}
      onMouseEnter={warm}
      onFocus={warm}
      aria-current={isActive ? "true" : undefined}
      className={`${
        isActive ? "plate-hot" : "plate"
      } flex w-full items-center gap-3 px-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-chrome ${
        locked && !isActive ? "opacity-60" : ""
      }`}
    >
      <span
        aria-hidden="true"
        className="block h-8 w-1.5"
        style={{
          background: locked
            ? "var(--color-steel)"
            : liveries[car.livery].key,
        }}
      />
      <span className="flex min-w-0 flex-1 flex-col">
        <span
          className={`truncate font-display text-base leading-tight font-bold tracking-wide uppercase ${
            isActive
              ? "text-asphalt"
              : `ts-hard ${locked ? "text-silver" : "text-chrome"}`
          }`}
        >
          {car.name}
        </span>
        <span
          className={`truncate text-xs ${isActive ? "text-asphalt/80" : "text-silver"}`}
        >
          {locked ? "Locked" : car.carClass}
        </span>
      </span>
      {car.status === "hero" ? (
        <span
          className={`font-display text-xs font-black tracking-widest uppercase ${
            isActive ? "text-asphalt/80" : "text-gt-bright"
          }`}
        >
          3D
        </span>
      ) : null}
    </button>
  );
}

export function CarBrowser() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL is the single source of truth — back/forward stays in sync
  const carId = searchParams.get("car");
  const selected = cars.find((c) => c.id === carId) ?? cars[0];

  const select = (car: Car) => {
    if (car.id !== selected.id) {
      router.replace(`/garage?car=${car.id}`, { scroll: false });
    }
  };

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)_340px]">
      {/* Car list */}
      <nav aria-label="Cars" className="flex flex-col gap-2">
        {cars.map((c) => (
          <CarListButton
            key={c.id}
            car={c}
            isActive={c.id === selected.id}
            onSelect={select}
          />
        ))}
      </nav>

      {/* Scene */}
      <section
        aria-label={`${selected.name} in the garage`}
        className="relative min-h-72 overflow-hidden border border-steel bg-[#0d0d0f] shadow-[2px_3px_0_rgba(0,0,0,0.7)] lg:min-h-96"
      >
        {selected.status === "hero" ? (
          <>
            {/* stable Canvas: scene reacts to car prop, no WebGL teardown */}
            <div aria-hidden="true" className="h-full">
              <SceneErrorBoundary
                fallback={<GarageSceneFallback car={selected} />}
              >
                <GarageScene car={selected} />
              </SceneErrorBoundary>
            </div>
            {!selected.modelPath ? (
              <p className="ts-hard pointer-events-none absolute right-3 bottom-2 font-display text-xs font-semibold tracking-widest text-silver uppercase">
                Placeholder chassis — real model in the paint shop
              </p>
            ) : null}
            {selected.modelCredit ? (
              <p className="absolute bottom-2 left-3 text-xs text-silver/80">
                Model:{" "}
                <a
                  href={selected.modelCredit.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-silver/40 underline-offset-2 hover:text-chrome"
                >
                  {selected.modelCredit.title}
                </a>{" "}
                by {selected.modelCredit.author} (
                {selected.modelCredit.licenseUrl ? (
                  <a
                    href={selected.modelCredit.licenseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-silver/40 underline-offset-2 hover:text-chrome"
                  >
                    {selected.modelCredit.license}
                  </a>
                ) : (
                  selected.modelCredit.license
                )}
                ) via {selected.modelCredit.source}
              </p>
            ) : null}
          </>
        ) : (
          <div className="flex h-full min-h-72 flex-col items-center justify-center gap-3 px-6">
            <span
              aria-hidden="true"
              className="block h-16 w-40 opacity-25"
              style={{
                background: liveries[selected.livery].key,
                clipPath:
                  "polygon(6% 78%, 10% 52%, 26% 44%, 36% 26%, 66% 24%, 78% 44%, 94% 52%, 96% 78%, 84% 78%, 80% 88%, 68% 88%, 64% 78%, 34% 78%, 30% 88%, 18% 88%, 14% 78%)",
              }}
            />
            <div className="mt-1 w-40">
              <LiveryStripe livery={selected.livery} muted />
            </div>
            <p className="ts-hard text-center font-display text-sm font-bold tracking-widest text-silver uppercase">
              {selected.status === "locked"
                ? "Coming soon"
                : "3D model in production"}
            </p>
          </div>
        )}
      </section>

      {/* Spec sheet */}
      <aside aria-label={`${selected.name} spec sheet`}>
        <SpecSheet car={selected} />
      </aside>
    </div>
  );
}
