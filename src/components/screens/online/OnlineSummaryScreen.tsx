"use client";

import { SummaryCard } from "@/components/screens/shared/SummaryCard";
import { BigButton } from "@/components/ui/BigButton";
import { ScreenShell } from "@/components/ui/ScreenShell";
import type { RoomView } from "@/lib/online/types";

export function OnlineSummaryScreen({
  view,
  onReplay,
  onExitToMenu,
}: {
  view: RoomView;
  onReplay: () => void;
  onExitToMenu: () => void;
}) {
  if (!view.finalRanking) return null;

  return (
    <ScreenShell>
      <SummaryCard
        players={view.players}
        ranking={view.finalRanking}
        results={view.results}
      />

      <div className="flex flex-col gap-3">
        {view.isHost ? (
          <BigButton onClick={onReplay}>Play again</BigButton>
        ) : (
          <p className="text-center text-sm text-foreground/60">
            Waiting for the host to start a new game...
          </p>
        )}
        <BigButton variant="secondary" onClick={onExitToMenu}>
          Exit
        </BigButton>
      </div>
    </ScreenShell>
  );
}
