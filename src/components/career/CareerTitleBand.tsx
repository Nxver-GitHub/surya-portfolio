import { GtTitle } from "@/components/gt/GtChrome";
import { seasonTint } from "./warmth";

interface CareerTitleBandProps {
  /** Season id (s1/s2/s3) whose identity tints the field. */
  seasonId: string;
  kicker: string;
  children: React.ReactNode;
}

/**
 * Variant A — a flat warm season field behind the kicker + title block,
 * bleeding to the left screen edge (matches the page's px-5 / md:px-10 gutter).
 * Hard edges, zero blur, dark asphalt ink via GtTitle's `dark` treatment.
 */
export function CareerTitleBand({
  seasonId,
  kicker,
  children,
}: CareerTitleBandProps) {
  const tint = seasonTint(seasonId);
  return (
    <div
      className="mt-10 -ml-5 w-fit py-4 pr-8 pl-5 md:mt-12 md:-ml-10 md:pl-10"
      style={{ backgroundColor: tint.field }}
    >
      <GtTitle kicker={kicker} dark>
        {children}
      </GtTitle>
    </div>
  );
}
