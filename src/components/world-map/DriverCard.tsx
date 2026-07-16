import Image from "next/image";
import Link from "next/link";

/**
 * GT-style driver license card — the one era-native home for a real face.
 * Puts identity (photo, full name, plain-English role line) on the landing
 * screen for first-time visitors, and links through to Career (story mode).
 */
export function DriverCard() {
  return (
    <Link
      transitionTypes={["nav-forward"]}
      href="/career"
      data-sfx="confirm"
      className="plate group flex w-fit shrink-0 items-center gap-3.5 px-3.5 py-3 outline-none focus-visible:ring-2 focus-visible:ring-gt-bright"
    >
      <Image
        src="/terminal/portrait.jpg"
        alt="Portrait of Surya Pugazhenthi"
        width={64}
        height={64}
        className="h-16 w-16 rounded-[4px] border border-gt/60 object-cover"
      />
      <span className="flex flex-col">
        <span className="ts-hard font-display text-xs font-bold tracking-[0.3em] text-gt-bright uppercase">
          Profile
        </span>
        <span className="ts-hard mt-0.5 font-display text-sm font-black tracking-wider text-chrome uppercase transition-colors duration-(--duration-snap) group-hover:text-gt-bright group-focus-visible:text-gt-bright">
          Surya Pugazhenthi
        </span>
        <span className="ts-hard mt-1 font-display text-xs font-medium tracking-wide text-silver">
          {/* Segments stay whole — wraps land on the dividers, never inside
              a role. */}
          <span className="whitespace-nowrap">Builder</span> ·{" "}
          <span className="whitespace-nowrap">Venture Associate @ 16VC</span> ·{" "}
          <span className="whitespace-nowrap">CS Alum @ UCSC</span>
        </span>
      </span>
    </Link>
  );
}
