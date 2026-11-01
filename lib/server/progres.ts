import "server-only";

import type { DataProgres } from "@/lib/progres";
import { BATAS_PER_KELUARGA, BATAS_PER_PEMAIN, hariIni } from "./pemakaian";
import { db } from "@/lib/firebase/admin";
import { listPlayers } from "./players";
import { ringkasanLatihan } from "./sesi";

export const RIWAYAT_MAKS = 200;

/** Progres semua anak dalam keluarga untuk dashboard orang tua (mode admin). */
export async function progresKeluarga(familyId: string): Promise<DataProgres> {
  const [pemain, hari] = await Promise.all([
    listPlayers(familyId),
    db().collection("families").doc(familyId).collection("pemakaian").doc(hariIni()).get(),
  ]);
  const pakai = hari.data() ?? {};
  const perPemain = (pakai.perPemain ?? {}) as Record<string, number>;
  const isi = await Promise.all(pemain.map((p) => ringkasanLatihan(familyId, p.id, { riwayat: RIWAYAT_MAKS, topik: 200 })));
  return {
    pemain: pemain.map((p, i) => ({
      id: p.id,
      name: p.name,
      kelas: p.kelas,
      theme: p.theme,
      rewards: p.rewards,
      riwayat: isi[i].riwayat,
      topik: isi[i].topik,
      aiHariIni: Math.max(0, perPemain[p.id] ?? 0),
    })),
    ai: { keluargaHariIni: Math.max(0, (pakai.total as number | undefined) ?? 0), batasPemain: BATAS_PER_PEMAIN(), batasKeluarga: BATAS_PER_KELUARGA() },
    riwayatMaks: RIWAYAT_MAKS,
  };
}
