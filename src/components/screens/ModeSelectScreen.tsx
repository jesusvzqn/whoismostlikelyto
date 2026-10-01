"use client";

import { BigButton } from "@/components/ui/BigButton";
import { ScreenShell } from "@/components/ui/ScreenShell";

export function ModeSelectScreen({
  onCreate,
  onJoin,
  onBack,
}: {
  onCreate: () => void;
  onJoin: () => void;
  onBack: () => void;
}) {
  return (
    <ScreenShell>
      <div className="text-center">
        <h2 className="text-2xl font-extrabold">Ready to play?</h2>
        <p className="mt-2 text-sm text-foreground/60">
          Create a room and share the code, or join one someone else made.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <BigButton onClick={onCreate}>Create room</BigButton>
        <BigButton variant="secondary" onClick={onJoin}>
          Join room
        </BigButton>
        <BigButton variant="ghost" onClick={onBack}>
          Back
        </BigButton>
      </div>
    </ScreenShell>
  );
}
