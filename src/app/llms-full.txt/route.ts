import { llmsFullTxt } from "@/lib/agent-docs/llms";
import { agentDocResponse } from "@/lib/agent-docs/respond";

// Built once from content/*.ts at build time — no request data involved.
export const dynamic = "force-static";

export function GET(): Response {
  return agentDocResponse(llmsFullTxt(), "text/plain");
}
