import { ServerConfigError, db } from "@/lib/firebase/admin";
import { json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/**
 * Pemeriksaan untuk orang tua/pengembang: apakah server sudah tersambung ke Firebase.
 * Tidak memerlukan login dan tidak pernah menampilkan isi kunci.
 */
export async function GET() {
  try {
    await db().collection("families").limit(1).get();
    return json({ ok: true, pesan: "Server tersambung ke Firebase." });
  } catch (e) {
    if (e instanceof ServerConfigError) {
      const pesan =
        e.reason === "kunci_kosong"
          ? "FIREBASE_SERVICE_ACCOUNT belum ada di environment deploy ini. Cek centang Preview/Production, lalu Redeploy."
          : "FIREBASE_SERVICE_ACCOUNT ada, tapi isinya bukan JSON service account yang lengkap. Tempel ulang seluruh isi file .json.";
      return json({ ok: false, masalah: e.reason, pesan }, { status: 503 });
    }
    console.error("Pemeriksaan Firestore gagal:", e);
    return json(
      { ok: false, masalah: "firestore", pesan: "Kunci terbaca, tapi Firestore menolak atau belum dibuat. Cek database Firestore di Firebase." },
      { status: 503 },
    );
  }
}
