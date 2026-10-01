"use client";

import { useEffect, useState } from "react";
import { OnlineGame } from "@/components/OnlineGame";
import { ModeSelectScreen } from "@/components/screens/ModeSelectScreen";
import { RulesScreen } from "@/components/screens/RulesScreen";
import { WaitingScreen } from "@/components/screens/online/WaitingScreen";
import { ScreenShell } from "@/components/ui/ScreenShell";
import { loadOnlineSession } from "@/lib/storage";
import { useOnlineEnabled } from "@/lib/online/useOnlineEnabled";

type Stage =
  | { name: "rules" }
  | { name: "mode-select" }
  | { name: "online"; mode: "create" | "join" };

export function PreGameFlow({ initialJoinCode }: { initialJoinCode?: string }) {
  const onlineEnabled = useOnlineEnabled();
  const [stage, setStage] = useState<Stage>({ name: "rules" });

  // Resuming an existing session (someone accidentally closed the tab,
  // refreshed, or lost connection) takes priority over the rules/mode-select
  // screens — jump straight back into the room. Done in an effect rather
  // than the initial state so the server-rendered first paint (which can't
  // read localStorage) always matches the client's first render.
  useEffect(() => {
    if (loadOnlineSession()) {
      setStage({ name: "online", mode: "join" });
    }
  }, []);

  if (onlineEnabled === null) {
    return <WaitingScreen message="Loading..." />;
  }

  if (!onlineEnabled) {
    return (
      <ScreenShell>
        <div className="rounded-2xl bg-surface p-6 text-center shadow-sm">
          <p className="text-lg font-semibold">
            Online play isn&rsquo;t configured for this deployment yet.
          </p>
        </div>
      </ScreenShell>
    );
  }

  if (stage.name === "rules") {
    return (
      <RulesScreen
        onContinue={() =>
          setStage(
            initialJoinCode ? { name: "online", mode: "join" } : { name: "mode-select" }
          )
        }
      />
    );
  }

  if (stage.name === "mode-select") {
    return (
      <ModeSelectScreen
        onCreate={() => setStage({ name: "online", mode: "create" })}
        onJoin={() => setStage({ name: "online", mode: "join" })}
        onBack={() => setStage({ name: "rules" })}
      />
    );
  }

  return (
    <OnlineGame
      mode={stage.mode}
      initialCode={initialJoinCode}
      onExitToMenu={() => setStage({ name: "mode-select" })}
    />
  );
}
