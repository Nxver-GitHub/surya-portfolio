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

`PresenceRoom` makes **no `ctx.storage` call anywhere**; `test/no-storage.test.ts`
asserts that against the source. The migration says `new_sqlite_classes` only
because Cloudflare no longer creates key-value Durable Object namespaces at all
(the first deploy with `new_classes` was refused, error 10099). The SQLite
backend exists and stays empty.

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

An agent cannot do any of this; it is dashboard and account work.

Abuse controls that exist at merge time, with no owner action: origin
allowlist, room cap 64, 3 sockets per IPv4 address or IPv6 /64, 20 frames per
10 s per socket (then close 1008), 1 accepted `loc` per second, 4 KB frames,
an idle sweep on every upgrade (silent > 10 min or connected > 8 h → closed),
and a browser heartbeat every 4 min. The WAF rule in step 3 sits in front of
all of that. Source:
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
4. **Site build variable.** `NEXT_PUBLIC_PRESENCE_URL` is inlined into the
   client bundle by `next build`, so a *runtime* Worker var would never reach
   the browser. Set it as a **build variable** on the `surya-site` Workers
   Builds project (Settings → Build → Variables and secrets):
   `NEXT_PUBLIC_PRESENCE_URL=wss://live.suryapugaz.com/room`, then trigger a
   build. Until then the site is keyless and behaves exactly as it does today,
   so this Worker can ship before the client does.
5. **Optional secret** `PRESENCE_IP_KEY` (`wrangler secret put PRESENCE_IP_KEY`
   from `workers/presence`, any long random string). With it set, the per-IP
   cap hashes under a stable key and so also holds across hibernation wakes.
   Without it the room falls back to a per-boot random key and the idle sweep
   is the backstop. Never logged, never used for anything but that HMAC.

Suggested order: merge this PR (it ships both halves; the site stays keyless)
→ owner steps 1–3 and optionally 5 → owner step 4 → verify a build deployed by
timestamp and that the lobby shows `ONLINE 1` in one tab.
