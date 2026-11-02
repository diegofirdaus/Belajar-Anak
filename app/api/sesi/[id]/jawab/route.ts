import { hasilKosong, jawabanKosong, daftarPoin, putuskanEsai, type HasilEsai } from "@/lib/esai";
import { jawabSchema } from "@/lib/soal";
import { MODEL_PERIKSA_ESAI, aiTersedia, mintaJson } from "@/lib/server/ai/claude";
import { SKEMA_PERIKSA_ESAI, promptPeriksaEsai } from "@/lib/server/ai/prompt";
import { requireFamily } from "@/lib/server/auth";
import { ApiError, handle, json } from "@/lib/server/http";
import { ambilJatahEsai, catatAi, kembalikanJatahEsai } from "@/lib/server/pemakaian";
import { getPlayer } from "@/lib/server/players";
import { bacaSoalSesi, jawabSoal } from "@/lib/server/sesi";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

/**
 * Cek satu jawaban: mengembalikan benar/salah, kunci, penjelasan, dan hadiah yang sudah disimpan (brief 7.6).
 * Soal esai (`teks`): AI (Haiku) menilai per poin di luar transaksi, keputusan dihitung kode (`putuskanEsai`).
 */
export function POST(req: Request, ctx: Ctx) {
  return handle(async () => {
    const { familyId } = await requireFamily(req);
    const { id } = await ctx.params;
    const parsed = jawabSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new ApiError("tidak_valid", "Jawaban ini tidak bisa diperiksa. Kembali ke markas, lalu coba lagi.");
    const { pemainId, nomor, pilihan, teks } = parsed.data;
    if (pilihan !== undefined) return json(await jawabSoal(familyId, pemainId, id, nomor, { pilihan }));

    const jawaban = (teks ?? "").trim();
    const { soal, mapel, sudahDijawab } = await bacaSoalSesi(familyId, pemainId, id, nomor);
    if (soal.jenis !== "esai" || !soal.esai) throw new ApiError("tidak_valid", "Jawaban tidak dikenal.");
    const kunci = soal.esai;
    // Ketukan ulang: hasil pertama dikembalikan tanpa memeriksa lagi.
    if (sudahDijawab) return json(await jawabSoal(familyId, pemainId, id, nomor, { teks: jawaban, benar: false, esai: hasilKosong(kunci, jawaban) }));

    let benar = false;
    let esai: HasilEsai = hasilKosong(kunci, jawaban);
    if (!jawabanKosong(jawaban)) {
      if (!aiTersedia()) throw new ApiError("ai_belum_siap");
      const pemain = await getPlayer(familyId, pemainId);
      const { tanggal } = await ambilJatahEsai(familyId, pemainId);
      try {
        const hasil = await mintaJson({
          model: MODEL_PERIKSA_ESAI(),
          prompt: promptPeriksaEsai({ kelas: pemain.kelas, mapel, soal: soal.q, contoh: kunci.contoh, poin: daftarPoin(kunci), jawaban }),
          skema: SKEMA_PERIKSA_ESAI,
        });
        ({ benar, hasil: esai } = putuskanEsai(kunci, jawaban, hasil.data));
        await catatAi(familyId, { jenis: "periksa_esai", pemainId, model: hasil.model, hasil: benar ? "benar" : "belum_tepat", pemakaian: hasil.pemakaian });
      } catch (e) {
        if (e instanceof ApiError && e.ai) {
          await catatAi(familyId, { jenis: "periksa_esai", pemainId, model: e.ai.model, hasil: e.code, pemakaian: e.ai.pemakaian });
        }
        // AI menolak menilai jawaban ini: anggap belum tepat supaya anak tidak tertahan; orang tua bisa mengoreksi.
        if (!(e instanceof ApiError && e.code === "ditolak")) {
          await kembalikanJatahEsai(familyId, pemainId, tanggal);
          throw e;
        }
      }
    }
    return json(await jawabSoal(familyId, pemainId, id, nomor, { teks: jawaban, benar, esai }));
  });
}
