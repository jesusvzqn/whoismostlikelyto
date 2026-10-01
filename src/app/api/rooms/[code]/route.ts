export const runtime = "edge";

import { NextResponse } from "next/server";
import { isOnlineModeEnabled, readRoom, writeRoom } from "@/lib/online/redis";
import { maybeResolveRound, toView } from "@/lib/online/room";
import { normalizeCode } from "@/lib/online/validate";

export async function GET(
  req: Request,
  { params }: { params: { code: string } }
) {
  if (!isOnlineModeEnabled()) {
    return NextResponse.json({ error: "Online mode disabled" }, { status: 404 });
  }

  const code = normalizeCode(params.code);
  const token = new URL(req.url).searchParams.get("token");
  if (!code || !token) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const room = await readRoom(code);
  if (!room) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Enforces the 60s voting timer without a background worker: whichever
  // client polls first after it expires is the one that resolves the round.
  const settled = maybeResolveRound(room);
  if (settled !== room) {
    await writeRoom(settled);
  }

  const view = toView(settled, token);
  if (!view) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(view);
}
