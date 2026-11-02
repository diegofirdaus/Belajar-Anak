import { randomInt } from "node:crypto";
import { z } from "zod";
import { acakSoalPilihan, kunciSebelumnya } from "@/lib/acakPilihan";
import { requireFamily } from "@/lib/server/auth";
import { ApiError, handle, json } from "@/lib/server/http";
import { getPlayer } from "@/lib/server/players";
import { simpanSesi, soalSesiTerakhirPaket } from "@/lib/server/sesi";
import { ambilPaketUntuk } from "@/lib/server/soalPilihan";

export const dynamic = "force-dynamic";

const schema = z.object({ pemainId: z.string().min(1).max(128), setId: z.string().min(1).max(128) }).strict();

/**
 * "Kerjakan" soal pilihan (brief 7.4). Tanpa AI dan tanpa jatah harian.
 * Kalau saklar "Acak urutan pilihan" paket menyala (bawaan), urutan pilihan diacak setiap kali dikerjakan,
 * dan posisi kunci dijamin berbeda dari percobaan sebelumnya pemain ini. Soal yang pilihannya merujuk
 * pilihan lain ("Semua benar", "A dan B benar") tidak diacak. Urutan soal tidak diacak (keputusan pemilik).
 */
export function POST(req: Request) {
  return handle(async () => {
    const { familyId } = await requireFamily(req);
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new ApiError("tidak_valid");
    const pemain = await getPlayer(familyId, parsed.data.pemainId);
    const paket = await ambilPaketUntuk(familyId, parsed.data.setId, pemain.kelas);
    let soal = paket.questions.map(({ q, options, answer, explain, jenis, esai }) =>
      jenis === "esai" && esai ? { q, options: [], answer: 0, explain, jenis, esai } : { q, options, answer, explain },
    );
    if (paket.acakPilihan) {
      const lama = kunciSebelumnya(soal, await soalSesiTerakhirPaket(familyId, pemain.id, paket.id));
      soal = soal.map((s, i) => acakSoalPilihan(s, (n) => randomInt(n), lama[i]));
    }
    const sesi = await simpanSesi(familyId, pemain.id, {
      sumber: "set",
      mapel: paket.subject,
      topik: paket.title,
      level: "pilihan",
      setId: paket.id,
      soal,
      dunia: pemain.theme,
    });
    return json(sesi, { status: 201 });
  });
}
