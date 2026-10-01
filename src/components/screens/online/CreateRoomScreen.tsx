"use client";

import { useState } from "react";
import { BigButton } from "@/components/ui/BigButton";
import { RoundsWheel } from "@/components/ui/RoundsWheel";
import { ScreenShell } from "@/components/ui/ScreenShell";
import { MAX_NAME_LENGTH, MAX_ROUNDS, MIN_ROUNDS } from "@/lib/online/types";

export function CreateRoomScreen({
  onCreate,
  pending,
  error,
  onBack,
}: {
  onCreate: (hostName: string, totalRounds: number) => void;
  pending: boolean;
  error: string | null;
  onBack: () => void;
}) {
  const [name, setName] = useState("");
  const [rounds, setRounds] = useState(MIN_ROUNDS);
  const [touched, setTouched] = useState(false);

  const trimmed = name.trim();
  const isValid = trimmed.length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!isValid || pending) return;
    onCreate(trimmed, rounds);
  }

  return (
    <ScreenShell>
      <h2 className="text-center text-2xl font-extrabold">Create room</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Your name
          <input
            type="text"
            value={name}
            maxLength={MAX_NAME_LENGTH}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="rounded-xl border-2 border-foreground/10 bg-surface px-4 py-3 text-base font-normal focus:border-primary focus:outline-none"
          />
        </label>

        {touched && !isValid && (
          <div className="rounded-xl bg-red-500/10 px-4 py-2 text-sm text-red-600">
            Enter your name.
          </div>
        )}

        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">Number of rounds</span>
          <RoundsWheel
            min={MIN_ROUNDS}
            max={MAX_ROUNDS}
            value={rounds}
            onChange={setRounds}
          />
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 px-4 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <BigButton type="submit" disabled={pending}>
          {pending ? "Creating..." : "Create room"}
        </BigButton>
        <BigButton type="button" variant="ghost" onClick={onBack}>
          Back
        </BigButton>
      </form>
    </ScreenShell>
  );
}
