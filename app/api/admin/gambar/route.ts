import { gambarBaruSchema } from "@/lib/gambarSoal";
import { requireAdmin } from "@/lib/server/admin";
import { requireFamily } from "@/lib/server/auth";
import { simpanGambar } from "@/lib/server/gambarSoal";
import { ApiError, handle, json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Simpan satu potongan gambar soal (JPEG base64, sudah dipotong & diperkecil di browser). */
export function POST(req: Request) {
  return handle(async () => {
    const { familyId } = await requireFamily(req);
    await requireAdmin(req, familyId);
    const parsed = gambarBaruSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new ApiError("tidak_valid", parsed.error.issues[0]?.message ?? "Gambar tidak bisa disimpan.");
    return json({ id: await simpanGambar(familyId, parsed.data.data) }, { status: 201 });
  });
}
