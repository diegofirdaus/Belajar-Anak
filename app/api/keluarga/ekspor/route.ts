import { NextResponse } from "next/server";
import { requireAdmin, requireLoginBaru } from "@/lib/server/admin";
import { adminAuth } from "@/lib/firebase/admin";
import { requireFamily } from "@/lib/server/auth";
import { handle } from "@/lib/server/http";
import { eksporKeluarga } from "@/lib/server/keluarga";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Unduh semua data keluarga. Butuh sesi admin dan login ulang Google yang baru. */
export function POST(req: Request) {
  return handle(async () => {
    const { familyId, authTime } = await requireFamily(req);
    await requireAdmin(req, familyId);
    requireLoginBaru(authTime);
    const email = (await adminAuth().getUser(familyId)).email ?? null;
    const data = await eksporKeluarga(familyId, email);
    const tanggal = data.diekspor.slice(0, 10);
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="markas-latihan-data-${tanggal}.json"`,
        "Cache-Control": "no-store",
      },
    });
  });
}
