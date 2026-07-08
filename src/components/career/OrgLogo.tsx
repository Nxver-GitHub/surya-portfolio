import Image from "next/image";

interface OrgLogoProps {
  logo?: string;
  org: string;
  size?: number;
}

function initials(org: string): string {
  return org
    .split(/[\s,—-]+/)
    .filter((w) => /^[A-Za-z0-9]/.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

/**
 * Org mark next to a Track/company mention: real logo when we have one,
 * otherwise an initials tile in the same footprint.
 */
export function OrgLogo({ logo, org, size = 28 }: OrgLogoProps) {
  if (logo) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[3px] bg-white shadow-[1px_1px_0_rgba(0,0,0,0.8)]"
        style={{ width: size, height: size }}
      >
        <Image
          src={logo}
          alt={`${org} logo`}
          width={size}
          height={size}
          className="h-full w-full object-contain"
        />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-[3px] border border-steel bg-panel font-display font-black text-silver shadow-[1px_1px_0_rgba(0,0,0,0.8)]"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials(org)}
    </span>
  );
}
