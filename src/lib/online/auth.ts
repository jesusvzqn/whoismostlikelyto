import type { Player, RoomState } from "./types";

/** Returns the player `token` belongs to, or null if it matches nobody in the room. */
export function findPlayer(room: RoomState, token: string): Player | null {
  return room.players.find((p) => p.token === token) ?? null;
}
