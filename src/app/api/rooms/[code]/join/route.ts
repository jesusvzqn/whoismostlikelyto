import { NextResponse } from "next/server";
import { generatePlayerId, generateToken } from "@/lib/online/ids";
import { isOnlineModeEnabled, readRoom, writeRoom } from "@/lib/online/redis";
import { canJoin, joinRoom, toView } from "@/lib/online/room";
import { normalizeCode, normalizeName } from "@/lib/online/validate";

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
  const name = normalizeName(body?.name);
  if (!name) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const room = await readRoom(code);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const joinability = canJoin(room);
  if (joinability === "started") {
    return NextResponse.json({ error: "Game already started" }, { status: 409 });
  }
  if (joinability === "full") {
    return NextResponse.json({ error: "Room is full" }, { status: 409 });
  }

  const playerId = generatePlayerId();
  const token = generateToken();
  const joined = joinRoom(room, name, playerId, token);
  await writeRoom(joined);

  return NextResponse.json({ token, view: toView(joined, token) });
}
