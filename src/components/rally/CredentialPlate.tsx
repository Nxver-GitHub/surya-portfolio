import type { Credential } from "../../../content/credentials";
import type { LiveryId } from "../../../content/liveries";
import { LiveryStripe } from "../livery/LiveryStripe";

interface CredentialPlateProps {
  credential: Credential;
  livery?: LiveryId;
  className?: string;
}

/**
 * Rally competition plate: the rectangular board taped to a rally car's
 * flank, carrying its entry number and the event that issued it. Here the
 * number is the issuer's own credential id, so the plate is evidence rather
 * than decoration — a reader can carry that id back to the issuer.
 *
 * Built from chrome the pavilion already uses (LiveryStripe band over a
 * stamped `.plate` body) so it reads as native to the Special Stage cards
 * and to the trophy wall, which both render it.
 *
 * The id steps down in size and tracking at narrow widths: fifteen
 * wide-tracked characters is exactly the shape that forces a phone into
 * horizontal scroll, and nothing on this site may do that.
 */
export function CredentialPlate({
  credential,
  livery = "subaru555",
  className = "",
}: CredentialPlateProps) {
  return (
    <div className={`max-w-full ${className}`}>
      <LiveryStripe livery={livery} />
      <div className="plate px-3 py-2">
        <p className="ts-hard font-display text-base leading-none font-bold tracking-[0.12em] text-gt-bright tabular-nums sm:text-lg sm:tracking-[0.2em]">
          {credential.credentialId}
        </p>
        <p className="mt-1.5 font-display text-xs leading-none tracking-[0.14em] text-silver uppercase">
          {credential.issuer} · Verified
        </p>
      </div>
    </div>
  );
}
