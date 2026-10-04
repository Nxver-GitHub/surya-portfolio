/**
 * md — tiny pure helpers for the agent-facing markdown documents.
 * Kept separate so the section builders read as content, not string plumbing.
 */
import { absoluteUrl } from "../jsonld";

/** A markdown link to a site page, always absolute (agents quote links out of context). */
export function pageLink(label: string, path: string): string {
  return `[${label}](${absoluteUrl(path)})`;
}

export function bullets(items: readonly string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

/** Join non-empty blocks with a blank line between them. */
export function blocks(...parts: readonly (string | null | undefined | false)[]): string {
  return parts.filter((p): p is string => typeof p === "string" && p.length > 0).join("\n\n");
}

/** `**Label:** value` lines, skipping empty values. */
export function facts(rows: readonly (readonly [string, string | undefined])[]): string {
  return rows
    .filter((row): row is readonly [string, string] => Boolean(row[1]))
    .map(([label, value]) => `- **${label}:** ${value}`)
    .join("\n");
}
