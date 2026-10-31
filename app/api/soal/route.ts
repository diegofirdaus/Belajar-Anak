import { jenjangOf, MAPEL, type Level } from "@/lib/kelas";
import { permintaanSoalSchema } from "@/lib/soal";
import { MODEL_SOAL, mintaJson } from "@/lib/server/ai/claude";
import { SKEMA_PAKET_SOAL, promptSoalBaru } from "@/lib/server/ai/prompt";
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

    const { tanggal } = await ambilJatah(familyId, pemain.id);
    const model = MODEL_SOAL();
    try {
      const hasil = await mintaJson({
        model,
        prompt: promptSoalBaru({ kelas: pemain.kelas, mapel: p.mapel, topik: p.topik, level: p.level as Level, n: p.n }),
        skema: SKEMA_PAKET_SOAL,
      });
      const soal = saringSoal((hasil.data as { soal?: unknown } | null)?.soal, p.n);
      await catatAi(familyId, {
        jenis: "soal_baru",
        pemainId: pemain.id,
        model: hasil.model,
        hasil: soal ? "ok" : "kurang_lengkap",
        pemakaian: hasil.pemakaian,
      });
      if (!soal) throw new ApiError("kurang_lengkap");
      const sesi = await simpanSesi(familyId, pemain.id, { sumber: "ai", mapel: p.mapel, topik: p.topik, level: p.level, soal });
      return json(sesi, { status: 201 });
    } catch (e) {
      await kembalikanJatah(familyId, pemain.id, tanggal);
      if (e instanceof ApiError && e.ai) {
        await catatAi(familyId, { jenis: "soal_baru", pemainId: pemain.id, model: e.ai.model, hasil: e.code, pemakaian: e.ai.pemakaian });
      }
      throw e;
    }
  });
}
