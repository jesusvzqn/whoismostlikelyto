export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 15;
/** Rounds are fixed for every game — not configurable by the host. */
export const TOTAL_ROUNDS = 20;
export const MAX_NAME_LENGTH = 15;
export const VOTE_DURATION_MS = 60_000;

export type PlayerId = string;

export type Player = {
  id: PlayerId;
  name: string;
  /** Secret, per-player token. Never sent to any other player. */
  token: string;
  joinedAt: number;
};

/** `phase !== "lobby"` IS "the game has started" — no separate flag needed. */
export type OnlinePhase = "lobby" | "voting" | "reveal" | "summary";

export type RoundTally = { candidateId: PlayerId; votes: number };

export type RoundResult = {
  round: number;
  statement: string;
  /** One entry per player who was in the room during this round, 0-vote players included. */
  tally: RoundTally[];
  /** Every candidate sharing the max vote count — ties are fully preserved. Empty if nobody voted. */
  winners: PlayerId[];
  votesCast: number;
};

export type RoomState = {
  code: string; // 4 uppercase letters, e.g. "TXQP"
  createdAt: number; // epoch ms, for debugging/observability only (Redis TTL is authoritative)
  hostId: PlayerId; // always players[0].id at creation, stable afterward
  totalRounds: number;
  currentRound: number; // 0 while in lobby
  usedStatements: string[];
  currentStatement: string | null;
  players: Player[]; // length 1..MAX_PLAYERS, insertion order
  phase: OnlinePhase;
  /** Epoch ms when the current voting round closes. Server-authoritative; null outside "voting". */
  votingEndsAt: number | null;
  /** voterId -> candidateId for the round in progress. SERVER-ONLY: never sent to clients,
   * cleared every time a round resolves. This is the one place voter identity is tracked at all. */
  votes: Record<PlayerId, PlayerId>;
  results: RoundResult[];
};

export type PlayerPublic = { id: PlayerId; name: string };
export type RankingEntry = {
  rank: number;
  playerId: PlayerId;
  name: string;
  totalVotes: number;
};

/** What a client actually receives — no tokens, and no voter-to-candidate mapping for
 * anyone but the viewer's own pick. Aggregate counts only. */
export type RoomView = {
  code: string;
  createdAt: number;
  hostId: PlayerId;
  totalRounds: number;
  currentRound: number;
  currentStatement: string | null;
  phase: OnlinePhase;
  players: PlayerPublic[];
  you: PlayerId;
  isHost: boolean;
  votingEndsAt: number | null;
  /** Lets the client compute a drift-corrected countdown against its own clock. */
  serverNow: number;
  /** Only the viewer's own pick for the round in progress, never anyone else's. */
  yourVote: PlayerId | null;
  /** How many players have voted so far this round — aggregate only, no names. */
  votedCount: number;
  results: RoundResult[];
  /** Present only once the game has reached "summary". */
  finalRanking?: RankingEntry[];
};
