import { newPlayerSchema } from "@/lib/player";
import { requireFamily } from "@/lib/server/auth";
import { ApiError, handle, json } from "@/lib/server/http";
import { createPlayer, listPlayers } from "@/lib/server/players";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return handle(async () => {
    const { familyId } = await requireFamily(req);
    return json({ players: await listPlayers(familyId) });
  });
}

export function POST(req: Request) {
  return handle(async () => {
    const { familyId } = await requireFamily(req);
    const parsed = newPlayerSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new ApiError("tidak_valid", parsed.error.issues[0]?.message);
    return json({ player: await createPlayer(familyId, parsed.data) }, { status: 201 });
  });
}
