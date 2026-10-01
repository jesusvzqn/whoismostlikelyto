import { randomUUID } from "node:crypto";

// Only used from Node-runtime routes (create/join) — never imported by
// anything the Edge-runtime poll route depends on, since node:crypto can't
// be bundled for the Edge runtime.
export function generateToken(): string {
  return randomUUID();
}

// Separate namespace from generateToken(): a player id is a public identity
// (safe to send to every client), while a token is the secret proving you
// are that player. Both happen to be uuids, but never use one as the other.
export function generatePlayerId(): string {
  return randomUUID();
}
