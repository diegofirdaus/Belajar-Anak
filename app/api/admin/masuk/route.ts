import { pinSchema } from "@/lib/soalPilihan";
import { masukAdmin } from "@/lib/server/admin";
import { requireFamily } from "@/lib/server/auth";
import { ApiError, handle, json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Masuk mode admin dengan PIN. 5 kali salah → jeda 5 menit. */
export function POST(req: Request) {
  return handle(async () => {
    const { familyId } = await requireFamily(req);
    const parsed = pinSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new ApiError("tidak_valid", "PIN harus 4 angka.");
    return json({ token: await masukAdmin(familyId, parsed.data.pin) });
  });
}
