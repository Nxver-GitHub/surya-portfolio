import Link from "next/link";
import { Glyph } from "../gt/Glyph";

/** Cross-reference chip to the Online Lobby for an org/community that appears
 * there (derived from content/lobby.ts playerList). */
export function LobbyChip({ name }: { name: string }) {
  return (
    <Link
      href="/lobby"
      className="inline-flex items-center gap-1.5 border border-gt/60 px-2 py-0.5 font-display text-xs font-semibold tracking-wider text-gt-bright uppercase outline-none hover:border-gt-bright hover:text-chrome focus-visible:ring-2 focus-visible:ring-gt-bright"
    >
      <Glyph kind="signal" />
      {name}
      <span className="text-silver/60">· Lobby</span>
    </Link>
  );
}
