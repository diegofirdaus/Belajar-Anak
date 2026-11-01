import { z } from "zod";
import { requireFamily } from "@/lib/server/auth";
import { ApiError, handle, json } from "@/lib/server/http";
import { getPlayer } from "@/lib/server/players";
import { simpanSesi } from "@/lib/server/sesi";
import { ambilPaketUntuk } from "@/lib/server/soalPilihan";

export const dynamic = "force-dynamic";

const schema = z.object({ pemainId: z.string().min(1).max(128), setId: z.string().min(1).max(128) }).strict();

/**
 * "Kerjakan" soal pilihan apa adanya (brief 7.4). Tanpa AI dan tanpa jatah harian.
 * Urutan pilihan tidak diacak: orang tua bisa menulis pilihan seperti "Semua benar".
 */
export function POST(req: Request) {
  return handle(async () => {
    const { familyId } = await requireFamily(req);
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new ApiError("tidak_valid");
    const pemain = await getPlayer(familyId, parsed.data.pemainId);
    const paket = await ambilPaketUntuk(familyId, parsed.data.setId, pemain.kelas);
    const sesi = await simpanSesi(familyId, pemain.id, {
      sumber: "set",
      mapel: paket.subject,
      topik: paket.title,
      level: "pilihan",
      setId: paket.id,
      soal: paket.questions.map(({ q, options, answer, explain }) => ({ q, options, answer, explain })),
      dunia: pemain.theme,
    });
    return json(sesi, { status: 201 });
  });
}
