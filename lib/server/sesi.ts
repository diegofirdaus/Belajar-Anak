import "server-only";

import { createHash } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "@/lib/firebase/admin";
import type { LevelHadiah } from "@/lib/hadiah";
import { LEVELS, type Level } from "@/lib/kelas";
import {
  kunciTopik,
  kurangiHadiah,
  terapkanAkhirSesi,
  terapkanJawabanBenar,
  type HadiahSatu,
  type Riwayat,
  type StatLevel,
  type StatTopik,
  type SumberSoal,
} from "@/lib/latihan";
import type { Rewards } from "@/lib/rewards";
import type { DetailSoal, HasilEsai } from "@/lib/esai";
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
    setId: s.setId ?? null,
    soal: s.soal.map(({ q, options, jenis }) => (jenis === "esai" ? { q, options: [], jenis } : { q, options })),
  };
}

/**
 * Soal (dengan urutan pilihan dan kunci) dari sesi "Kerjakan" terakhir pemain ini untuk paket yang sama,
 * termasuk sesi yang ditinggal (anak sudah melihat urutannya). Sesi "soal mirip" tidak dihitung.
 * Tanpa orderBy supaya tidak butuh indeks gabungan; jumlah sesi per paket per anak kecil.
 */
export async function soalSesiTerakhirPaket(familyId: string, pemainId: string, setId: string): Promise<Soal[] | null> {
  const snap = await pemainRef(familyId, pemainId).collection("sesi").where("setId", "==", setId).get();
  const waktu = (t: unknown) => (t instanceof Timestamp ? t.toMillis() : 0);
  const terakhir = snap.docs
    .map((d) => d.data())
    .filter((x) => x.sumber === "set")
    .sort((a, b) => waktu(b.dibuat) - waktu(a.dibuat))[0];
  return (terakhir?.soal as Soal[] | undefined) ?? null;
}

/** Jawaban tersimpan di sesi. Soal esai: `pilihan` null, hasil pemeriksaan di `esai`. */
type JawabanTersimpan = { pilihan: number | null; benar: boolean; hadiah: HadiahSatu | null; esai?: HasilEsai };

/** Jawaban yang diperiksa: pilihan ganda, atau esai yang sudah dinilai (AI di luar transaksi). */
export type JawabanMasuk = { pilihan: number } | { teks: string; benar: boolean; esai: HasilEsai };

/** Satu soal sesi untuk dicek sebelum memeriksa esai (tanpa transaksi). */
export async function bacaSoalSesi(
  familyId: string,
  pemainId: string,
  sesiId: string,
  nomor: number,
): Promise<{ soal: Soal; mapel: string; sudahDijawab: boolean }> {
  const d = await pemainRef(familyId, pemainId).collection("sesi").doc(sesiId).get();
  if (!d.exists) throw new ApiError("tidak_ditemukan");
  const s = d.data() as DataSesi;
  const soal = s.soal[nomor];
  if (!soal) throw new ApiError("tidak_valid", "Jawaban tidak dikenal.");
  return { soal, mapel: s.mapel, sudahDijawab: Boolean(s.jawaban?.[String(nomor)]) };
}
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
  masuk: JawabanMasuk,
): Promise<HasilJawab> {
  const pRef = pemainRef(familyId, pemainId);
  const sRef = pRef.collection("sesi").doc(sesiId);

  return db().runTransaction(async (tx) => {
    const [pSnap, sSnap] = await Promise.all([tx.get(pRef), tx.get(sRef)]);
    if (!pSnap.exists || !sSnap.exists) throw new ApiError("tidak_ditemukan");
    const s = sSnap.data() as DataSesi;
    const pemain = pSnap.data() as { rewards: Rewards; theme: WorldId };
    const soal = s.soal[nomor];
    if (!soal) throw new ApiError("tidak_valid", "Jawaban tidak dikenal.");
    const esai = soal.jenis === "esai";
    if (esai !== ("teks" in masuk) || ("pilihan" in masuk && masuk.pilihan >= soal.options.length))
      throw new ApiError("tidak_valid", "Jawaban tidak dikenal.");

    const lama = s.jawaban?.[String(nomor)];
    if (lama) {
      return {
        benar: lama.benar,
        pilihan: lama.pilihan ?? -1,
        answer: esai ? -1 : soal.answer,
        explain: soal.explain,
        ...(lama.esai ? { esai: lama.esai } : {}),
        hadiah: lama.hadiah,
        rewards: pemain.rewards,
        akhir: s.selesai ? { benar: s.benar, n: s.n, bossKalah: Boolean(s.bossKalah) } : null,
      };
    }

    const dunia = s.dunia ?? pemain.theme;
    const benar = "pilihan" in masuk ? masuk.pilihan === soal.answer : masuk.benar;
    const pilihan = "pilihan" in masuk ? masuk.pilihan : null;
    let rewards = pemain.rewards;
    let hadiah: HadiahSatu | null = null;
    if (benar) ({ rewards, hadiah } = terapkanJawabanBenar(rewards, dunia, s.level as LevelHadiah));

    const simpan: JawabanTersimpan = { pilihan, benar, hadiah, ...("esai" in masuk ? { esai: masuk.esai } : {}) };
    const jawaban: Record<string, JawabanTersimpan> = { ...s.jawaban, [String(nomor)]: simpan };
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
        answers: s.soal.map((x, i) => {
          const j = jawaban[String(i)];
          if (x.jenis !== "esai") return { q: x.q, options: x.options, answer: x.answer, pilihan: j?.pilihan ?? null };
          // Esai: simpan hasil per poin dan hadiahnya, supaya orang tua bisa mengoreksi (hadiah ikut disesuaikan).
          return { q: x.q, jenis: "esai", options: [], answer: -1, pilihan: null, benar: j?.benar ?? false, hadiah: j?.hadiah ?? null, esai: j?.esai ?? null };
        }),
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
      [`jawaban.${nomor}`]: simpan,
      benar: jumlahBenar,
      ...(terakhir ? { selesai: true, bossKalah: akhir!.bossKalah, selesaiPada: FieldValue.serverTimestamp() } : {}),
    });

    return {
      benar,
      pilihan: pilihan ?? -1,
      answer: esai ? -1 : soal.answer,
      explain: soal.explain,
      ...("esai" in masuk ? { esai: masuk.esai } : {}),
      hadiah,
      rewards,
      akhir,
    };
  });
}

const iso = (t: unknown) => (t instanceof Timestamp ? t.toDate().toISOString() : new Date().toISOString());

/** Riwayat 8 terakhir dan statistik topik untuk saran latihan di markas. */
export async function ringkasanLatihan(
  familyId: string,
  pemainId: string,
  batas: { riwayat: number; topik: number } = { riwayat: 8, topik: 30 },
): Promise<{ riwayat: Riwayat[]; topik: StatTopik[] }> {
  const pRef = pemainRef(familyId, pemainId);
  if (!(await pRef.get()).exists) throw new ApiError("tidak_ditemukan");
  const [aSnap, tSnap] = await Promise.all([
    // Tanpa `answers` (isi soal per latihan) supaya ringan; detail diambil terpisah.
    pRef
      .collection("attempts")
      .select("subject", "topic", "level", "source", "n", "correct", "createdAt")
      .orderBy("createdAt", "desc")
      .limit(batas.riwayat)
      .get(),
    pRef.collection("topikStat").orderBy("waktu", "desc").limit(batas.topik).get(),
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

type JawabanRiwayat = DetailSoal & { hadiah?: HadiahSatu | null };

const keDetail = (a: JawabanRiwayat): DetailSoal =>
  a.jenis === "esai"
    ? { q: a.q, options: [], answer: -1, pilihan: null, jenis: "esai", benar: Boolean(a.benar), esai: a.esai ?? null }
    : { q: a.q, options: a.options, answer: a.answer, pilihan: a.pilihan ?? null };

/** Detail satu latihan untuk orang tua: soal, pilihan, kunci, dan jawaban anak. */
export async function detailLatihan(familyId: string, pemainId: string, latihanId: string): Promise<DetailSoal[]> {
  const d = await pemainRef(familyId, pemainId).collection("attempts").doc(latihanId).get();
  if (!d.exists) throw new ApiError("tidak_ditemukan");
  return ((d.data()!.answers ?? []) as JawabanRiwayat[]).map(keDetail);
}

/**
 * Koreksi orang tua untuk satu soal esai (STATUS no. 2): "Tandai benar" / "Tandai salah".
 * Skor latihan (`correct`) dan hadiah anak ikut disesuaikan dalam satu transaksi.
 * Bonus boss Pahlawan yang dihitung di akhir sesi tidak dihitung ulang.
 */
export async function koreksiEsai(
  familyId: string,
  pemainId: string,
  latihanId: string,
  nomor: number,
  benar: boolean,
): Promise<{ soal: DetailSoal[]; benar: number; rewards: Rewards }> {
  const pRef = pemainRef(familyId, pemainId);
  const aRef = pRef.collection("attempts").doc(latihanId);
  const sRef = pRef.collection("sesi").doc(latihanId);
  return db().runTransaction(async (tx) => {
    const [pSnap, aSnap, sSnap] = await Promise.all([tx.get(pRef), tx.get(aRef), tx.get(sRef)]);
    if (!pSnap.exists || !aSnap.exists) throw new ApiError("tidak_ditemukan");
    const pemain = pSnap.data() as { rewards: Rewards; theme: WorldId };
    const a = aSnap.data() as { answers: JawabanRiwayat[]; correct: number; level: string };
    const lama = a.answers[nomor];
    if (!lama || lama.jenis !== "esai") throw new ApiError("tidak_valid", "Hanya soal esai yang bisa dikoreksi.");
    if (Boolean(lama.benar) === benar) return { soal: a.answers.map(keDetail), benar: a.correct, rewards: pemain.rewards };

    const dunia = ((sSnap.exists ? sSnap.data()!.dunia : null) as WorldId | null) ?? pemain.theme;
    let rewards: Rewards;
    let hadiah: HadiahSatu | null = null;
    if (benar) ({ rewards, hadiah } = terapkanJawabanBenar(pemain.rewards, dunia, a.level as LevelHadiah));
    else rewards = kurangiHadiah(pemain.rewards, lama.hadiah ?? null);

    const answers = a.answers.map((x, i) =>
      i === nomor ? { ...x, benar, hadiah, esai: x.esai ? { ...x.esai, koreksi: true } : null } : x,
    );
    const correct = Math.max(0, a.correct + (benar ? 1 : -1));
    tx.update(aRef, { answers, correct });
    tx.update(pRef, { rewards });
    if (sSnap.exists && sSnap.data()!.jawaban?.[String(nomor)]) {
      tx.update(sRef, {
        [`jawaban.${nomor}.benar`]: benar,
        [`jawaban.${nomor}.hadiah`]: hadiah,
        [`jawaban.${nomor}.esai.koreksi`]: true,
        benar: correct,
      });
    }
    return { soal: answers.map(keDetail), benar: correct, rewards };
  });
}
