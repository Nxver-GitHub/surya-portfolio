import Link from "next/link";
import { licenseById, type LicenseTierId } from "../../../content/licenses";
import { Glyph } from "../gt/Glyph";

/** Cross-reference chip to a License class in the License Center. */
export function LicenseChip({ tierId }: { tierId: LicenseTierId }) {
  const tier = licenseById.get(tierId);
  if (!tier) return null;
  return (
    <Link
      href="/license-center"
      className="inline-flex items-center gap-1.5 border border-gt/60 px-2 py-0.5 font-display text-xs font-semibold tracking-wider text-gt-bright uppercase outline-none hover:border-gt-bright hover:text-chrome focus-visible:ring-2 focus-visible:ring-gt-bright"
    >
      <Glyph kind="badge" />
      Class {tier.id}
      <span className="text-silver/60">· License</span>
    </Link>
  );
}
