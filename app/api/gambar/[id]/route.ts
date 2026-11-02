import { gambarIdSchema } from "@/lib/gambarSoal";
import { requireFamily } from "@/lib/server/auth";
import { ambilGambar } from "@/lib/server/gambarSoal";
import { ApiError, handle, json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Gambar soal untuk anak & orang tua di keluarga itu saja (login Google keluarga). */
export function GET(req: Request, ctx: Ctx) {
  return handle(async () => {
    const { familyId } = await requireFamily(req);
    const { id } = await ctx.params;
    if (!gambarIdSchema.safeParse(id).success) throw new ApiError("tidak_ditemukan");
    return json(await ambilGambar(familyId, id));
  });
}
