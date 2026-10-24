import "server-only";

import { FieldValue, Timestamp, type DocumentSnapshot } from "firebase-admin/firestore";
import { db } from "@/lib/firebase/admin";
import { academicYear } from "@/lib/kelas";
import { MAX_PLAYERS, type NewPlayer, type Player } from "@/lib/player";
import { emptyRewards, type Rewards } from "@/lib/rewards";
import type { WorldId } from "@/lib/worlds";
import { ApiError } from "./http";

const players = (familyId: string) => db().collection("families").doc(familyId).collection("players");

function toPlayer(d: DocumentSnapshot): Player {
  const x = d.data()!;
  return {
    id: d.id,
    name: x.name as string,
    kelas: x.kelas as number,
    theme: x.theme as WorldId,
    academicYear: x.academicYear as number,
    rewards: x.rewards as Rewards,
    createdAt: (x.createdAt as Timestamp | null)?.toDate().toISOString() ?? new Date().toISOString(),
  };
}

export async function listPlayers(familyId: string): Promise<Player[]> {
  const snap = await players(familyId).orderBy("createdAt", "asc").get();
  return snap.docs.map(toPlayer);
}

export async function getPlayer(familyId: string, playerId: string): Promise<Player> {
  const d = await players(familyId).doc(playerId).get();
  if (!d.exists) throw new ApiError("tidak_ditemukan");
  return toPlayer(d);
}

export async function createPlayer(familyId: string, p: NewPlayer): Promise<Player> {
  const col = players(familyId);
  const count = (await col.count().get()).data().count;
  if (count >= MAX_PLAYERS) throw new ApiError("batas", `Maksimal ${MAX_PLAYERS} pemain per keluarga.`);
  const ref = col.doc();
  await ref.set({
    name: p.name,
    kelas: p.kelas,
    theme: p.theme,
    academicYear: academicYear(),
    rewards: emptyRewards(),
    createdAt: FieldValue.serverTimestamp(),
  });
  return toPlayer(await ref.get());
}
