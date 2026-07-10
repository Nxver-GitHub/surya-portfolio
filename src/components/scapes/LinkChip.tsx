import Link from "next/link";
import type { CrossLink } from "./crossLinks";

/**
 * Small cross-pavilion link chip — same stamped-plate vocabulary the Garage
 * and Missions pavilions use for their cross-links.
 */
export function LinkChip({ link }: { link: CrossLink }) {
  return (
    <Link
      href={link.href}
      className="plate ts-hard inline-flex max-w-full items-center gap-1 px-2.5 py-1 font-display text-[11px] font-bold tracking-widest text-gt-bright uppercase outline-none hover:text-chrome focus-visible:ring-2 focus-visible:ring-gt-bright"
    >
      <span aria-hidden="true">→</span>
      <span className="truncate">{link.label}</span>
    </Link>
  );
}
