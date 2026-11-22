import { MAPEL, jenjangOf } from "@/lib/kelas";
import { TEKS_ADMIN_MAKS, bacaFotoSchema } from "@/lib/soalPilihan";
import { requireAdmin } from "@/lib/server/admin";
import { MODEL_BACA_FOTO, aiTersedia, mintaJson } from "@/lib/server/ai/claude";
import { SKEMA_SALIN_BACAAN, promptSalinBacaan } from "@/lib/server/ai/prompt";
import { requireFamily } from "@/lib/server/auth";
import { ApiError, handle, json } from "@/lib/server/http";
import { ambilJatahRapikan, catatAi, kembalikanJatahRapikan } from "@/lib/server/pemakaian";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Langkah 1 "Buat soal dari bacaan": menyalin bacaan/materi dari foto (maks 5) atau satu PDF menjadi teks.
 * Foto/PDF hanya diteruskan ke Claude lalu dibuang: tidak disimpan dan tidak dicatat.
 */
export function POST(req: Request) {
  return handle(async () => {
    const { familyId } = await requireFamily(req);
    await requireAdmin(req, familyId);
    const parsed = bacaFotoSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new ApiError("tidak_valid", parsed.error.issues[0]?.message ?? "Foto tidak bisa dibaca.");
    const p = parsed.data;
    if (!MAPEL[jenjangOf(p.kelas)].includes(p.mapel)) throw new ApiError("tidak_valid", "Mata pelajaran tidak tersedia untuk kelas ini.");
    if (!aiTersedia()) throw new ApiError("ai_belum_siap");

    const { tanggal } = await ambilJatahRapikan(familyId);
    try {
      const hasil = await mintaJson({
        model: MODEL_BACA_FOTO(),
        prompt: promptSalinBacaan({ kelas: p.kelas, mapel: p.mapel, jumlah: p.gambar?.length ?? 1, pdf: Boolean(p.pdf) }),
        skema: SKEMA_SALIN_BACAAN,
        gambar: p.gambar,
        pdf: p.pdf?.data,
        effort: "low",
        maksToken: 32_000,
        waktuMaks: 240_000,
      });
      const mentah = (hasil.data as { teks?: unknown } | null)?.teks;
      const teks = typeof mentah === "string" ? mentah.trim().slice(0, TEKS_ADMIN_MAKS) : "";
      await catatAi(familyId, { jenis: "salin_bacaan", model: hasil.model, hasil: teks ? "ok" : "kurang_lengkap", pemakaian: hasil.pemakaian });
      if (!teks) throw new ApiError("kurang_lengkap", `Tidak ada bacaan yang terbaca dari ${p.pdf ? "PDF" : "foto"}.`);
      return json({ teks });
    } catch (e) {
      await kembalikanJatahRapikan(familyId, tanggal);
      if (e instanceof ApiError && e.ai) {
        await catatAi(familyId, { jenis: "salin_bacaan", model: e.ai.model, hasil: e.code, pemakaian: e.ai.pemakaian });
      }
      throw e;
    }
  });
}
