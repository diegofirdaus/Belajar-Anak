import { requireAdmin } from "@/lib/server/admin";
import { requireFamily } from "@/lib/server/auth";
import { handle, json } from "@/lib/server/http";
import { detailLatihan } from "@/lib/server/sesi";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ pemainId: string; latihanId: string }> };

/** Soal-soal satu latihan beserta jawaban anak (untuk orang tua). */
export function GET(req: Request, ctx: Ctx) {
  return handle(async () => {
    const { familyId } = await requireFamily(req);
    await requireAdmin(req, familyId);
    const { pemainId, latihanId } = await ctx.params;
    return json({ soal: await detailLatihan(familyId, pemainId, latihanId) });
  });
}
