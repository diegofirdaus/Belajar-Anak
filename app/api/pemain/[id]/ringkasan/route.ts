import { aiTersedia } from "@/lib/server/ai/claude";
import { requireFamily } from "@/lib/server/auth";
import { handle, json } from "@/lib/server/http";
import { ringkasanLatihan } from "@/lib/server/sesi";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Riwayat latihan, statistik topik untuk saran, dan apakah pembuat soal AI tersedia. */
export function GET(req: Request, ctx: Ctx) {
  return handle(async () => {
    const { familyId } = await requireFamily(req);
    const { id } = await ctx.params;
    return json({ ...(await ringkasanLatihan(familyId, id)), aiTersedia: aiTersedia() });
  });
}
