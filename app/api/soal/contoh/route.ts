import { z } from "zod";
import { jenjangOf } from "@/lib/kelas";
import { requireFamily } from "@/lib/server/auth";
import { ApiError, handle, json } from "@/lib/server/http";
import { getPlayer } from "@/lib/server/players";
import { simpanSesi } from "@/lib/server/sesi";
import { SOAL_CONTOH } from "@/lib/server/soalContoh";

export const dynamic = "force-dynamic";

const schema = z.object({ pemainId: z.string().min(1).max(128) }).strict();

/** Soal contoh offline sesuai jenjang (brief lampiran A). Tidak memakai AI dan tidak memakai jatah harian. */
export function POST(req: Request) {
  return handle(async () => {
    const { familyId } = await requireFamily(req);
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new ApiError("tidak_valid");
    const pemain = await getPlayer(familyId, parsed.data.pemainId);
    const c = SOAL_CONTOH[jenjangOf(pemain.kelas)];
    const sesi = await simpanSesi(familyId, pemain.id, {
      sumber: "demo",
      mapel: c.mapel,
      topik: c.topik,
      level: "mudah",
      soal: c.soal,
      dunia: pemain.theme,
    });
    return json(sesi, { status: 201 });
  });
}
