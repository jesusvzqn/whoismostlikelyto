"use client";

import { CreateRoomScreen } from "@/components/screens/online/CreateRoomScreen";
import { JoinRoomScreen } from "@/components/screens/online/JoinRoomScreen";
import { LobbyScreen } from "@/components/screens/online/LobbyScreen";
import { OnlineRevealScreen } from "@/components/screens/online/OnlineRevealScreen";
import { OnlineRoundScreen } from "@/components/screens/online/OnlineRoundScreen";
import { OnlineSummaryScreen } from "@/components/screens/online/OnlineSummaryScreen";
import { WaitingScreen } from "@/components/screens/online/WaitingScreen";
import { BigButton } from "@/components/ui/BigButton";
import { ScreenShell } from "@/components/ui/ScreenShell";
import { useOnlineRoom } from "@/lib/online/useOnlineRoom";

export function OnlineGame({
  mode,
  initialCode,
  onExitToMenu,
}: {
  mode: "create" | "join";
  initialCode?: string;
  onExitToMenu: () => void;
}) {
  const room = useOnlineRoom();

  if (!room.code) {
    return mode === "create" ? (
      <CreateRoomScreen
        onCreate={room.createRoom}
        pending={room.status === "working"}
        error={room.error}
        onBack={onExitToMenu}
      />
    ) : (
      <JoinRoomScreen
        initialCode={initialCode}
        onJoin={room.joinRoom}
        pending={room.status === "working"}
        error={room.error}
        onBack={onExitToMenu}
      />
    );
  }

  if (room.status === "error") {
    return (
      <ScreenShell>
        <div className="rounded-2xl bg-surface p-6 text-center shadow-sm">
          <p className="text-lg font-semibold">
            {room.error ?? "This room no longer exists."}
          </p>
        </div>
        <BigButton
          onClick={() => {
            room.reset();
            onExitToMenu();
          }}
        >
          Back to menu
        </BigButton>
      </ScreenShell>
    );
  }

  const { view } = room;
  if (!view) {
    return (
      <WaitingScreen
        message={room.status === "reconnecting" ? "Reconnecting..." : "Connecting..."}
      />
    );
  }

  if (view.phase === "lobby") {
    return <LobbyScreen view={view} onStart={room.startGame} />;
  }

  if (view.phase === "voting") {
    if (view.yourVote !== null) {
      return (
        <WaitingScreen
          message={`Waiting for other votes... (${view.votedCount}/${view.players.length})`}
        />
      );
    }
    return <OnlineRoundScreen view={view} onVote={room.castVote} />;
  }

  if (view.phase === "reveal") {
    return (
      <OnlineRevealScreen view={view} onAdvance={room.advance} onFinish={room.finish} />
    );
  }

  return (
    <OnlineSummaryScreen
      view={view}
      onReplay={room.replay}
      onExitToMenu={() => {
        room.reset();
        onExitToMenu();
      }}
    />
  );
}
