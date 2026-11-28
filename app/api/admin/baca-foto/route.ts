import { MAPEL, jenjangOf } from "@/lib/kelas";
import { TEKS_ADMIN_MAKS, bacaFotoSchema, tulisTeksSoal } from "@/lib/soalPilihan";
import { requireAdmin } from "@/lib/server/admin";
import { MODEL_BACA_FOTO, aiTersedia, mintaJson } from "@/lib/server/ai/claude";
import { SKEMA_BACA_FOTO, promptBacaFoto } from "@/lib/server/ai/prompt";
import { saringDenganLaporan } from "@/lib/server/ai/validasi";
import { requireFamily } from "@/lib/server/auth";
import { ApiError, handle, json } from "@/lib/server/http";
import { ambilJatahRapikan, catatAi, kembalikanJatahRapikan } from "@/lib/server/pemakaian";

export const dynamic = "force-dynamic";
// Halaman padat (banyak soal + gambar) bisa butuh lebih dari 2 menit.
export const maxDuration = 300;

/** Batas nomor halaman yang diterima sebagai letak gambar PDF. */
const HALAMAN_PDF_MAKS = 500;

/**
 * Membaca foto soal (maks 5) atau satu PDF menjadi teks soal + soal terstruktur untuk editor soal pilihan.
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
        prompt: promptBacaFoto({ kelas: p.kelas, mapel: p.mapel, jumlah: p.gambar?.length ?? 1, pdf: Boolean(p.pdf) }),
        skema: SKEMA_BACA_FOTO,
        gambar: p.gambar,
        pdf: p.pdf?.data,
        // Tugas menyalin: tidak perlu berpikir panjang; jatah tulis besar untuk halaman padat.
        // AI juga mengerjakan tiap soal untuk menentukan kunci (tanda di foto bisa jawaban anak yang salah).
        effort: "medium",
        maksToken: 32_000,
        waktuMaks: 240_000,
      });
      const data = (hasil.data ?? {}) as { soal?: unknown };
      // PDF: "foto" = nomor halaman; halamannya digambar di HP (pdf.js) untuk dipotong.
      // Kunci = jawaban AI. Tanda di lembar (silang/lingkaran/kunci tertulis) hanya pembanding:
      // sama dengan jawaban AI → tidak perlu dicek; beda atau tidak ada tanda → "Mohon dicek".
      const saring = saringDenganLaporan(data.soal, p.pdf ? HALAMAN_PDF_MAKS : (p.gambar?.length ?? 0));
      const hasilSoal = saring.hasil.map((x) => ({
        ...x,
        soal: { ...x.soal, keyGuessed: x.soal.jenis === "esai" ? true : x.tanda !== x.soal.answer },
      }));
      const soal = hasilSoal.map((x) => x.soal);
      // Salinan teks untuk kolom "Soal" disusun dari soal terstruktur (AI tidak menulis dua kali).
      const teks = tulisTeksSoal(soal).slice(0, TEKS_ADMIN_MAKS);
      await catatAi(familyId, { jenis: p.pdf ? "baca_pdf" : "baca_foto", model: hasil.model, hasil: soal.length ? "ok" : "kurang_lengkap", pemakaian: hasil.pemakaian });
      if (!soal.length) throw new ApiError("kurang_lengkap", `Tidak ada soal yang terbaca dari ${p.pdf ? "PDF" : "foto"}.`);
      // Usulan kotak gambar per soal (sejajar dengan `soal`) untuk dipotong di browser dari foto yang masih ada di HP.
      return json({ teks, soal, kotak: hasilSoal.map((x) => x.kotak), tanda: hasilSoal.map((x) => x.tanda), dilewati: saring.dilewati });
    } catch (e) {
      await kembalikanJatahRapikan(familyId, tanggal);
      if (e instanceof ApiError && e.ai) {
        await catatAi(familyId, { jenis: p.pdf ? "baca_pdf" : "baca_foto", model: e.ai.model, hasil: e.code, pemakaian: e.ai.pemakaian });
      }
      throw e;
    }
  });
}
