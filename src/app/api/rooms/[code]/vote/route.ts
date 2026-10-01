import { NextResponse } from "next/server";
import { findPlayer } from "@/lib/online/auth";
import { isOnlineModeEnabled, readRoom, writeRoom } from "@/lib/online/redis";
import { castVote, toView } from "@/lib/online/room";
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
  const candidateId = body?.candidateId;
  if (typeof token !== "string" || typeof candidateId !== "string") {
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

  const updated = castVote(room, player.id, candidateId);
  await writeRoom(updated);

  return NextResponse.json(toView(updated, token));
}
