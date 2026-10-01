"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearOnlineSession,
  loadOnlineSession,
  saveOnlineSession,
} from "@/lib/storage";
import type { PlayerId, RoomView } from "./types";

const POLL_INTERVAL_MS = 1500;

type Status = "idle" | "working" | "reconnecting" | "ready" | "error";

type OnlineRoomState = {
  code: string | null;
  token: string | null;
  view: RoomView | null;
  status: Status;
  error: string | null;
};

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error ?? "Something went wrong");
  }
  return data as T;
}

export function useOnlineRoom() {
  const [state, setState] = useState<OnlineRoomState>(() => {
    const session = loadOnlineSession();
    return {
      code: session?.code ?? null,
      token: session?.token ?? null,
      view: null,
      status: session ? "reconnecting" : "idle",
      error: null,
    };
  });

  const mutatingRef = useRef(false);

  const { code, token } = state;

  const poll = useCallback(
    async (signal?: AbortSignal) => {
      if (!code || !token) return;
      try {
        const res = await fetch(
          `/api/rooms/${code}?token=${encodeURIComponent(token)}`,
          { signal }
        );
        const view = await parseJsonResponse<RoomView>(res);
        setState((s) => (s.code === code ? { ...s, view, status: "ready", error: null } : s));
      } catch {
        if (signal?.aborted) return;
        clearOnlineSession();
        // Whether this is the very first reconnect attempt (resuming a
        // session from a previous visit) or a later poll, a failure here
        // means the room is gone (expired, finished, or never existed) —
        // always surface a clear message and let the player choose to head
        // back to the home screen, instead of silently bouncing them.
        setState((s) =>
          s.code !== code
            ? s
            : { ...s, status: "error", error: "This room no longer exists." }
        );
      }
    },
    [code, token]
  );

  useEffect(() => {
    if (!code || !token) return;
    const controller = new AbortController();
    poll(controller.signal);
    const interval = setInterval(() => {
      if (mutatingRef.current) return;
      poll(controller.signal);
    }, POLL_INTERVAL_MS);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [code, token, poll]);

  const createRoom = useCallback(async (hostName: string) => {
    setState((s) => ({ ...s, status: "working", error: null }));
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ hostName }),
      });
      const data = await parseJsonResponse<{ code: string; token: string; view: RoomView }>(res);
      saveOnlineSession({ code: data.code, token: data.token });
      setState({ code: data.code, token: data.token, view: data.view, status: "ready", error: null });
    } catch (err) {
      setState((s) => ({ ...s, status: "error", error: err instanceof Error ? err.message : "Error" }));
    }
  }, []);

  const joinRoom = useCallback(async (joinCode: string, name: string) => {
    setState((s) => ({ ...s, status: "working", error: null }));
    try {
      const res = await fetch(`/api/rooms/${joinCode}/join`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await parseJsonResponse<{ token: string; view: RoomView }>(res);
      saveOnlineSession({ code: joinCode, token: data.token });
      setState({ code: joinCode, token: data.token, view: data.view, status: "ready", error: null });
    } catch (err) {
      setState((s) => ({ ...s, status: "error", error: err instanceof Error ? err.message : "Error" }));
    }
  }, []);

  const mutate = useCallback(
    async (path: string, extraBody: Record<string, unknown> = {}) => {
      if (!code || !token) return;
      mutatingRef.current = true;
      try {
        const res = await fetch(`/api/rooms/${code}/${path}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token, ...extraBody }),
        });
        const view = await parseJsonResponse<RoomView>(res);
        setState((s) => (s.code === code ? { ...s, view, status: "ready", error: null } : s));
      } catch (err) {
        setState((s) =>
          s.code === code
            ? { ...s, status: "error", error: err instanceof Error ? err.message : "Error" }
            : s
        );
      } finally {
        mutatingRef.current = false;
      }
    },
    [code, token]
  );

  const startGame = useCallback(() => mutate("start"), [mutate]);
  const castVote = useCallback(
    (candidateId: PlayerId) => mutate("vote", { candidateId }),
    [mutate]
  );
  const advance = useCallback(() => mutate("advance"), [mutate]);
  const replay = useCallback(() => mutate("replay"), [mutate]);
  const finish = useCallback(() => mutate("finish"), [mutate]);

  const reset = useCallback(() => {
    clearOnlineSession();
    setState({ code: null, token: null, view: null, status: "idle", error: null });
  }, []);

  return {
    code: state.code,
    view: state.view,
    status: state.status,
    error: state.error,
    createRoom,
    joinRoom,
    startGame,
    castVote,
    advance,
    replay,
    finish,
    reset,
  };
}
