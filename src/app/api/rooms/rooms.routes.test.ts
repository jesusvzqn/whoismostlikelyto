import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, unknown>();

vi.mock("@upstash/redis", () => {
  class FakeRedis {
    static fromEnv() {
      return new FakeRedis();
    }
    async get(key: string) {
      return store.has(key) ? store.get(key) : null;
    }
    async set(key: string, value: unknown) {
      store.set(key, value);
    }
  }
  return { Redis: FakeRedis };
});

import { GET as configRoute } from "@/app/api/config/route";
import { POST as createRoute } from "@/app/api/rooms/route";
import { GET as pollRoute } from "@/app/api/rooms/[code]/route";
import { POST as advanceRoute } from "@/app/api/rooms/[code]/advance/route";
import { POST as finishRoute } from "@/app/api/rooms/[code]/finish/route";
import { POST as joinRoute } from "@/app/api/rooms/[code]/join/route";
import { POST as startRoute } from "@/app/api/rooms/[code]/start/route";
import { POST as voteRoute } from "@/app/api/rooms/[code]/vote/route";
import { MAX_PLAYERS } from "@/lib/online/types";

function postJson(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

async function createTestRoom() {
  const res = await createRoute(
    postJson("http://x/api/rooms", { hostName: "Ana" })
  );
  return (await res.json()) as { code: string; token: string };
}

async function joinTestRoom(code: string, name: string) {
  const res = await joinRoute(postJson(`http://x/api/rooms/${code}/join`, { name }), {
    params: { code },
  });
  return { status: res.status, body: await res.json() };
}

beforeEach(() => {
  store.clear();
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
});

describe("/api/config", () => {
  it("reports enabled when Redis env vars are set", async () => {
    const res = await configRoute();
    expect(await res.json()).toEqual({ onlineEnabled: true });
  });

  it("reports disabled when Redis env vars are missing", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    const res = await configRoute();
    expect(await res.json()).toEqual({ onlineEnabled: false });
  });

  it("also works with Vercel's KV_REST_API_* naming", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    process.env.KV_REST_API_URL = "https://example.upstash.io";
    process.env.KV_REST_API_TOKEN = "test-token";
    const res = await configRoute();
    expect(await res.json()).toEqual({ onlineEnabled: true });
  });
});

describe("room routes wiring", () => {
  it("404s every route when online mode is disabled", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    const res = await createRoute(
      postJson("http://x/api/rooms", { hostName: "Ana" })
    );
    expect(res.status).toBe(404);
  });

  it("400s room creation on invalid input", async () => {
    const res = await createRoute(
      postJson("http://x/api/rooms", { hostName: "" })
    );
    expect(res.status).toBe(400);
  });

  it("404s joining a room that doesn't exist", async () => {
    const res = await joinRoute(
      postJson("http://x/api/rooms/ZZZZ/join", { name: "Luis" }),
      { params: { code: "ZZZZ" } }
    );
    expect(res.status).toBe(404);
  });

  it("supports a full multi-player flow: create, join, host-only start, vote, reveal, advance, finish", async () => {
    const { code, token: hostToken } = await createTestRoom();

    const joinLuis = await joinTestRoom(code, "Luis");
    const joinMia = await joinTestRoom(code, "Mia");
    expect(joinLuis.status).toBe(200);
    expect(joinMia.status).toBe(200);
    const guestToken = joinLuis.body.token as string;
    const thirdToken = joinMia.body.token as string;

    const hostPoll = await pollRoute(
      new Request(`http://x/api/rooms/${code}?token=${hostToken}`),
      { params: { code } }
    );
    const hostView = await hostPoll.json();
    expect(hostView.phase).toBe("lobby");
    expect(hostView.players).toHaveLength(3);

    // A non-host cannot start the game.
    const guestStart = await startRoute(
      postJson(`http://x/api/rooms/${code}/start`, { token: guestToken }),
      { params: { code } }
    );
    expect(guestStart.status).toBe(403);

    const hostStart = await startRoute(
      postJson(`http://x/api/rooms/${code}/start`, { token: hostToken }),
      { params: { code } }
    );
    expect(hostStart.status).toBe(200);
    const startedView = await hostStart.json();
    expect(startedView.phase).toBe("voting");

    // Wrong/unknown token is rejected, not leaked as a 200.
    const badPoll = await pollRoute(
      new Request(`http://x/api/rooms/${code}?token=nope`),
      { params: { code } }
    );
    expect(badPoll.status).toBe(404);

    // Host votes for themselves (self-votes are allowed).
    const hostVote = await voteRoute(
      postJson(`http://x/api/rooms/${code}/vote`, {
        token: hostToken,
        candidateId: startedView.you,
      }),
      { params: { code } }
    );
    expect(hostVote.status).toBe(200);
    expect((await hostVote.json()).phase).toBe("voting"); // still waiting on two more

    // A token that isn't part of this room cannot vote on someone's behalf.
    const forbiddenVote = await voteRoute(
      postJson(`http://x/api/rooms/${code}/vote`, {
        token: "intruder",
        candidateId: startedView.you,
      }),
      { params: { code } }
    );
    expect(forbiddenVote.status).toBe(403);

    await voteRoute(
      postJson(`http://x/api/rooms/${code}/vote`, {
        token: guestToken,
        candidateId: startedView.you,
      }),
      { params: { code } }
    );
    const lastVoteRes = await voteRoute(
      postJson(`http://x/api/rooms/${code}/vote`, {
        token: thirdToken,
        candidateId: startedView.you,
      }),
      { params: { code } }
    );
    const revealed = await lastVoteRes.json();
    expect(revealed.phase).toBe("reveal");
    expect(revealed.results[0].votesCast).toBe(3);
    expect(revealed.results[0].winners).toEqual([startedView.you]);
    // Full tally is visible, but never who cast which vote or any token.
    expect(revealed.results[0].tally).toHaveLength(3);
    expect(JSON.stringify(revealed)).not.toContain("token");

    // Advancing is not host-gated — a guest can move the round along.
    const guestAdvance = await advanceRoute(
      postJson(`http://x/api/rooms/${code}/advance`, { token: guestToken }),
      { params: { code } }
    );
    const guestAdvanceView = await guestAdvance.json();
    expect(guestAdvanceView.phase).toBe("voting");
    expect(guestAdvanceView.currentRound).toBe(2);

    // Finishing is host-only.
    const guestFinish = await finishRoute(
      postJson(`http://x/api/rooms/${code}/finish`, { token: guestToken }),
      { params: { code } }
    );
    expect(guestFinish.status).toBe(403);

    const hostFinish = await finishRoute(
      postJson(`http://x/api/rooms/${code}/finish`, { token: hostToken }),
      { params: { code } }
    );
    expect(hostFinish.status).toBe(200);
    const finishedView = await hostFinish.json();
    expect(finishedView.phase).toBe("summary");
    expect(finishedView.finalRanking).toBeDefined();

    // Every other player's next poll picks up the same summary, without acting.
    const guestPollRes = await pollRoute(
      new Request(`http://x/api/rooms/${code}?token=${guestToken}`),
      { params: { code } }
    );
    expect((await guestPollRes.json()).phase).toBe("summary");
  });

  it("rejects joining once the room is full, distinct from 'already started'", async () => {
    const { code } = await createTestRoom();
    for (let i = 1; i < MAX_PLAYERS; i++) {
      const res = await joinTestRoom(code, `Player${i}`);
      expect(res.status).toBe(200);
    }
    const overflow = await joinRoute(
      postJson(`http://x/api/rooms/${code}/join`, { name: "Overflow" }),
      { params: { code } }
    );
    expect(overflow.status).toBe(409);
    expect((await overflow.json()).error).toBe("Room is full");
  });

  it("rejects joining once the game has started, distinct from 'full'", async () => {
    const { code, token: hostToken } = await createTestRoom();
    await joinTestRoom(code, "Luis");
    await startRoute(postJson(`http://x/api/rooms/${code}/start`, { token: hostToken }), {
      params: { code },
    });

    const lateJoin = await joinRoute(
      postJson(`http://x/api/rooms/${code}/join`, { name: "TooLate" }),
      { params: { code } }
    );
    expect(lateJoin.status).toBe(409);
    expect((await lateJoin.json()).error).toBe("Game already started");
  });

  it("auto-resolves an expired voting round on the next poll, with no vote call", async () => {
    const { code, token: hostToken } = await createTestRoom();
    await joinTestRoom(code, "Luis");
    const startRes = await startRoute(
      postJson(`http://x/api/rooms/${code}/start`, { token: hostToken }),
      { params: { code } }
    );
    const startedView = await startRes.json();

    // Back-date the room's voting window so it's already expired.
    const stored = store.get(`room:${code}`) as { votingEndsAt: number };
    stored.votingEndsAt = Date.now() - 1000;
    store.set(`room:${code}`, stored);

    const pollRes = await pollRoute(
      new Request(`http://x/api/rooms/${code}?token=${hostToken}`),
      { params: { code } }
    );
    const view = await pollRes.json();
    expect(view.phase).toBe("reveal");
    expect(view.results[0].votesCast).toBe(0);
    expect(view.currentRound).toBe(startedView.currentRound);
  });
});
