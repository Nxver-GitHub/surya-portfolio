import Link from "next/link";
import { missionById } from "../../../content/missions";
import { LockedChip } from "./LockedChip";

/** Cross-reference chip to a Mission — live now that Missions is open. */
export function MissionChip({ missionId }: { missionId: string }) {
  const mission = missionById.get(missionId);
  if (!mission) {
    return <LockedChip label={missionId} unlocksWith="Missions" />;
  }
  return (
    <Link
      href="/missions"
      className="inline-flex items-center gap-1.5 border border-gt/60 px-2 py-0.5 font-display text-xs font-semibold tracking-wider text-gt-bright uppercase outline-none hover:border-gt-bright hover:text-chrome focus-visible:ring-2 focus-visible:ring-gt-bright"
    >
      <span aria-hidden="true">🏁</span>
      {mission.name}
      <span className="text-silver/60">· Missions</span>
    </Link>
  );
}
