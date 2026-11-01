import "server-only";

import { createHash } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "@/lib/firebase/admin";
import type { LevelHadiah } from "@/lib/hadiah";
import { LEVELS, type Level } from "@/lib/kelas";
import {
  kunciTopik,
  terapkanAkhirSesi,
  terapkanJawabanBenar,
  type HadiahSatu,
  type Riwayat,
  type StatLevel,
  type StatTopik,
  type SumberSoal,
} from "@/lib/latihan";
import type { Rewards } from "@/lib/rewards";
import type { HasilJawab, PaketSesi, Soal } from "@/lib/soal";
import type { WorldId } from "@/lib/worlds";
import { ApiError } from "./http";

export type { SumberSoal };

const pemainRef = (familyId: string, pemainId: string) =>
  db().collection("families").doc(familyId).collection("players").doc(pemainId);

/**
 * Paket soal disimpan di server lengkap dengan kunci dan penjelasan.
 * Browser hanya menerima soal dan pilihan; jawaban dicek lewat server (keputusan: kunci di server).
 */
export async function simpanSesi(
  familyId: string,
  pemainId: string,
  s: { sumber: SumberSoal; mapel: string; topik: string; level: string; soal: Soal[]; setId?: string; dunia: WorldId },
): Promise<PaketSesi> {
  const ref = pemainRef(familyId, pemainId).collection("sesi").doc();
  await ref.set({
    ...s,
    setId: s.setId ?? null,
    n: s.soal.length,
    jawaban: {},
    benar: 0,
    selesai: false,
    dibuat: FieldValue.serverTimestamp(),
  });
  return {
    sesiId: ref.id,
    sumber: s.sumber,
    mapel: s.mapel,
    topik: s.topik,
    level: s.level,
    soal: s.soal.map(({ q, options }) => ({ q, options })),
  };
}

type JawabanTersimpan = { pilihan: number; benar: boolean; hadiah: HadiahSatu | null };
type DataSesi = {
  sumber: SumberSoal;
  mapel: string;
  topik: string;
  level: string;
  setId: string | null;
  dunia?: WorldId;
  n: number;
  soal: Soal[];
  jawaban: Record<string, JawabanTersimpan>;
  benar: number;
  selesai: boolean;
  bossKalah?: boolean;
};

/** Statistik topik dicatat hanya untuk level mudah/sedang/sulit, bukan soal pilihan atau soal contoh (brief 6). */
const dicatatDiStatistik = (s: DataSesi) => s.sumber !== "demo" && LEVELS.includes(s.level as Level);
const idTopik = (kunci: string) => createHash("sha1").update(kunci).digest("hex").slice(0, 24);

/**
 * Memeriksa satu jawaban. Satu soal hanya bisa dijawab sekali (ketukan ulang mengembalikan hasil yang sama).
 * Hadiah langsung disimpan per jawaban benar, jadi sesi yang ditinggal tetap dihitung (keputusan pemilik).
 * Jawaban terakhir menutup sesi: boss Pahlawan, riwayat (`attempts`), dan `topic_stats`.
 */
export async function jawabSoal(
  familyId: string,
  pemainId: string,
  sesiId: string,
  nomor: number,
  pilihan: number,
): Promise<HasilJawab> {
  const pRef = pemainRef(familyId, pemainId);
  const sRef = pRef.collection("sesi").doc(sesiId);

  return db().runTransaction(async (tx) => {
    const [pSnap, sSnap] = await Promise.all([tx.get(pRef), tx.get(sRef)]);
    if (!pSnap.exists || !sSnap.exists) throw new ApiError("tidak_ditemukan");
    const s = sSnap.data() as DataSesi;
    const pemain = pSnap.data() as { rewards: Rewards; theme: WorldId };
    const soal = s.soal[nomor];
    if (!soal || pilihan >= soal.options.length) throw new ApiError("tidak_valid", "Jawaban tidak dikenal.");

    const lama = s.jawaban?.[String(nomor)];
    if (lama) {
      return {
        benar: lama.benar,
        pilihan: lama.pilihan,
        answer: soal.answer,
        explain: soal.explain,
        hadiah: lama.hadiah,
        rewards: pemain.rewards,
        akhir: s.selesai ? { benar: s.benar, n: s.n, bossKalah: Boolean(s.bossKalah) } : null,
      };
    }

    const dunia = s.dunia ?? pemain.theme;
    const benar = pilihan === soal.answer;
    let rewards = pemain.rewards;
    let hadiah: HadiahSatu | null = null;
    if (benar) ({ rewards, hadiah } = terapkanJawabanBenar(rewards, dunia, s.level as LevelHadiah));

    const jawaban = { ...s.jawaban, [String(nomor)]: { pilihan, benar, hadiah } };
    const jumlahBenar = s.benar + (benar ? 1 : 0);
    const terakhir = Object.keys(jawaban).length === s.n;

    // Semua pembacaan transaksi harus sebelum penulisan.
    const kunci = kunciTopik(s.mapel, s.topik);
    const tRef = pRef.collection("topikStat").doc(idTopik(kunci));
    const tSnap = terakhir && dicatatDiStatistik(s) ? await tx.get(tRef) : null;

    let akhir: HasilJawab["akhir"] = null;
    if (terakhir) {
      const a = terapkanAkhirSesi(rewards, dunia, jumlahBenar, s.n);
      rewards = a.rewards;
      akhir = { benar: jumlahBenar, n: s.n, bossKalah: a.bossKalah };

      tx.set(pRef.collection("attempts").doc(sesiId), {
        subject: s.mapel,
        topic: s.topik,
        level: s.level,
        setId: s.setId ?? null,
        source: s.sumber,
        n: s.n,
        correct: jumlahBenar,
        answers: s.soal.map((x, i) => ({
          q: x.q,
          options: x.options,
          answer: x.answer,
          pilihan: jawaban[String(i)]?.pilihan ?? null,
        })),
        createdAt: FieldValue.serverTimestamp(),
      });

      if (tSnap) {
        const pct = Math.round((jumlahBenar / s.n) * 100);
        const lv = ((tSnap.data()?.lv ?? {}) as Partial<Record<Level, StatLevel>>)[s.level as Level];
        tx.set(
          tRef,
          {
            kunci,
            mapel: s.mapel,
            topik: s.topik,
            lv: { [s.level]: { best: Math.max(lv?.best ?? 0, pct), last: pct, tries: (lv?.tries ?? 0) + 1 } },
            waktu: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }
    }

    tx.update(pRef, { rewards });
    tx.update(sRef, {
      [`jawaban.${nomor}`]: { pilihan, benar, hadiah },
      benar: jumlahBenar,
      ...(terakhir ? { selesai: true, bossKalah: akhir!.bossKalah, selesaiPada: FieldValue.serverTimestamp() } : {}),
    });

    return { benar, pilihan, answer: soal.answer, explain: soal.explain, hadiah, rewards, akhir };
  });
}

const iso = (t: unknown) => (t instanceof Timestamp ? t.toDate().toISOString() : new Date().toISOString());

/** Riwayat 8 terakhir dan statistik topik untuk saran latihan di markas. */
export async function ringkasanLatihan(
  familyId: string,
  pemainId: string,
): Promise<{ riwayat: Riwayat[]; topik: StatTopik[] }> {
  const pRef = pemainRef(familyId, pemainId);
  if (!(await pRef.get()).exists) throw new ApiError("tidak_ditemukan");
  const [aSnap, tSnap] = await Promise.all([
    pRef.collection("attempts").orderBy("createdAt", "desc").limit(8).get(),
    pRef.collection("topikStat").orderBy("waktu", "desc").limit(30).get(),
  ]);
  return {
    riwayat: aSnap.docs.map((d) => {
      const x = d.data();
      return {
        id: d.id,
        mapel: x.subject,
        topik: x.topic,
        level: x.level,
        sumber: x.source,
        n: x.n,
        benar: x.correct,
        waktu: iso(x.createdAt),
      };
    }),
    topik: tSnap.docs.map((d) => {
      const x = d.data();
      return { mapel: x.mapel, topik: x.topik, lv: x.lv ?? {}, waktu: iso(x.waktu) };
    }),
  };
}
