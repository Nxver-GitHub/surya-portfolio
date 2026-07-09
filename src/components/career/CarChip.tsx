import Link from "next/link";
import { carById } from "../../../content/cars";
import { LockedChip } from "./LockedChip";

/** Cross-reference chip to a Garage car — live now that the Garage is open. */
export function CarChip({ carId }: { carId: string }) {
  const car = carById.get(carId);
  if (!car || car.status === "locked") {
    return <LockedChip label={carId} unlocksWith="Garage" />;
  }
  return (
    <Link
      href={`/garage?car=${car.id}`}
      className="inline-flex items-center gap-1.5 border border-gt/60 px-2 py-0.5 font-display text-xs font-semibold tracking-wider text-gt-bright uppercase outline-none hover:border-gt-bright hover:text-chrome focus-visible:ring-2 focus-visible:ring-gt-bright"
    >
      <span aria-hidden="true">🏎</span>
      {car.name}
      <span className="text-silver/60">· Garage</span>
    </Link>
  );
}
