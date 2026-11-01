import { resetPin } from "@/lib/server/admin";
import { requireFamily } from "@/lib/server/auth";
import { handle, json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Lupa PIN: menghapus PIN, hanya kalau orang tua baru saja login ulang dengan Google. */
export function POST(req: Request) {
  return handle(async () => {
    const { familyId, authTime } = await requireFamily(req);
    await resetPin(familyId, authTime);
    return json({ ok: true });
  });
}
