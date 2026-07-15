import {
  seasonRefs,
  type CareerEvent,
  type Season,
} from "../../../content/career";
import { licenses } from "../../../content/licenses";
import { playerList } from "../../../content/lobby";
import { CarChip } from "./CarChip";
import { MissionChip } from "./MissionChip";
import { LicenseChip } from "./LicenseChip";
import { LobbyChip } from "./LobbyChip";

function RailShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-steel bg-panel p-4 shadow-[2px_3px_0_rgba(0,0,0,0.7)]">
      <h2 className="ts-hard font-display text-sm font-bold tracking-[0.2em] text-gt-bright uppercase">
        {title}
      </h2>
      {children}
    </div>
  );
}

function RailSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4">
      <h3 className="font-display text-xs font-bold tracking-[0.18em] text-gt-bright uppercase">
        {label}
      </h3>
      <div className="mt-1.5 flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

/**
 * Per-event context rail: this event's real cross-references (Garage cars,
 * Missions, License classes that cite it, and the Lobby communities it maps
 * to). Every relationship is derived from the content graph — nothing is
 * invented. When an event has no cross-references, the rail falls back to its
 * season briefing so the column is never empty.
 */
export function EventBriefing({
  season,
  event,
}: {
  season: Season;
  event: CareerEvent;
}) {
  const cars = event.carIds ?? [];
  const missions = event.missionIds ?? [];
  const licenseTiers = licenses.filter((tier) =>
    tier.tests.some((test) => test.careerEventId === event.slug),
  );
  const lobbyOrgs = playerList.filter((p) => p.careerEventSlug === event.slug);

  const hasRefs =
    cars.length > 0 ||
    missions.length > 0 ||
    licenseTiers.length > 0 ||
    lobbyOrgs.length > 0;

  if (!hasRefs) {
    const refs = seasonRefs(season);
    return (
      <RailShell title="Season briefing">
        <p className="mt-2 text-sm text-ink leading-snug">{season.summary}</p>
        {refs.cars.length > 0 ? (
          <RailSection label="Cars unlocked">
            {refs.cars.map((c) => (
              <CarChip key={c} carId={c} />
            ))}
          </RailSection>
        ) : null}
        {refs.missions.length > 0 ? (
          <RailSection label="Missions cleared">
            {refs.missions.map((m) => (
              <MissionChip key={m} missionId={m} />
            ))}
          </RailSection>
        ) : null}
      </RailShell>
    );
  }

  return (
    <RailShell title="Connections">
      {cars.length > 0 ? (
        <RailSection label="Cars unlocked">
          {cars.map((c) => (
            <CarChip key={c} carId={c} />
          ))}
        </RailSection>
      ) : null}
      {missions.length > 0 ? (
        <RailSection label="Missions cleared">
          {missions.map((m) => (
            <MissionChip key={m} missionId={m} />
          ))}
        </RailSection>
      ) : null}
      {licenseTiers.length > 0 ? (
        <RailSection label="Licenses earned">
          {licenseTiers.map((tier) => (
            <LicenseChip key={tier.id} tierId={tier.id} />
          ))}
        </RailSection>
      ) : null}
      {lobbyOrgs.length > 0 ? (
        <RailSection label="In the lobby">
          {lobbyOrgs.map((org) => (
            <LobbyChip key={org.id} name={org.name} />
          ))}
        </RailSection>
      ) : null}
    </RailShell>
  );
}
