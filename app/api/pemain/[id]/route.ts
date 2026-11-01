import { updatePlayerSchema } from "@/lib/player";
import { requireFamily } from "@/lib/server/auth";
import { ApiError, handle, json } from "@/lib/server/http";
import { deletePlayer, getPlayer, updatePlayer } from "@/lib/server/players";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export function GET(req: Request, ctx: Ctx) {
  return handle(async () => {
    const { familyId } = await requireFamily(req);
    const { id } = await ctx.params;
    return json({ player: await getPlayer(familyId, id) });
  });
}

export function PATCH(req: Request, ctx: Ctx) {
  return handle(async () => {
    const { familyId } = await requireFamily(req);
    const { id } = await ctx.params;
    const parsed = updatePlayerSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new ApiError("tidak_valid", parsed.error.issues[0]?.message);
    return json({ player: await updatePlayer(familyId, id, parsed.data) });
  });
}

export function DELETE(req: Request, ctx: Ctx) {
  return handle(async () => {
    const { familyId } = await requireFamily(req);
    const { id } = await ctx.params;
    await deletePlayer(familyId, id);
    return json({ ok: true });
  });
}
