"use client";

import { BigButton } from "@/components/ui/BigButton";
import { ScreenShell } from "@/components/ui/ScreenShell";
import { MAX_PLAYERS, TOTAL_ROUNDS } from "@/lib/online/types";

const RULES = [
  'Each round shows a prompt: "Who\'s most likely to...?"',
  `Create a room and share the code with up to ${MAX_PLAYERS - 1} other people (${MAX_PLAYERS} total). You, the host, decide when the lobby closes and the game begins.`,
  "Vote for anyone, including yourself — just confirm before your vote is locked in.",
  "You have 60 seconds to vote each round. Miss the window and your vote simply doesn't count.",
  "Everyone sees the full vote tally after each round, ties and all. Nobody ever sees who voted for whom.",
  `The game runs for ${TOTAL_ROUNDS} rounds, then a final ranking shows who racked up the most votes overall.`,
];

export function RulesScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <ScreenShell>
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-primary">
          Who&rsquo;s most likely to...?
        </h1>
        <p className="mt-2 text-foreground/70">A party game for the team</p>
      </div>

      <ol className="flex flex-col gap-3 rounded-2xl bg-surface p-5 shadow-sm">
        {RULES.map((rule, i) => (
          <li key={i} className="flex gap-3 text-sm leading-relaxed">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
              {i + 1}
            </span>
            {rule}
          </li>
        ))}
      </ol>

      <BigButton onClick={onContinue}>Start</BigButton>
    </ScreenShell>
  );
}
