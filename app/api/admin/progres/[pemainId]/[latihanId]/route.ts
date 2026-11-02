import { z } from "zod";
import { requireAdmin } from "@/lib/server/admin";
import { requireFamily } from "@/lib/server/auth";
import { ApiError, handle, json } from "@/lib/server/http";
import { detailLatihan, koreksiEsai } from "@/lib/server/sesi";
import { SOAL_PER_PAKET_MAKS } from "@/lib/soalPilihan";

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

const koreksiSchema = z.object({ nomor: z.number().int().min(0).max(SOAL_PER_PAKET_MAKS - 1), benar: z.boolean() }).strict();

/** Koreksi orang tua untuk soal esai: "Tandai benar" / "Tandai salah". Skor & hadiah ikut disesuaikan. */
export function POST(req: Request, ctx: Ctx) {
  return handle(async () => {
    const { familyId } = await requireFamily(req);
    await requireAdmin(req, familyId);
    const { pemainId, latihanId } = await ctx.params;
    const parsed = koreksiSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new ApiError("tidak_valid");
    return json(await koreksiEsai(familyId, pemainId, latihanId, parsed.data.nomor, parsed.data.benar));
  });
}
