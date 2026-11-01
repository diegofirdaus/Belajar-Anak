import { z } from "zod";
import { jumlahSoalMirip } from "@/lib/soalPilihan";
import { MODEL_SOAL, mintaJson } from "@/lib/server/ai/claude";
import { SKEMA_PAKET_SOAL, promptSoalMirip } from "@/lib/server/ai/prompt";
import { saringSoal } from "@/lib/server/ai/validasi";
import { requireFamily } from "@/lib/server/auth";
import { ApiError, handle, json } from "@/lib/server/http";
import { ambilJatah, catatAi, kembalikanJatah } from "@/lib/server/pemakaian";
import { getPlayer } from "@/lib/server/players";
import { simpanSesi } from "@/lib/server/sesi";
import { ambilPaketUntuk } from "@/lib/server/soalPilihan";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const schema = z.object({ pemainId: z.string().min(1).max(128), setId: z.string().min(1).max(128) }).strict();

/** "Buat soal mirip (AI)" dari soal pilihan orang tua (brief 10.2). Memakai jatah harian anak. */
export function POST(req: Request) {
  return handle(async () => {
    const { familyId } = await requireFamily(req);
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new ApiError("tidak_valid");
    const pemain = await getPlayer(familyId, parsed.data.pemainId);
    const paket = await ambilPaketUntuk(familyId, parsed.data.setId, pemain.kelas);
    const n = jumlahSoalMirip(paket.questions.length);

    const { tanggal } = await ambilJatah(familyId, pemain.id);
    try {
      const hasil = await mintaJson({
        model: MODEL_SOAL(),
        prompt: promptSoalMirip({ kelas: pemain.kelas, mapel: paket.subject, judul: paket.title, n, contoh: paket.questions }),
        skema: SKEMA_PAKET_SOAL,
      });
      const soal = saringSoal((hasil.data as { soal?: unknown } | null)?.soal, n);
      await catatAi(familyId, {
        jenis: "soal_mirip",
        pemainId: pemain.id,
        model: hasil.model,
        hasil: soal ? "ok" : "kurang_lengkap",
        pemakaian: hasil.pemakaian,
      });
      if (!soal) throw new ApiError("kurang_lengkap");
      const sesi = await simpanSesi(familyId, pemain.id, {
        sumber: "set_similar",
        mapel: paket.subject,
        topik: paket.title,
        level: "pilihan",
        setId: paket.id,
        soal,
        dunia: pemain.theme,
      });
      return json(sesi, { status: 201 });
    } catch (e) {
      await kembalikanJatah(familyId, pemain.id, tanggal);
      if (e instanceof ApiError && e.ai) {
        await catatAi(familyId, { jenis: "soal_mirip", pemainId: pemain.id, model: e.ai.model, hasil: e.code, pemakaian: e.ai.pemakaian });
      }
      throw e;
    }
  });
}
