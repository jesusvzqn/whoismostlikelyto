"use client";

import { useEffect, useState } from "react";
import { BigButton } from "@/components/ui/BigButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ScreenShell } from "@/components/ui/ScreenShell";
import { VOTE_DURATION_MS } from "@/lib/online/types";
import type { PlayerId, RoomView } from "@/lib/online/types";

export function OnlineRoundScreen({
  view,
  onVote,
}: {
  view: RoomView;
  onVote: (candidateId: PlayerId) => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState<PlayerId | null>(null);
  const [remainingMs, setRemainingMs] = useState(VOTE_DURATION_MS);

  // The server is the sole authority on when voting closes; this only
  // smooths the countdown display between ~1.5s polls using a
  // drift-corrected clock, and self-corrects on every fresh poll.
  useEffect(() => {
    const votingEndsAt = view.votingEndsAt;
    if (votingEndsAt === null) return;
    const clockOffsetMs = view.serverNow - Date.now();
    const tick = () => {
      setRemainingMs(Math.max(0, votingEndsAt + clockOffsetMs - Date.now()));
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [view.votingEndsAt, view.serverNow]);

  if (!view.currentStatement) return null;

  async function handleConfirm() {
    if (pending || !confirming) return;
    setPending(true);
    try {
      await onVote(confirming);
    } finally {
      setPending(false);
      setConfirming(null);
    }
  }

  const confirmingPlayer = view.players.find((p) => p.id === confirming);
  const seconds = Math.ceil(remainingMs / 1000);
  const expired = remainingMs <= 0;

  return (
    <ScreenShell size="wide">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-foreground/50">
            Round {view.currentRound} of {view.totalRounds}
          </p>
          <ProgressBar progress={(view.currentRound - 1) / view.totalRounds} />
        </div>

        <div className="rounded-2xl bg-surface p-6 text-center shadow-sm">
          <h2 className="text-lg font-bold text-primary">
            Who&rsquo;s most likely to...?
          </h2>
          <p className="mt-2 text-xl font-semibold">{view.currentStatement}</p>
        </div>

        <div className="text-center">
          <p className="text-sm text-foreground/60">
            {expired ? "Time's up" : `${seconds}s left`}
          </p>
          <ProgressBar progress={remainingMs / VOTE_DURATION_MS} />
        </div>

        <p className="text-center text-sm text-foreground/60">
          Vote ({view.votedCount}/{view.players.length} voted)
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {view.players.map((p) => (
          <BigButton
            key={p.id}
            variant={p.id === view.you ? "secondary" : "primary"}
            disabled={pending || expired}
            onClick={() => setConfirming(p.id)}
          >
            {p.name}
            {p.id === view.you ? " (you)" : ""}
          </BigButton>
        ))}
      </div>

      {confirmingPlayer && (
        <ConfirmDialog
          title="Confirm your vote"
          message={`Vote for ${confirmingPlayer.name}${
            confirmingPlayer.id === view.you ? " (yourself)" : ""
          }?`}
          confirmLabel="Confirm vote"
          cancelLabel="Cancel"
          onConfirm={handleConfirm}
          onCancel={() => setConfirming(null)}
        />
      )}
    </ScreenShell>
  );
}
