import { ServerConfigError, db } from "@/lib/firebase/admin";
import { json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/**
 * Pemeriksaan untuk orang tua/pengembang: apakah server sudah tersambung ke Firebase.
 * Tidak memerlukan login dan tidak pernah menampilkan isi kunci.
 */
export async function GET() {
  try {
    const lambat = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("lambat")), 10_000));
    await Promise.race([db().collection("families").limit(1).get(), lambat]);
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
    if (e instanceof Error && e.message === "lambat")
      return json(
        { ok: false, masalah: "lambat", pesan: "Firestore tidak menjawab dalam 10 detik. Cek apakah database Firestore sudah dibuat." },
        { status: 503 },
      );
    return json(
      { ok: false, masalah: "firestore", pesan: "Kunci terbaca, tapi Firestore menolak atau belum dibuat. Cek database Firestore di Firebase." },
      { status: 503 },
    );
  }
}
