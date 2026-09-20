# surya-presence

The server half of **live lobby presence**: real visitors appear as racers in
the Online Lobby and as an `ONLINE n` readout on the world map.

It is a standalone Cloudflare Worker (`workers/presence`, a pnpm workspace
package) with one Durable Object. It is deliberately not part of the site
Worker: the socket must not be proxied through OpenNext, and a small Worker with
its own wrangler config can be deployed, rate-limited and rolled back on its
own.

```
browser  ──wss://live.suryapugaz.com/room──►  src/index.ts   (Origin gate, path gate)
                                                    │  env.ROOM.idFromName("global")
                                                    ▼
                                              src/room.ts    PresenceRoom (Durable Object)
```

After the 101 the Worker is off the data path; the socket is between the browser
and the room.

## Wire contract

The protocol is **not defined here.** It lives once at
`src/lib/presence/protocol.ts` in the repo root and is imported by both the
browser and this Worker, so the zod schemas, the caps and the close codes cannot
drift apart. Never copy it into this package.

Client → server: `{ "t": "loc", "p": "<pavilion slug>" }`, at most 1/s.
Server → client: `hello`, `join`, `leave`, `loc`, `full`.

## Why there is no storage

`PresenceRoom` makes **no `ctx.storage` call anywhere**, and its migration uses
`new_classes`, never `new_sqlite_classes`. Both halves of that rule are asserted
by `test/no-storage.test.ts` against the source and the wrangler config.

The roster is derived entirely from `ctx.getWebSockets()` and each socket's
hibernation attachment, so it is rebuilt for free when the object wakes. There
is nothing to migrate, nothing to retain, and — the point — no visitor data at
rest, in a service that necessarily sees `cf-connecting-ip`.

That address is never stored or logged. The per-IP cap keys on an HMAC of it
under a key generated with `crypto.getRandomValues` when the object wakes and
never persisted, so the cap holds for one Durable Object lifetime and nothing
derived from an address outlives the process. Logs carry counts only.

If a peak-online statistic is ever wanted, it belongs in the existing Upstash
events pipeline on the site Worker, not here.

## Caps and refusals

| Rule | Limit | Response |
|---|---|---|
| Origin | `https://suryapugaz.com` only | `403` |
| Path | `/room` with `Upgrade: websocket` | `404` otherwise (`/health` → `200 ok`) |
| Sockets per address | 3 | `429` before the upgrade |
| Sockets per room | 64 | accept, send `{"t":"full"}`, close `1013` |
| Frame size | 4 KB | close `1008` |
| Bad JSON / unknown `t` | — | close `1008` |
| Unknown pavilion slug | — | dropped silently, socket lives (stale client) |
| `loc` rate | 1/s per socket | excess dropped silently |

## Local run

```bash
pnpm --filter presence dev        # wrangler dev on http://localhost:8787
pnpm --filter presence test       # vitest inside workerd
pnpm --filter presence typecheck  # tsc --noEmit
```

`wrangler dev` refuses `http://localhost` origins unless `PRESENCE_DEV=1` is
set. Do that locally only — create `.dev.vars` in this directory (it is
gitignored repo-wide) with:

```
PRESENCE_DEV=1
```

Production must never define `PRESENCE_DEV`.

Two notes on the local toolchain:

- All local sockets share one `cf-connecting-ip`, so the per-address cap of 3
  applies to your own browser tabs when testing against `wrangler dev`.
- `vitest.config.ts` pins the **test** compatibility date to the newest one the
  pool's bundled workerd accepts, which lags the date in `wrangler.jsonc`.
  Deploys use the wrangler date. Raise the test pin when the pool ships a newer
  runtime.

## Owner-only setup

An agent cannot do any of this; it is dashboard and account work. Source:
`Docs/story-lobby-presence.md` §7 (local-only).

1. **Workers Builds project.** Cloudflare → Workers → create a *second* Workers
   Builds project on this same GitHub repo, root directory `workers/presence`,
   build command `pnpm --filter presence deploy` (or `wrangler deploy` from that
   directory). It then deploys on merge to `main`, like `surya-site`. Confirm a
   deploy by **timestamp**, not by the `source` field.
2. **Custom domain.** Add `live.suryapugaz.com` to `surya-presence`; Cloudflare
   creates the DNS record and certificate. Do **not** touch the other project's
   Workers or zones in this shared account.
3. **WAF rate-limiting rule** on `live.suryapugaz.com` for the upgrade path.
   This is also the still-open edge rate-limit TODO from the 2026-09-16 security
   audit, and can be done in the same sitting.
4. **Site variable.** Set `NEXT_PUBLIC_PRESENCE_URL=wss://live.suryapugaz.com/room`
   on the `surya-site` Worker — a plain var, not a secret. The site stays
   keyless until then and behaves exactly as it does today, so this Worker can
   ship before the client does.

There are no secrets. Nothing to `wrangler secret put`.

Suggested order: merge this Worker → owner steps 1–3 → merge the site client PR
(which adds `wss://live.suryapugaz.com` to `connect-src` in the CSP) → owner
step 4.
