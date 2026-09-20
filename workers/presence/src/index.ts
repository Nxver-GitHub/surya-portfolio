/**
 * surya-presence — the front door of the live lobby presence service.
 *
 * This Worker does three things and then gets out of the way: it rejects
 * anything that is not a WebSocket upgrade on PRESENCE_PATH, it checks the
 * Origin, and it hands the request to the one global `PresenceRoom` Durable
 * Object. After the 101 the socket is between the browser and the room; the
 * Worker is not on the data path and is not billed for the conversation.
 *
 * Design record: Docs/story-lobby-presence.md §3 and §5.
 */

import { PRESENCE_PATH } from "../../../src/lib/presence/protocol";
import { isAllowedOrigin } from "./logic";
import { PresenceRoom, type Env } from "./room";

/** One room for the whole site. Scope decision: spec §1, row 5. */
const ROOM_NAME = "global";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return new Response("ok", {
        status: 200,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    if (url.pathname !== PRESENCE_PATH) {
      return new Response("not found", { status: 404 });
    }
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("not found", { status: 404 });
    }
    if (!isAllowedOrigin(request.headers.get("Origin"), env.PRESENCE_DEV === "1")) {
      return new Response("forbidden", { status: 403 });
    }

    try {
      const room = env.ROOM.get(env.ROOM.idFromName(ROOM_NAME));
      return await room.fetch(request);
    } catch (error) {
      // Never surface room internals to the browser; the client treats any
      // non-101 as "offline" and the lobby renders as it did before.
      console.error(
        `presence: room unreachable (${error instanceof Error ? error.name : "unknown"})`,
      );
      return new Response("presence unavailable", { status: 503 });
    }
  },
} satisfies ExportedHandler<Env>;

export { PresenceRoom };
export type { Env };
