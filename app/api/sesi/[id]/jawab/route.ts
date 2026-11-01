import { jawabSchema } from "@/lib/soal";
import { requireFamily } from "@/lib/server/auth";
import { ApiError, handle, json } from "@/lib/server/http";
import { jawabSoal } from "@/lib/server/sesi";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Cek satu jawaban: mengembalikan benar/salah, kunci, penjelasan, dan hadiah yang sudah disimpan (brief 7.6). */
export function POST(req: Request, ctx: Ctx) {
  return handle(async () => {
    const { familyId } = await requireFamily(req);
    const { id } = await ctx.params;
    const parsed = jawabSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new ApiError("tidak_valid");
    const { pemainId, nomor, pilihan } = parsed.data;
    return json(await jawabSoal(familyId, pemainId, id, nomor, pilihan));
  });
}
