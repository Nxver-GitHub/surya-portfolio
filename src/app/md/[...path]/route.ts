import { markdownForPath, markdownPagePaths } from "@/lib/agent-docs/pages";
import { agentDocResponse } from "@/lib/agent-docs/respond";
import { absoluteUrl } from "@/lib/jsonld";

/**
 * Markdown alternates. Visitors and agents request `<page>.md` (home:
 * `/index.md`); the rewrite in next.config.ts maps that here. Every document
 * is prerendered; a path without a page gets a plain 404.
 */
export const dynamic = "force-static";

interface MarkdownRouteContext {
  params: Promise<{ path: string[] }>;
}

/** `/` is served as `index`, so the URL reads `/index.md`. */
function toSegments(pagePath: string): string[] {
  return pagePath === "/" ? ["index"] : pagePath.slice(1).split("/");
}

function toPagePath(segments: readonly string[]): string {
  return segments.length === 1 && segments[0] === "index" ? "/" : `/${segments.join("/")}`;
}

export function generateStaticParams(): { path: string[] }[] {
  return markdownPagePaths().map((p) => ({ path: toSegments(p) }));
}

export async function GET(
  _request: Request,
  { params }: MarkdownRouteContext,
): Promise<Response> {
  const { path } = await params;
  const pagePath = toPagePath(path);
  const body = markdownForPath(pagePath);
  if (!body) {
    return new Response("Not found\n", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  return agentDocResponse(body, "text/markdown", absoluteUrl(pagePath));
}
