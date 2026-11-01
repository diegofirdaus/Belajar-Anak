import { keluarAdmin } from "@/lib/server/admin";
import { requireFamily } from "@/lib/server/auth";
import { handle, json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export function POST(req: Request) {
  return handle(async () => {
    const { familyId } = await requireFamily(req);
    await keluarAdmin(req, familyId);
    return json({ ok: true });
  });
}
