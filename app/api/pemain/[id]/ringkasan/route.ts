import { aiTersedia } from "@/lib/server/ai/claude";
import { requireFamily } from "@/lib/server/auth";
import { handle, json } from "@/lib/server/http";
import { getPlayer } from "@/lib/server/players";
import { ringkasanLatihan } from "@/lib/server/sesi";
import { paketUntukKelas } from "@/lib/server/soalPilihan";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Riwayat latihan, statistik topik untuk saran, soal pilihan untuk kelas pemain, dan apakah AI tersedia. */
export function GET(req: Request, ctx: Ctx) {
  return handle(async () => {
    const { familyId } = await requireFamily(req);
    const { id } = await ctx.params;
    const pemain = await getPlayer(familyId, id);
    const [ringkas, paketPilihan] = await Promise.all([ringkasanLatihan(familyId, id), paketUntukKelas(familyId, pemain.kelas)]);
    return json({ ...ringkas, paketPilihan, aiTersedia: aiTersedia() });
  });
}
