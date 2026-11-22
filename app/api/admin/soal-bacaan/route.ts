import { MAPEL, jenjangOf } from "@/lib/kelas";
import { soalBacaanSchema } from "@/lib/soalPilihan";
import { requireAdmin } from "@/lib/server/admin";
import { EFFORT_SULIT, MODEL_SOAL, aiTersedia, mintaJson } from "@/lib/server/ai/claude";
import { SKEMA_RAPIKAN, promptSoalBacaan } from "@/lib/server/ai/prompt";
import { saringRapikan } from "@/lib/server/ai/validasi";
import { requireFamily } from "@/lib/server/auth";
import { ApiError, handle, json } from "@/lib/server/http";
import { ambilJatahRapikan, catatAi, kembalikanJatahRapikan } from "@/lib/server/pemakaian";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Langkah 2 "Buat soal dari bacaan": AI membuat soal (pilihan ganda + esai opsional) yang jawabannya
 * didukung isi bacaan. Hasilnya masuk kartu "Cek dulu" di editor, belum disimpan.
 */
export function POST(req: Request) {
  return handle(async () => {
    const { familyId } = await requireFamily(req);
    await requireAdmin(req, familyId);
    const parsed = soalBacaanSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new ApiError("tidak_valid", parsed.error.issues[0]?.message);
    const p = parsed.data;
    if (!MAPEL[jenjangOf(p.kelas)].includes(p.mapel)) throw new ApiError("tidak_valid", "Mata pelajaran tidak tersedia untuk kelas ini.");
    if (!aiTersedia()) throw new ApiError("ai_belum_siap");

    const { tanggal } = await ambilJatahRapikan(familyId);
    try {
      const hasil = await mintaJson({
        model: MODEL_SOAL(),
        effort: p.level === "sulit" ? EFFORT_SULIT() : undefined,
        prompt: promptSoalBacaan({ ...p, untuk: "orang tua" }),
        skema: SKEMA_RAPIKAN,
        waktuMaks: 110_000,
      });
      // Semua soal dibuat AI: editor sudah memberi catatan umum, jadi tanda per soal dimatikan.
      const soal = saringRapikan((hasil.data as { soal?: unknown } | null)?.soal)
        .slice(0, p.n)
        .map((q) => ({ ...q, keyGuessed: false, optionsAdded: false, perluGambar: undefined }));
      await catatAi(familyId, { jenis: "soal_bacaan", model: hasil.model, hasil: soal.length ? "ok" : "kurang_lengkap", pemakaian: hasil.pemakaian });
      if (soal.length < Math.min(3, p.n)) throw new ApiError("kurang_lengkap");
      return json({ soal });
    } catch (e) {
      await kembalikanJatahRapikan(familyId, tanggal);
      if (e instanceof ApiError && e.ai) {
        await catatAi(familyId, { jenis: "soal_bacaan", model: e.ai.model, hasil: e.code, pemakaian: e.ai.pemakaian });
      }
      throw e;
    }
  });
}
