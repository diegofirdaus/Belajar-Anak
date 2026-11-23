import { z } from "zod";
import { db } from "@/lib/firebase/admin";
import { requireAdmin } from "@/lib/server/admin";
import { cabutAnggota, daftarAnggota, undangAnggota } from "@/lib/server/anggota";
import { requireFamily } from "@/lib/server/auth";
import { ApiError, handle, json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

const emailSchema = z
  .object({ email: z.string().trim().email("Tulis alamat email Google yang benar, ya.").max(200) })
  .strict();

async function ringkasan(familyId: string, pemilik: boolean) {
  const emailPemilik = ((await db().collection("families").doc(familyId).get()).data()?.emailPemilik as string | null | undefined) ?? null;
  return { saya: pemilik ? "pemilik" : "anggota", emailPemilik, anggota: await daftarAnggota(familyId) };
}

/** Daftar anggota keluarga (semua orang tua di keluarga ini boleh melihat). */
export function GET(req: Request) {
  return handle(async () => {
    const { familyId, pemilik } = await requireFamily(req);
    await requireAdmin(req, familyId);
    return json(await ringkasan(familyId, pemilik));
  });
}

/** Undang email Google sebagai anggota keluarga. Hanya pemilik. */
export function POST(req: Request) {
  return handle(async () => {
    const { familyId, pemilik, email } = await requireFamily(req);
    await requireAdmin(req, familyId);
    if (!pemilik) throw new ApiError("tidak_valid", "Hanya pemilik keluarga yang bisa menambah anggota.");
    const p = emailSchema.safeParse(await req.json().catch(() => null));
    if (!p.success) throw new ApiError("tidak_valid", p.error.issues[0]?.message);
    await undangAnggota(familyId, email, p.data.email);
    return json(await ringkasan(familyId, pemilik), { status: 201 });
  });
}

/** Cabut undangan/keanggotaan. Hanya pemilik. */
export function DELETE(req: Request) {
  return handle(async () => {
    const { familyId, pemilik } = await requireFamily(req);
    await requireAdmin(req, familyId);
    if (!pemilik) throw new ApiError("tidak_valid", "Hanya pemilik keluarga yang bisa mencabut anggota.");
    const p = emailSchema.safeParse(await req.json().catch(() => null));
    if (!p.success) throw new ApiError("tidak_valid", p.error.issues[0]?.message);
    await cabutAnggota(familyId, p.data.email);
    return json(await ringkasan(familyId, pemilik));
  });
}
