# Who's Most Likely To...?

An online-only party game for your team, built with Next.js (App Router),
TypeScript, and Tailwind CSS. One host creates a room and shares a 4-letter
code; up to 9 more people join from their own device (10 players total).
Each round shows a prompt completing "Who's most likely to...?", themed
around IT/Product team life (pull requests, Jira tickets, incidents,
standups, estimation, and so on) with a mildly awkward, funny tone. Everyone
votes for anyone — including themselves — within a 60-second window, and the
app reveals who got the most votes that round (ties fully allowed) without
ever showing who voted for whom. At the end, a final ranking shows who
racked up the most votes across the whole game.

## Requirements

- Node.js 18.18+ (Node 20+ recommended — a couple of dev dependencies emit
  engine warnings on 18 but still work)
- An Upstash Redis database (free tier is plenty). **This is required** —
  the app is online-only, so without it configured the game shows a
  "not configured" message instead of letting anyone play. See
  [Setting up Redis](#setting-up-redis) below.

## Getting started

```bash
npm install
npm run dev       # http://localhost:3000
npm run build     # production build
npm run start     # run the production build
npm run lint      # ESLint
npm run test      # Vitest (room logic + API route tests)
```

Before `npm run dev` will let you actually play, create a `.env.local` file
in the project root with your Upstash credentials (see below):

```
UPSTASH_REDIS_REST_URL=https://your-db-name.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

## How to play

1. The host creates a room and shares the 4-letter code with the team.
2. Up to 9 more people join (10 total). Everyone sees the live player list;
   only the host can start the game, whenever they're ready.
3. Once started, each round shows a "Who's most likely to...?" prompt.
   Tap any name — including your own — and confirm to lock in your vote.
4. Each round has a 60-second voting window. Miss it and your vote simply
   doesn't count.
5. After each round, everyone sees the full vote tally (ties and all) —
   nobody ever sees who voted for whom.
6. At the end, a final ranking shows who received the most votes overall.

## Setting up Redis

Recommended path — do this from your Vercel project:

1. Open your project on [vercel.com](https://vercel.com) → **Storage** tab →
   **Create Database** → choose **Upstash** (Redis), free tier.
2. Vercel automatically injects `KV_REST_API_URL`/`KV_REST_API_TOKEN` (or
   `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` on older setups) into
   the project — the app accepts either naming (`src/lib/online/redis.ts`).
3. Redeploy so the new environment variables take effect (env vars only
   apply to new deployments).
4. Verify: visit `/api/config` on your deployed site — it should respond
   `{"onlineEnabled":true}`.

For local development, pull the same credentials into `.env.local` with
`vercel env pull .env.local` (after `vercel link`), or create a free database
directly at [upstash.com](https://upstash.com) and paste its REST URL/token
into `.env.local` yourself.

## Architecture

- `src/lib/online/` — all server-authoritative room logic:
  - `types.ts` — `RoomState`/`RoomView`, player/round types, and the shared
    constants (`MIN_PLAYERS`/`MAX_PLAYERS` = 2–10, `MIN_ROUNDS`/`MAX_ROUNDS`
    = 10–50, `VOTE_DURATION_MS` = 60s).
  - `room.ts` — pure functions driving the room state machine
    (`createRoom`, `joinRoom`, `startGame`, `castVote`, `maybeResolveRound`,
    `advanceRound`, `finishRoom`, `replayRoom`, `computeRanking`, `toView`).
    `toView` is where anti-cheat masking happens: it never serializes a
    player's token, and only ever exposes the viewer's own vote for the
    round in progress — aggregate counts only, never who voted for whom.
  - `statements.ts` — picks a random, not-yet-used statement from the pool.
  - `auth.ts`, `codes.ts`, `ids.ts`, `validate.ts`, `redis.ts` — token
    lookup, room code generation, id/token generation, input validation,
    and the Upstash Redis client wrapper (keyed `room:{code}`, 30-minute
    TTL refreshed on every write).
  - `useOnlineRoom.ts` — the client-side hook: polls `GET /api/rooms/[code]`
    every ~1.5s and exposes `createRoom`/`joinRoom`/`startGame`/`castVote`/
    `advance`/`finish`/`replay`.
  - `*.test.ts` — Vitest unit tests for the room state machine.
- `src/data/statements.ts` — the pool of IT/Product-team statement
  completions.
- `src/app/api/rooms/` — the Next.js Route Handlers backing all of the
  above (create, join, start, vote, advance, finish, replay, and an
  Edge-runtime poll endpoint). `src/app/api/config/route.ts` exposes
  `{ onlineEnabled }`, which gates the client UI.
- `src/components/PreGameFlow.tsx` — top-level flow: rules → mode select →
  create/join → the room itself (`OnlineGame.tsx`).
- `src/components/screens/online/` — one component per room phase (lobby,
  round/voting, reveal, summary) plus create/join forms.
- `src/components/screens/shared/` — presentational building blocks shared
  between the reveal and summary screens.
- `src/components/ui/` — buttons, progress bar, confirm dialog, rounds
  picker wheel.

## Adding statements

Add new entries to the array in `src/data/statements.ts`. Each entry is the
part of the sentence that follows "Who's most likely to...?" (e.g.
`"approve a pull request without actually reading the diff"`). Keep the
tone mildly negative/awkward and varied across engineering and product
topics. Keep the pool comfortably above `MAX_ROUNDS` (50) so a full-length
game never has to repeat a statement.

## Deploying

The app is a standard Next.js project — deploys to Vercel via `vercel` or
Git import with no custom server. Unlike a typical zero-config Next.js app,
though, it **won't be playable** until the Upstash Redis environment
variables are set (see [Setting up Redis](#setting-up-redis)) — without
them, `/api/config` reports `onlineEnabled: false` and the UI shows a
"not configured" message instead of the game.
