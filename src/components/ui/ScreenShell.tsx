"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function ScreenShell({
  size = "normal",
  children,
}: {
  /** "wide" gives gameplay screens (lobby/round/reveal/summary) room for up
   * to MAX_PLAYERS names on a laptop-sized viewport; forms stay "normal". */
  size?: "normal" | "wide";
  children: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
      className="flex min-h-[100dvh] w-full flex-col items-center justify-center px-4 py-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]"
    >
      <div
        className={`flex w-full flex-col gap-6 ${size === "wide" ? "max-w-3xl" : "max-w-sm"}`}
      >
        {children}
      </div>
    </motion.div>
  );
}
