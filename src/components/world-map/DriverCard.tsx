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
      className="driver-selector"
      aria-label="Driver profile: Surya Pugazhenthi — view career and experience"
    >
      {/* Source is 480×480. Asking for 64 served a 64px file into a 58×66 box,
          so the one real face on the landing screen arrived soft — the intrinsic
          size has to lead the CSS box, not match it. */}
      <Image
        src="/terminal/portrait.jpg"
        alt="Portrait of Surya Pugazhenthi"
        width={128}
        height={128}
        className="driver-selector-portrait"
      />
      <span className="driver-selector-details">
        <span className="driver-selector-label">
          Driver Profile
        </span>
        <span className="driver-selector-name">
          Surya Pugazhenthi
        </span>
        <span className="driver-selector-role">
          Builder · Venture Associate @ 16VC
        </span>
        <span className="driver-selector-role">
          CS Alum @ UCSC
        </span>
      </span>
      <span className="driver-selector-arrow" aria-hidden="true">▸</span>
    </Link>
  );
}
