import type { Metadata } from "next";
import { GtCrumb, GtTitle, LozengeLink } from "@/components/gt/GtChrome";
import { JoinControls } from "@/components/lobby/JoinControls";
import { PlayerList } from "@/components/lobby/PlayerList";
import { RoomStatusPanel } from "@/components/lobby/RoomStatusPanel";
import { joinControls, lobbyRoom, playerList, statusChips } from "../../../content/lobby";
import { pavilions } from "../../../content/pavilions";

export const metadata: Metadata = {
  title: "Online Lobby — Surya Pugazhenthi",
  description:
    "Contact Surya Pugazhenthi and see the communities and organizations he's active in — email, GitHub, LinkedIn, and X, plus the venture and builder circles he's part of.",
};

const lobbyPavilion = pavilions.find((p) => p.slug === "lobby");
const livery = lobbyPavilion?.livery ?? "redbull";

export default function LobbyPage() {
  return (
    <div className="relative flex flex-1 flex-col px-5 py-6 md:px-10 md:py-8">
      <GtCrumb label="Online Lobby" />

      <header>
        <LozengeLink href="/">
          <span aria-hidden="true">←</span> World Map
        </LozengeLink>
      </header>

      <main className="flex flex-1 flex-col pb-10">
        <div className="mt-10 md:mt-12">
          <GtTitle kicker="Multiplayer lobby">Online Lobby</GtTitle>
          <p className="mt-3 max-w-2xl text-base text-silver">
            Contact and communities, framed as a lobby room. See what Surya is
            open to right now, join via a channel below, or browse the
            communities and organizations he&rsquo;s part of.
          </p>
        </div>

        <div className="mt-8">
          <RoomStatusPanel room={lobbyRoom} chips={statusChips} livery={livery} />
        </div>

        <JoinControls controls={joinControls} />

        <PlayerList players={playerList} livery={livery} />
      </main>
    </div>
  );
}
