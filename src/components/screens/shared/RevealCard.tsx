"use client";

import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { BigButton } from "@/components/ui/BigButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ScreenShell } from "@/components/ui/ScreenShell";
import type { PlayerPublic, RoundResult } from "@/lib/online/types";

export function RevealCard({
  players,
  lastResult,
  isLastRound,
  isHost,
  onContinue,
  onFinish,
}: {
  players: PlayerPublic[];
  lastResult: RoundResult;
  isLastRound: boolean;
  isHost: boolean;
  onContinue: () => void;
  onFinish?: () => void;
}) {
  const [suspense, setSuspense] = useState(true);
  const [confirmingFinish, setConfirmingFinish] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSuspense(false), 900);
    return () => clearTimeout(timer);
  }, [lastResult]);

  useEffect(() => {
    if (!suspense && lastResult.winners.length > 0) {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
        disableForReducedMotion: true,
      });
    }
  }, [suspense, lastResult]);

  const nameById = new Map(players.map((p) => [p.id, p.name]));
  const sortedTally = [...lastResult.tally].sort((a, b) => b.votes - a.votes);

  return (
    <ScreenShell>
      <div className="flex min-h-[16rem] flex-col items-center justify-center gap-4 rounded-2xl bg-surface p-6 text-center shadow-sm">
        {suspense ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
            className="text-4xl"
          >
            🔮
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex w-full flex-col gap-2"
          >
            {lastResult.winners.length === 0 ? (
              <p className="text-lg font-semibold text-foreground/70">
                Nobody voted in time!
              </p>
            ) : (
              <p className="text-lg font-extrabold text-primary">
                {lastResult.winners.length > 1
                  ? "It's a tie! 🎉"
                  : "Most voted! 🎉"}
              </p>
            )}
            <ul className="flex flex-col gap-1.5 text-left">
              {sortedTally.map((t) => {
                const isWinner = lastResult.winners.includes(t.candidateId);
                return (
                  <li
                    key={t.candidateId}
                    className={`flex items-center justify-between rounded-xl px-3 py-2 ${
                      isWinner
                        ? "bg-primary/15 font-bold text-primary"
                        : "bg-background"
                    }`}
                  >
                    <span>
                      {isWinner ? "🏆 " : ""}
                      {nameById.get(t.candidateId) ?? "?"}
                    </span>
                    <span>
                      {t.votes} {t.votes === 1 ? "vote" : "votes"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </div>

      {!suspense && (
        <BigButton onClick={onContinue}>
          {isLastRound ? "See results" : "Next round"}
        </BigButton>
      )}

      {!suspense && !isLastRound && isHost && onFinish && (
        <BigButton variant="ghost" onClick={() => setConfirmingFinish(true)}>
          Finish game
        </BigButton>
      )}

      {confirmingFinish && onFinish && (
        <ConfirmDialog
          title="Finish the game?"
          message="The game will end right now and everyone will see the summary with the rounds played so far."
          confirmLabel="Yes, finish"
          onConfirm={onFinish}
          onCancel={() => setConfirmingFinish(false)}
        />
      )}
    </ScreenShell>
  );
}
