import { requireAdmin } from "@/lib/server/admin";
import { requireFamily } from "@/lib/server/auth";
import { handle, json } from "@/lib/server/http";
import { progresKeluarga } from "@/lib/server/progres";

export const dynamic = "force-dynamic";

/** Dashboard progres orang tua: semua anak, riwayat, statistik topik, pemakaian AI hari ini. */
export function GET(req: Request) {
  return handle(async () => {
    const { familyId } = await requireFamily(req);
    await requireAdmin(req, familyId);
    return json(await progresKeluarga(familyId));
  });
}
