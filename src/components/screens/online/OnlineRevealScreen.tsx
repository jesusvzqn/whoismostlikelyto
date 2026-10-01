"use client";

import { RevealCard } from "@/components/screens/shared/RevealCard";
import type { RoomView } from "@/lib/online/types";

export function OnlineRevealScreen({
  view,
  onAdvance,
  onFinish,
}: {
  view: RoomView;
  onAdvance: () => void;
  onFinish: () => void;
}) {
  const lastResult = view.results[view.results.length - 1];
  if (!lastResult) return null;

  const isLastRound = view.currentRound >= view.totalRounds;

  return (
    <RevealCard
      players={view.players}
      lastResult={lastResult}
      isLastRound={isLastRound}
      isHost={view.isHost}
      onContinue={onAdvance}
      onFinish={onFinish}
    />
  );
}
