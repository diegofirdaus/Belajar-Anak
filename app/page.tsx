import Link from "next/link";
import { Pipo } from "@/components/Pipo";

// Sementara (tahap 1). Halaman pembuka dibangun di tahap 2.
export default function Home() {
  return (
    <main className="wrap">
      <div className="card" style={{ alignItems: "center", textAlign: "center" }}>
        <Pipo size="lg" />
        <p className="eyebrow">Markas Latihan</p>
        <h1>Sedang dibangun</h1>
        <p className="muted">Halaman pembuka menyusul di tahap 2.</p>
        <Link className="btn" href="/katalog">
          Buka katalog komponen
        </Link>
      </div>
    </main>
  );
}
