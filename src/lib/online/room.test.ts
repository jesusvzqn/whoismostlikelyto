import { describe, expect, it } from "vitest";
import {
  advanceRound,
  canJoin,
  castVote,
  createRoom,
  finishRoom,
  joinRoom,
  maybeResolveRound,
  replayRoom,
  startGame,
  toView,
} from "./room";
import { MAX_PLAYERS } from "./types";
import type { RoomState } from "./types";

function setupLobby(totalRounds = 10): RoomState {
  const room = createRoom("TXQP", "Ana", "host", "host-token", totalRounds);
  return joinRoom(room, "Luis", "guest", "guest-token");
}

function setupVoting(totalRounds = 10, now = 1_000_000): RoomState {
  const room = setupLobby(totalRounds);
  return startGame(room, "host", now);
}

describe("createRoom", () => {
  it("starts in lobby with only the host present", () => {
    const room = createRoom("TXQP", "Ana", "host", "host-token", 10);
    expect(room.phase).toBe("lobby");
    expect(room.hostId).toBe("host");
    expect(room.players).toEqual([
      { id: "host", name: "Ana", token: "host-token", joinedAt: expect.any(Number) },
    ]);
    expect(room.currentRound).toBe(0);
  });
});

describe("canJoin / joinRoom", () => {
  it("allows joining while in the lobby and below the player cap", () => {
    const room = createRoom("TXQP", "Ana", "host", "host-token", 10);
    expect(canJoin(room)).toBe("ok");
    const joined = joinRoom(room, "Luis", "guest", "guest-token");
    expect(joined.players).toHaveLength(2);
    expect(joined.phase).toBe("lobby"); // joining no longer auto-starts the game
  });

  it("fills the room up to MAX_PLAYERS and rejects beyond that", () => {
    let room = createRoom("TXQP", "P0", "p0", "t0", 10);
    for (let i = 1; i < MAX_PLAYERS; i++) {
      room = joinRoom(room, `P${i}`, `p${i}`, `t${i}`);
    }
    expect(room.players).toHaveLength(MAX_PLAYERS);
    expect(canJoin(room)).toBe("full");
    const rejected = joinRoom(room, "Overflow", "overflow", "overflow-token");
    expect(rejected).toBe(room); // no-op
  });

  it("rejects joining once the game has started, even if not full", () => {
    const room = startGame(setupLobby(), "host");
    expect(canJoin(room)).toBe("started");
    const rejected = joinRoom(room, "Mia", "mia", "mia-token");
    expect(rejected).toBe(room);
  });
});

describe("startGame", () => {
  it("is a no-op with fewer than MIN_PLAYERS", () => {
    const room = createRoom("TXQP", "Ana", "host", "host-token", 10);
    expect(startGame(room, "host")).toBe(room);
  });

  it("is a no-op for a non-host requester", () => {
    const room = setupLobby();
    expect(startGame(room, "guest")).toBe(room);
  });

  it("draws a statement and opens a 60s voting window for the host", () => {
    const room = setupLobby();
    const started = startGame(room, "host", 1_000_000);
    expect(started.phase).toBe("voting");
    expect(started.currentRound).toBe(1);
    expect(started.currentStatement).not.toBeNull();
    expect(started.votingEndsAt).toBe(1_000_000 + 60_000);
  });

  it("is a no-op once already started", () => {
    const started = startGame(setupLobby(), "host", 1_000_000);
    expect(startGame(started, "host", 2_000_000)).toBe(started);
  });
});

describe("castVote", () => {
  it("stays in voting until everyone has voted", () => {
    const room = setupVoting();
    const afterOne = castVote(room, "host", "guest", 1_000_000);
    expect(afterOne.phase).toBe("voting");
    expect(afterOne.votes).toEqual({ host: "guest" });
  });

  it("counts a self-vote like any other vote", () => {
    const room = setupVoting();
    const afterOne = castVote(room, "host", "host", 1_000_000);
    expect(afterOne.votes).toEqual({ host: "host" });
  });

  it("resolves the round once everyone has voted, tallying every player", () => {
    const room = setupVoting();
    let s = castVote(room, "host", "guest", 1_000_000);
    s = castVote(s, "guest", "guest", 1_000_000);
    expect(s.phase).toBe("reveal");
    expect(s.results).toHaveLength(1);
    expect(s.results[0].votesCast).toBe(2);
    expect(s.results[0].winners).toEqual(["guest"]);
    expect(s.results[0].tally).toEqual(
      expect.arrayContaining([
        { candidateId: "guest", votes: 2 },
        { candidateId: "host", votes: 0 },
      ])
    );
    expect(s.votes).toEqual({});
    expect(s.votingEndsAt).toBeNull();
  });

  it("produces a tied winners list when votes are split evenly", () => {
    const room = setupVoting();
    let s = castVote(room, "host", "guest", 1_000_000);
    s = castVote(s, "guest", "host", 1_000_000);
    expect(s.results[0].winners.sort()).toEqual(["guest", "host"]);
  });

  it("ignores a duplicate vote from the same voter", () => {
    const room = setupVoting();
    const afterOne = castVote(room, "host", "guest", 1_000_000);
    const again = castVote(afterOne, "host", "host", 1_000_000);
    expect(again).toBe(afterOne);
  });

  it("ignores a vote for an unknown candidate", () => {
    const room = setupVoting();
    expect(castVote(room, "host", "ghost", 1_000_000)).toBe(room);
  });

  it("ignores a vote from someone not in the room", () => {
    const room = setupVoting();
    expect(castVote(room, "intruder", "guest", 1_000_000)).toBe(room);
  });

  it("is a no-op outside the voting phase", () => {
    const room = setupLobby();
    expect(castVote(room, "host", "guest", 1_000_000)).toBe(room);
  });

  it("drops a late vote: resolves the round via expiry instead of applying it", () => {
    const room = setupVoting(10, 1_000_000);
    const afterExpiry = castVote(room, "host", "guest", 1_000_000 + 60_000);
    expect(afterExpiry.phase).toBe("reveal");
    expect(afterExpiry.results[0].votesCast).toBe(0);
    expect(afterExpiry.results[0].winners).toEqual([]);
  });
});

describe("maybeResolveRound", () => {
  it("is a no-op before the voting window expires", () => {
    const room = setupVoting(10, 1_000_000);
    expect(maybeResolveRound(room, 1_000_000 + 1000)).toBe(room);
  });

  it("resolves an all-AFK round at/after expiry instead of getting stuck", () => {
    const room = setupVoting(10, 1_000_000);
    const resolved = maybeResolveRound(room, 1_000_000 + 60_000);
    expect(resolved.phase).toBe("reveal");
    expect(resolved.results[0].winners).toEqual([]);
    expect(resolved.results[0].tally.every((t) => t.votes === 0)).toBe(true);
  });
});

describe("advanceRound", () => {
  function revealedRoom(totalRounds = 10): RoomState {
    let s = setupVoting(totalRounds);
    s = castVote(s, "host", "guest", 1_000_000);
    s = castVote(s, "guest", "guest", 1_000_000);
    return s;
  }

  it("works when called by any player, not just the host", () => {
    const room = revealedRoom();
    const s = advanceRound(room, "guest", 2_000_000);
    expect(s.phase).toBe("voting");
    expect(s.currentRound).toBe(2);
    expect(s.votingEndsAt).toBe(2_000_000 + 60_000);
  });

  it("is idempotent: a second caller after the round already moved on is a no-op", () => {
    const room = revealedRoom();
    const first = advanceRound(room, "host", 2_000_000);
    const second = advanceRound(first, "guest", 3_000_000);
    expect(second).toBe(first);
  });

  it("moves to summary on the last round instead of drawing another statement", () => {
    const room = revealedRoom(1);
    const s = advanceRound(room, "host");
    expect(s.phase).toBe("summary");
  });

  it("is a no-op outside the reveal phase", () => {
    const room = setupVoting();
    expect(advanceRound(room, "host")).toBe(room);
  });

  it("is a no-op for someone not in the room", () => {
    const room = revealedRoom();
    expect(advanceRound(room, "intruder")).toBe(room);
  });
});

describe("finishRoom", () => {
  it("is host-only", () => {
    const room = setupVoting();
    expect(finishRoom(room, "guest")).toBe(room);
  });

  it("works from voting, jumping straight to summary", () => {
    const room = setupVoting();
    const s = finishRoom(room, "host");
    expect(s.phase).toBe("summary");
  });

  it("works from reveal", () => {
    let s = setupVoting();
    s = castVote(s, "host", "guest", 1_000_000);
    s = castVote(s, "guest", "guest", 1_000_000);
    s = finishRoom(s, "host");
    expect(s.phase).toBe("summary");
    expect(s.results).toHaveLength(1);
  });

  it("is a no-op from the lobby", () => {
    const room = setupLobby();
    expect(finishRoom(room, "host")).toBe(room);
  });
});

describe("replayRoom", () => {
  it("is host-only", () => {
    const summary = finishRoom(setupVoting(), "host");
    expect(replayRoom(summary, "guest")).toBe(summary);
  });

  it("resets to the lobby, keeping the same players", () => {
    const summary = finishRoom(setupVoting(), "host");
    const replayed = replayRoom(summary, "host");
    expect(replayed.phase).toBe("lobby");
    expect(replayed.currentRound).toBe(0);
    expect(replayed.results).toHaveLength(0);
    expect(replayed.players).toEqual(summary.players);
  });

  it("is a no-op outside the summary phase", () => {
    const room = setupVoting();
    expect(replayRoom(room, "host")).toBe(room);
  });
});

describe("toView", () => {
  it("never leaks a token and only exposes the viewer's own vote", () => {
    const room = setupVoting();
    const afterHostVote = castVote(room, "host", "guest", 1_000_000);
    const hostView = toView(afterHostVote, "host-token");
    expect(hostView).not.toBeNull();
    expect(hostView!.you).toBe("host");
    expect(hostView!.yourVote).toBe("guest");
    expect(hostView!.votedCount).toBe(1);
    expect(JSON.stringify(hostView)).not.toContain("token");

    const guestView = toView(afterHostVote, "guest-token");
    expect(guestView!.you).toBe("guest");
    expect(guestView!.yourVote).toBeNull(); // never exposes the host's vote
  });

  it("returns null for an unknown token", () => {
    const room = setupVoting();
    expect(toView(room, "nope")).toBeNull();
  });

  it("exposes only public player fields", () => {
    const room = setupLobby();
    const view = toView(room, "host-token");
    expect(view!.players).toEqual([
      { id: "host", name: "Ana" },
      { id: "guest", name: "Luis" },
    ]);
  });

  it("includes a tie-aware finalRanking only once in summary", () => {
    const room = setupVoting();
    const votedView = toView(room, "host-token");
    expect(votedView!.finalRanking).toBeUndefined();

    const summary = finishRoom(room, "host");
    const summaryView = toView(summary, "host-token");
    expect(summaryView!.finalRanking).toEqual([
      { rank: 1, playerId: "host", name: "Ana", totalVotes: 0 },
      { rank: 1, playerId: "guest", name: "Luis", totalVotes: 0 },
    ]);
  });

  it("ranks players by total votes received across rounds, with competition-style ties", () => {
    let room = createRoom("TXQP", "A", "a", "ta", 10);
    room = joinRoom(room, "B", "b", "tb");
    room = joinRoom(room, "C", "c", "tc");
    room = startGame(room, "a", 1_000_000);
    // Round 1: a gets 2 votes, b gets 1, c gets 0.
    room = castVote(room, "a", "a", 1_000_000);
    room = castVote(room, "b", "a", 1_000_000);
    room = castVote(room, "c", "b", 1_000_000);
    room = advanceRound(room, "a", 2_000_000);
    // Round 2: b and c tie at 1 vote each, a gets 0.
    room = castVote(room, "a", "b", 2_000_000);
    room = castVote(room, "b", "b", 2_000_000);
    room = castVote(room, "c", "c", 2_000_000);
    room = finishRoom(room, "a");

    // Round 1 tally: a=2 (voted by a,b), b=1 (voted by c), c=0.
    // Round 2 tally: b=2 (voted by a,b), c=1 (voted by c), a=0.
    // Totals: b=3, a=2, c=1.
    const ranking = computeRankingFromView(room);
    expect(ranking).toEqual([
      { rank: 1, playerId: "b", name: "B", totalVotes: 3 },
      { rank: 2, playerId: "a", name: "A", totalVotes: 2 },
      { rank: 3, playerId: "c", name: "C", totalVotes: 1 },
    ]);
  });
});

function computeRankingFromView(room: RoomState) {
  const view = toView(room, room.players[0].token);
  return view!.finalRanking;
}
