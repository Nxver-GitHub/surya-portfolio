import type { Metadata } from "next";
import { markdownPath } from "./agent-docs/pages";

/**
 * A page's `alternates`: the absolute self-canonical (resolved against
 * metadataBase) plus its markdown twin, which renders as
 * <link rel="alternate" type="text/markdown"> for agents.
 */
export function pageAlternates(path: string): NonNullable<Metadata["alternates"]> {
  return {
    canonical: path,
    types: { "text/markdown": markdownPath(path) },
  };
}
