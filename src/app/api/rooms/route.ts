import { NextResponse } from "next/server";
import { generatePlayerId, generateToken } from "@/lib/online/ids";
import { generateUniqueRoomCode, isOnlineModeEnabled, writeRoom } from "@/lib/online/redis";
import { createRoom, toView } from "@/lib/online/room";
import { TOTAL_ROUNDS } from "@/lib/online/types";
import { normalizeName } from "@/lib/online/validate";

export async function POST(req: Request) {
  if (!isOnlineModeEnabled()) {
    return NextResponse.json({ error: "Online mode disabled" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const hostName = normalizeName(body?.hostName);
  if (!hostName) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const code = await generateUniqueRoomCode();
  const token = generateToken();
  const hostId = generatePlayerId();
  const room = createRoom(code, hostName, hostId, token, TOTAL_ROUNDS);
  await writeRoom(room);

  return NextResponse.json({ code, token, view: toView(room, token) });
}
