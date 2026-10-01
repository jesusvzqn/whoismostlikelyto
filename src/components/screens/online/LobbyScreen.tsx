"use client";

import { useState } from "react";
import { BigButton } from "@/components/ui/BigButton";
import { ScreenShell } from "@/components/ui/ScreenShell";
import { MAX_PLAYERS, MIN_PLAYERS } from "@/lib/online/types";
import type { RoomView } from "@/lib/online/types";

export function LobbyScreen({
  view,
  onStart,
}: {
  view: RoomView;
  onStart: () => Promise<void>;
}) {
  const [pending, setPending] = useState(false);

  async function handleStart() {
    if (pending) return;
    setPending(true);
    try {
      await onStart();
    } finally {
      setPending(false);
    }
  }

  const canStart = view.players.length >= MIN_PLAYERS;

  return (
    <ScreenShell>
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-surface p-6 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-foreground/50">
          Room code
        </p>
        <p className="text-4xl font-extrabold tracking-[0.3em] text-primary">
          {view.code}
        </p>
        <p className="text-sm text-foreground/60">
          Share this code with your team so they can join.
        </p>
      </div>

      <div className="rounded-2xl bg-surface p-5 shadow-sm">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground/50">
          Players ({view.players.length}/{MAX_PLAYERS})
        </p>
        <ul className="flex flex-col gap-2">
          {view.players.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-xl bg-background px-4 py-2 text-base font-semibold"
            >
              <span>
                {p.name}
                {p.id === view.you ? " (you)" : ""}
              </span>
              {p.id === view.hostId && (
                <span className="text-xs font-bold uppercase tracking-wide text-primary">
                  Host
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {view.isHost ? (
        <BigButton disabled={!canStart || pending} onClick={handleStart}>
          {pending
            ? "Starting..."
            : canStart
              ? `Start game (${view.players.length} players)`
              : `Waiting for at least ${MIN_PLAYERS} players`}
        </BigButton>
      ) : (
        <p className="text-center text-sm text-foreground/60">
          Waiting for other players...
        </p>
      )}
    </ScreenShell>
  );
}
