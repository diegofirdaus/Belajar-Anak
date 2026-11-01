import { MAPEL, jenjangOf } from "@/lib/kelas";
import { rapikanSchema } from "@/lib/soalPilihan";
import { requireAdmin } from "@/lib/server/admin";
import { MODEL_RAPIKAN, aiTersedia, mintaJson } from "@/lib/server/ai/claude";
import { SKEMA_RAPIKAN, promptRapikan } from "@/lib/server/ai/prompt";
import { saringRapikan } from "@/lib/server/ai/validasi";
import { requireFamily } from "@/lib/server/auth";
import { ApiError, handle, json } from "@/lib/server/http";
import { ambilJatahRapikan, catatAi, kembalikanJatahRapikan } from "@/lib/server/pemakaian";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Merapikan teks soal bebas dari orang tua menjadi soal pilihan ganda (brief 10.3). */
export function POST(req: Request) {
  return handle(async () => {
    const { familyId } = await requireFamily(req);
    await requireAdmin(req, familyId);
    const parsed = rapikanSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new ApiError("tidak_valid", parsed.error.issues[0]?.message);
    const p = parsed.data;
    if (!MAPEL[jenjangOf(p.kelas)].includes(p.mapel)) throw new ApiError("tidak_valid", "Mata pelajaran tidak tersedia untuk kelas ini.");
    if (!aiTersedia()) throw new ApiError("ai_belum_siap");

    const { tanggal } = await ambilJatahRapikan(familyId);
    try {
      const hasil = await mintaJson({ model: MODEL_RAPIKAN(), prompt: promptRapikan(p), skema: SKEMA_RAPIKAN });
      const soal = saringRapikan((hasil.data as { soal?: unknown } | null)?.soal);
      await catatAi(familyId, { jenis: "rapikan", model: hasil.model, hasil: soal.length ? "ok" : "kurang_lengkap", pemakaian: hasil.pemakaian });
      if (!soal.length) throw new ApiError("kurang_lengkap");
      return json({ soal });
    } catch (e) {
      await kembalikanJatahRapikan(familyId, tanggal);
      if (e instanceof ApiError && e.ai) {
        await catatAi(familyId, { jenis: "rapikan", model: e.ai.model, hasil: e.code, pemakaian: e.ai.pemakaian });
      }
      throw e;
    }
  });
}
