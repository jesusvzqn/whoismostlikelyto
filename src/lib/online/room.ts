import { pickStatement } from "./statements";
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  VOTE_DURATION_MS,
  type PlayerId,
  type RankingEntry,
  type RoomState,
  type RoomView,
  type RoundResult,
  type RoundTally,
} from "./types";

export function createRoom(
  code: string,
  hostName: string,
  hostId: PlayerId,
  hostToken: string,
  totalRounds: number
): RoomState {
  const now = Date.now();
  return {
    code,
    createdAt: now,
    hostId,
    totalRounds,
    currentRound: 0,
    usedStatements: [],
    currentStatement: null,
    players: [{ id: hostId, name: hostName, token: hostToken, joinedAt: now }],
    phase: "lobby",
    votingEndsAt: null,
    votes: {},
    results: [],
  };
}

export type Joinability = "ok" | "started" | "full";

export function canJoin(room: RoomState): Joinability {
  if (room.phase !== "lobby") return "started";
  if (room.players.length >= MAX_PLAYERS) return "full";
  return "ok";
}

export function joinRoom(
  room: RoomState,
  name: string,
  playerId: PlayerId,
  token: string
): RoomState {
  if (canJoin(room) !== "ok") return room;
  return {
    ...room,
    players: [
      ...room.players,
      { id: playerId, name, token, joinedAt: Date.now() },
    ],
  };
}

/** Replaces the old auto-start-on-2nd-join behavior: the host decides when
 * the lobby closes and the first round begins. */
export function startGame(
  room: RoomState,
  requesterId: PlayerId,
  now: number = Date.now()
): RoomState {
  if (room.phase !== "lobby") return room;
  if (requesterId !== room.hostId) return room;
  if (room.players.length < MIN_PLAYERS) return room;

  const statement = pickStatement(room.usedStatements);
  return {
    ...room,
    currentRound: 1,
    usedStatements: [...room.usedStatements, statement],
    currentStatement: statement,
    phase: "voting",
    votingEndsAt: now + VOTE_DURATION_MS,
    votes: {},
  };
}

function tallyVotes(room: RoomState): RoundTally[] {
  return room.players.map((p) => ({
    candidateId: p.id,
    votes: Object.values(room.votes).filter((candidateId) => candidateId === p.id)
      .length,
  }));
}

/** Tallies the round in progress and moves to "reveal". Never exposes who
 * voted for whom — only aggregate counts per candidate. Ties are preserved:
 * every candidate sharing the max count ends up in `winners`. */
function resolveRound(room: RoomState): RoomState {
  const tally = tallyVotes(room);
  const maxVotes = Math.max(0, ...tally.map((t) => t.votes));
  const winners =
    maxVotes > 0
      ? tally.filter((t) => t.votes === maxVotes).map((t) => t.candidateId)
      : [];

  const result: RoundResult = {
    round: room.currentRound,
    statement: room.currentStatement ?? "",
    tally,
    winners,
    votesCast: Object.keys(room.votes).length,
  };

  return {
    ...room,
    results: [...room.results, result],
    votes: {},
    votingEndsAt: null,
    phase: "reveal",
  };
}

/** Called from every route right after reading the room, so the 60s voting
 * timer gets enforced without a background worker: the next poll/action to
 * touch an expired room resolves it. A no-op before expiry. */
export function maybeResolveRound(
  room: RoomState,
  now: number = Date.now()
): RoomState {
  if (room.phase !== "voting") return room;
  if (room.votingEndsAt === null || now < room.votingEndsAt) return room;
  return resolveRound(room);
}

export function castVote(
  room: RoomState,
  voterId: PlayerId,
  candidateId: PlayerId,
  now: number = Date.now()
): RoomState {
  // If voting already expired, resolve the round first and drop this vote —
  // a late vote simply doesn't count.
  const settled = maybeResolveRound(room, now);
  if (settled !== room) return settled;

  if (room.phase !== "voting") return room;
  if (!room.players.some((p) => p.id === voterId)) return room;
  if (!room.players.some((p) => p.id === candidateId)) return room;
  if (voterId in room.votes) return room; // already voted, idempotent

  const votes = { ...room.votes, [voterId]: candidateId };
  const updated = { ...room, votes };
  const everyoneVoted = Object.keys(votes).length === room.players.length;
  return everyoneVoted ? resolveRound(updated) : updated;
}

/** Any player may advance the round (first click wins, idempotent) — unlike
 * the old 2-player "both must confirm" model, host-gating this would let one
 * AFK participant stall a room of up to 10. */
export function advanceRound(
  room: RoomState,
  requesterId: PlayerId,
  now: number = Date.now()
): RoomState {
  if (room.phase !== "reveal") return room;
  if (!room.players.some((p) => p.id === requesterId)) return room;

  if (room.currentRound >= room.totalRounds) {
    return { ...room, phase: "summary" };
  }

  const statement = pickStatement(room.usedStatements);
  return {
    ...room,
    currentRound: room.currentRound + 1,
    usedStatements: [...room.usedStatements, statement],
    currentStatement: statement,
    phase: "voting",
    votingEndsAt: now + VOTE_DURATION_MS,
    votes: {},
  };
}

/** Host-only: ending the game for everyone else isn't a call any one of up
 * to 10 participants should get to make unilaterally. */
export function finishRoom(room: RoomState, requesterId: PlayerId): RoomState {
  if (requesterId !== room.hostId) return room;
  if (room.phase !== "voting" && room.phase !== "reveal") return room;
  return { ...room, phase: "summary", votingEndsAt: null };
}

/** Host-only. Resets to the lobby (not straight back into voting) so
 * latecomers can join the next game before the host restarts it. */
export function replayRoom(room: RoomState, requesterId: PlayerId): RoomState {
  if (requesterId !== room.hostId) return room;
  if (room.phase !== "summary") return room;
  return {
    ...room,
    phase: "lobby",
    currentRound: 0,
    usedStatements: [],
    currentStatement: null,
    votingEndsAt: null,
    votes: {},
    results: [],
  };
}

/** Ranking by total votes received across every round, competition-style
 * ties (e.g. a 3-way tie at the top produces ranks [1, 1, 1, 4]). */
export function computeRanking(room: RoomState): RankingEntry[] {
  const totals = new Map<PlayerId, number>();
  for (const player of room.players) totals.set(player.id, 0);
  for (const result of room.results) {
    for (const t of result.tally) {
      totals.set(t.candidateId, (totals.get(t.candidateId) ?? 0) + t.votes);
    }
  }

  const sorted = room.players
    .map((p) => ({
      playerId: p.id,
      name: p.name,
      totalVotes: totals.get(p.id) ?? 0,
    }))
    .sort((a, b) => b.totalVotes - a.totalVotes);

  const ranking: RankingEntry[] = [];
  let rank = 0;
  let previousVotes: number | null = null;
  sorted.forEach((entry, index) => {
    if (previousVotes === null || entry.totalVotes !== previousVotes) {
      rank = index + 1;
      previousVotes = entry.totalVotes;
    }
    ranking.push({ rank, ...entry });
  });
  return ranking;
}

/** What a client actually receives — no tokens, and no voter-to-candidate
 * mapping for anyone but the viewer's own pick. Returns null for an unknown
 * token so the caller can respond 404/403 instead of leaking room state. */
export function toView(room: RoomState, viewerToken: string): RoomView | null {
  const viewer = room.players.find((p) => p.token === viewerToken);
  if (!viewer) return null;

  return {
    code: room.code,
    createdAt: room.createdAt,
    hostId: room.hostId,
    totalRounds: room.totalRounds,
    currentRound: room.currentRound,
    currentStatement: room.currentStatement,
    phase: room.phase,
    players: room.players.map((p) => ({ id: p.id, name: p.name })),
    you: viewer.id,
    isHost: viewer.id === room.hostId,
    votingEndsAt: room.votingEndsAt,
    serverNow: Date.now(),
    yourVote: room.votes[viewer.id] ?? null,
    votedCount: Object.keys(room.votes).length,
    results: room.results,
    finalRanking: room.phase === "summary" ? computeRanking(room) : undefined,
  };
}
