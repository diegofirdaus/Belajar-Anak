import { pinSchema } from "@/lib/soalPilihan";
import { aturPin } from "@/lib/server/admin";
import { requireFamily } from "@/lib/server/auth";
import { ApiError, handle, json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Membuat PIN pertama kali, atau mengganti PIN (butuh sesi admin). Membalas token sesi admin. */
export function POST(req: Request) {
  return handle(async () => {
    const { familyId } = await requireFamily(req);
    const parsed = pinSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new ApiError("tidak_valid", "PIN harus 4 angka.");
    return json({ token: await aturPin(req, familyId, parsed.data.pin) });
  });
}
