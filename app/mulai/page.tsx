import Link from "next/link";
import { Pipo } from "@/components/Pipo";

// Sementara (tahap 2). Tahap 3 menggantinya dengan pengalihan:
// pemain di HP ini → markas, akun punya pemain → "Siapa yang mau main?", belum login → login orang tua.
export default function Mulai() {
  return (
    <main className="wrap">
      <div className="card" style={{ alignItems: "center", textAlign: "center" }}>
        <Pipo size="lg" />
        <p className="eyebrow">Markas Latihan</p>
        <h1>Sebentar lagi, ya!</h1>
        <p className="muted">Login orang tua dan daftar pemain dibangun di tahap 3.</p>
        <Link className="btn ghost" href="/">
          Kembali ke halaman pembuka
        </Link>
        <Link className="linkbtn" href="/katalog" style={{ alignSelf: "center" }}>
          Katalog komponen
        </Link>
      </div>
    </main>
  );
}
