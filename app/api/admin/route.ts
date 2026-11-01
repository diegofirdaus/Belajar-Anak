import { aiTersedia } from "@/lib/server/ai/claude";
import { statusAdmin } from "@/lib/server/admin";
import { requireFamily } from "@/lib/server/auth";
import { handle, json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Apakah PIN admin sudah dibuat, sedang terkunci, dan apakah AI tersedia untuk merapikan soal. */
export function GET(req: Request) {
  return handle(async () => {
    const { familyId } = await requireFamily(req);
    return json({ ...(await statusAdmin(familyId)), aiTersedia: aiTersedia() });
  });
}
