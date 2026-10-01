"use client";

import type { PlayerPublic, RankingEntry, RoundResult } from "@/lib/online/types";

export function SummaryCard({
  players,
  ranking,
  results,
}: {
  players: PlayerPublic[];
  ranking: RankingEntry[];
  results: RoundResult[];
}) {
  const nameById = new Map(players.map((p) => [p.id, p.name]));

  return (
    <>
      <div className="text-center">
        <h2 className="text-2xl font-extrabold">Final ranking</h2>
        <p className="mt-1 text-sm text-foreground/60">
          Most votes received across {results.length}{" "}
          {results.length === 1 ? "round" : "rounds"}
        </p>
      </div>

      <div className="rounded-2xl bg-surface p-4 shadow-sm">
        <ul className="flex flex-col gap-2">
          {ranking.map((entry) => (
            <li
              key={entry.playerId}
              className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                entry.rank === 1
                  ? "bg-primary/15 font-bold text-primary"
                  : "bg-background"
              }`}
            >
              <span>
                {entry.rank === 1 ? "🏆 " : `#${entry.rank} `}
                {entry.name}
              </span>
              <span>
                {entry.totalVotes} {entry.totalVotes === 1 ? "vote" : "votes"}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="max-h-64 overflow-y-auto rounded-2xl bg-surface p-4 shadow-sm">
        <ul className="flex flex-col gap-3 text-sm">
          {results.map((r) => (
            <li
              key={r.round}
              className="border-b border-foreground/5 pb-2 last:border-0 last:pb-0"
            >
              <p className="font-semibold">Round {r.round}</p>
              <p className="text-foreground/60">{r.statement}</p>
              <p className="text-foreground/50">
                {r.winners.length === 0
                  ? "Nobody voted"
                  : `Most voted: ${r.winners
                      .map((id) => nameById.get(id) ?? "?")
                      .join(", ")}`}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
