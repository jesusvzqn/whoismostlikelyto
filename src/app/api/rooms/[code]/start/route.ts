import { NextResponse } from "next/server";
import { findPlayer } from "@/lib/online/auth";
import { isOnlineModeEnabled, readRoom, writeRoom } from "@/lib/online/redis";
import { MIN_PLAYERS } from "@/lib/online/types";
import { startGame, toView } from "@/lib/online/room";
import { normalizeCode } from "@/lib/online/validate";

export async function POST(
  req: Request,
  { params }: { params: { code: string } }
) {
  if (!isOnlineModeEnabled()) {
    return NextResponse.json({ error: "Online mode disabled" }, { status: 404 });
  }

  const code = normalizeCode(params.code);
  if (!code) {
    return NextResponse.json({ error: "Invalid room code" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const token = body?.token;
  if (typeof token !== "string") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const room = await readRoom(code);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  const player = findPlayer(room, token);
  if (!player) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (player.id !== room.hostId) {
    return NextResponse.json({ error: "Only the host can start the game" }, { status: 403 });
  }
  if (room.phase !== "lobby") {
    return NextResponse.json({ error: "Game already started" }, { status: 409 });
  }
  if (room.players.length < MIN_PLAYERS) {
    return NextResponse.json(
      { error: `Need at least ${MIN_PLAYERS} players to start` },
      { status: 409 }
    );
  }

  const updated = startGame(room, player.id);
  await writeRoom(updated);

  return NextResponse.json(toView(updated, token));
}
