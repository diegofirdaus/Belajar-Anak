import { paketSchema } from "@/lib/soalPilihan";
import { requireAdmin } from "@/lib/server/admin";
import { requireFamily } from "@/lib/server/auth";
import { ApiError, handle, json } from "@/lib/server/http";
import { buatPaket, daftarPaket } from "@/lib/server/soalPilihan";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return handle(async () => {
    const { familyId } = await requireFamily(req);
    await requireAdmin(req, familyId);
    return json({ paket: await daftarPaket(familyId) });
  });
}

export function POST(req: Request) {
  return handle(async () => {
    const { familyId } = await requireFamily(req);
    await requireAdmin(req, familyId);
    const parsed = paketSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new ApiError("tidak_valid", parsed.error.issues[0]?.message);
    return json({ paket: await buatPaket(familyId, parsed.data) }, { status: 201 });
  });
}
