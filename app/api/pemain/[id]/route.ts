import { requireFamily } from "@/lib/server/auth";
import { handle, json } from "@/lib/server/http";
import { getPlayer } from "@/lib/server/players";

export const dynamic = "force-dynamic";

export function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { familyId } = await requireFamily(req);
    const { id } = await ctx.params;
    return json({ player: await getPlayer(familyId, id) });
  });
}
