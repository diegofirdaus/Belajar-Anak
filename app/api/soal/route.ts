import { jenjangOf, MAPEL, type Level } from "@/lib/kelas";
import { permintaanSoalSchema, type Soal } from "@/lib/soal";
import { EFFORT_SULIT, MODEL_OLIMPIADE, MODEL_SOAL, mintaJson } from "@/lib/server/ai/claude";
import { SKEMA_PAKET_SOAL, promptOlimpiade, promptSoalBaru } from "@/lib/server/ai/prompt";
import { saringSoal } from "@/lib/server/ai/validasi";
import { requireFamily } from "@/lib/server/auth";
import { ApiError, handle, json } from "@/lib/server/http";
import { ambilJatah, catatAi, kembalikanJatah } from "@/lib/server/pemakaian";
import { getPlayer } from "@/lib/server/players";
import { simpanSesi } from "@/lib/server/sesi";

export const dynamic = "force-dynamic";
// Biasanya 10-40 detik; beri ruang untuk satu kali coba ulang.
export const maxDuration = 120;

/** Membuat paket soal baru dengan AI dari materi yang diketik anak (brief 10.1). */
export function POST(req: Request) {
  return handle(async () => {
    const { familyId } = await requireFamily(req);
    const parsed = permintaanSoalSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new ApiError("tidak_valid", parsed.error.issues[0]?.message);
    const p = parsed.data;

    const pemain = await getPlayer(familyId, p.pemainId);
    if (!MAPEL[jenjangOf(pemain.kelas)].includes(p.mapel)) throw new ApiError("tidak_valid", "Mata pelajaran tidak tersedia untuk kelas ini.");

    const olimpiade = p.level === "olimpiade";
    const { tanggal } = await ambilJatah(familyId, pemain.id, olimpiade);
    const catatGagal: { model: string; hasil: string; pemakaian: { masuk: number; keluar: number; cacheBaca: number } }[] = [];
    try {
      let soal: Soal[] | null;
      if (olimpiade) {
        // Olimpiade: separuh gaya lomba + separuh gaya penalaran, dibuat paralel supaya tetap ±1-2 menit.
        const separuh = p.n / 2;
        const hasil = await Promise.allSettled(
          (["lomba", "penalaran"] as const).map((gaya) =>
            mintaJson({
              model: MODEL_OLIMPIADE(),
              effort: EFFORT_SULIT(),
              prompt: promptOlimpiade({ kelas: pemain.kelas, mapel: p.mapel, topik: p.topik, n: separuh, gaya }),
              skema: SKEMA_PAKET_SOAL,
              // Opus berpikir panjang; satu percobaan dengan batas waktu di bawah maxDuration.
              maksToken: 32_000,
              waktuMaks: 110_000,
            }),
          ),
        );
        const bagian: (Soal[] | null)[] = [];
        for (const h of hasil) {
          if (h.status === "rejected") {
            if (h.reason instanceof ApiError && h.reason.ai) catatGagal.push({ model: h.reason.ai.model, hasil: h.reason.code, pemakaian: h.reason.ai.pemakaian });
            bagian.push(null);
            continue;
          }
          const s = saringSoal((h.value.data as { soal?: unknown } | null)?.soal, separuh);
          await catatAi(familyId, { jenis: "soal_baru", pemainId: pemain.id, model: h.value.model, hasil: s ? "ok" : "kurang_lengkap", pemakaian: h.value.pemakaian });
          bagian.push(s);
        }
        const gagal = hasil.find((h) => h.status === "rejected");
        if (gagal) throw (gagal as PromiseRejectedResult).reason;
        soal = bagian[0] && bagian[1] ? [...bagian[0], ...bagian[1]] : null;
      } else {
        const hasil = await mintaJson({
          model: MODEL_SOAL(),
          effort: p.level === "sulit" ? EFFORT_SULIT() : undefined,
          prompt: promptSoalBaru({ kelas: pemain.kelas, mapel: p.mapel, topik: p.topik, level: p.level as Level, n: p.n }),
          skema: SKEMA_PAKET_SOAL,
        });
        soal = saringSoal((hasil.data as { soal?: unknown } | null)?.soal, p.n);
        await catatAi(familyId, { jenis: "soal_baru", pemainId: pemain.id, model: hasil.model, hasil: soal ? "ok" : "kurang_lengkap", pemakaian: hasil.pemakaian });
      }
      if (!soal) throw new ApiError("kurang_lengkap");
      const sesi = await simpanSesi(familyId, pemain.id, { sumber: "ai", mapel: p.mapel, topik: p.topik || "Campuran", level: p.level, soal, dunia: pemain.theme });
      return json(sesi, { status: 201 });
    } catch (e) {
      await kembalikanJatah(familyId, pemain.id, tanggal, olimpiade);
      if (e instanceof ApiError && e.ai && !olimpiade) {
        await catatAi(familyId, { jenis: "soal_baru", pemainId: pemain.id, model: e.ai.model, hasil: e.code, pemakaian: e.ai.pemakaian });
      }
      for (const g of catatGagal) await catatAi(familyId, { jenis: "soal_baru", pemainId: pemain.id, ...g });
      throw e;
    }
  });
}
