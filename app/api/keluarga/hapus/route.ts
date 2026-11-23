import { z } from "zod";
import { requireAdmin, requireLoginBaru } from "@/lib/server/admin";
import { requireFamily } from "@/lib/server/auth";
import { ApiError, handle, json } from "@/lib/server/http";
import { hapusKeluarga } from "@/lib/server/keluarga";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const schema = z.object({ konfirmasi: z.literal("HAPUS") }).strict();

/** Hapus semua data keluarga. Butuh sesi admin, login ulang Google yang baru, dan ketikan "HAPUS". */
export function POST(req: Request) {
  return handle(async () => {
    const { familyId, authTime, pemilik } = await requireFamily(req);
    await requireAdmin(req, familyId);
    if (!pemilik) throw new ApiError("tidak_valid", "Hanya pemilik keluarga (akun yang pertama mendaftar) yang bisa menghapus semua data.");
    requireLoginBaru(authTime);
    if (!schema.safeParse(await req.json().catch(() => null)).success) throw new ApiError("tidak_valid", 'Ketik HAPUS untuk melanjutkan.');
    await hapusKeluarga(familyId);
    return json({ ok: true });
  });
}
