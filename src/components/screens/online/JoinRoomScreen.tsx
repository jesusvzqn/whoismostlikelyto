"use client";

import { useState } from "react";
import { BigButton } from "@/components/ui/BigButton";
import { ScreenShell } from "@/components/ui/ScreenShell";
import { MAX_NAME_LENGTH } from "@/lib/online/types";

const CODE_LENGTH = 4;

export function JoinRoomScreen({
  initialCode,
  onJoin,
  pending,
  error,
  onBack,
}: {
  initialCode?: string;
  onJoin: (code: string, name: string) => void;
  pending: boolean;
  error: string | null;
  onBack: () => void;
}) {
  const [code, setCode] = useState(initialCode ?? "");
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);

  const trimmedName = name.trim();
  const normalizedCode = code.trim().toUpperCase();
  const isValid = trimmedName.length > 0 && normalizedCode.length === CODE_LENGTH;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!isValid || pending) return;
    onJoin(normalizedCode, trimmedName);
  }

  return (
    <ScreenShell>
      <h2 className="text-center text-2xl font-extrabold">Join a room</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Room code
          <input
            type="text"
            value={code}
            maxLength={CODE_LENGTH}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABCD"
            autoCapitalize="characters"
            className="rounded-xl border-2 border-foreground/10 bg-surface px-4 py-3 text-center text-2xl font-bold uppercase tracking-[0.3em] focus:border-primary focus:outline-none"
          />
        </label>

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
            Enter your name and a 4-letter code.
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-500/10 px-4 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <BigButton type="submit" disabled={pending}>
          {pending ? "Joining..." : "Join"}
        </BigButton>
        <BigButton type="button" variant="ghost" onClick={onBack}>
          Back
        </BigButton>
      </form>
    </ScreenShell>
  );
}
