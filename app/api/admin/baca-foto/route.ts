import { MAPEL, jenjangOf } from "@/lib/kelas";
import { TEKS_ADMIN_MAKS, bacaFotoSchema } from "@/lib/soalPilihan";
import { requireAdmin } from "@/lib/server/admin";
import { MODEL_BACA_FOTO, aiTersedia, mintaJson } from "@/lib/server/ai/claude";
import { SKEMA_BACA_FOTO, promptBacaFoto } from "@/lib/server/ai/prompt";
import { saringRapikan } from "@/lib/server/ai/validasi";
import { requireFamily } from "@/lib/server/auth";
import { ApiError, handle, json } from "@/lib/server/http";
import { ambilJatahRapikan, catatAi, kembalikanJatahRapikan } from "@/lib/server/pemakaian";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Membaca foto soal (maks 5) menjadi teks soal + soal terstruktur untuk editor soal pilihan.
 * Foto hanya diteruskan ke Claude lalu dibuang: tidak disimpan dan tidak dicatat.
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
        prompt: promptBacaFoto({ kelas: p.kelas, mapel: p.mapel, jumlah: p.gambar.length }),
        skema: SKEMA_BACA_FOTO,
        gambar: p.gambar,
        waktuMaks: 100_000,
      });
      const data = (hasil.data ?? {}) as { teks?: unknown; soal?: unknown };
      const soal = saringRapikan(data.soal);
      const teks = typeof data.teks === "string" ? data.teks.trim().slice(0, TEKS_ADMIN_MAKS) : "";
      await catatAi(familyId, { jenis: "baca_foto", model: hasil.model, hasil: soal.length ? "ok" : "kurang_lengkap", pemakaian: hasil.pemakaian });
      if (!soal.length) throw new ApiError("kurang_lengkap", "Tidak ada soal yang terbaca dari foto.");
      return json({ teks, soal });
    } catch (e) {
      await kembalikanJatahRapikan(familyId, tanggal);
      if (e instanceof ApiError && e.ai) {
        await catatAi(familyId, { jenis: "baca_foto", model: e.ai.model, hasil: e.code, pemakaian: e.ai.pemakaian });
      }
      throw e;
    }
  });
}
