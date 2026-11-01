import { paketSchema } from "@/lib/soalPilihan";
import { requireAdmin } from "@/lib/server/admin";
import { requireFamily } from "@/lib/server/auth";
import { ApiError, handle, json } from "@/lib/server/http";
import { hapusPaket, ubahPaket } from "@/lib/server/soalPilihan";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export function PUT(req: Request, ctx: Ctx) {
  return handle(async () => {
    const { familyId } = await requireFamily(req);
    await requireAdmin(req, familyId);
    const { id } = await ctx.params;
    const parsed = paketSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new ApiError("tidak_valid", parsed.error.issues[0]?.message);
    return json({ paket: await ubahPaket(familyId, id, parsed.data) });
  });
}

export function DELETE(req: Request, ctx: Ctx) {
  return handle(async () => {
    const { familyId } = await requireFamily(req);
    await requireAdmin(req, familyId);
    const { id } = await ctx.params;
    await hapusPaket(familyId, id);
    return json({ ok: true });
  });
}
