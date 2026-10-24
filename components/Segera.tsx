import Link from "next/link";
import { Pipo } from "./Pipo";

/** Layar sementara untuk bagian yang dibangun di tahap berikutnya. */
export function Segera({ judul, tahap, children }: { judul: string; tahap: number; children?: React.ReactNode }) {
  return (
    <main className="wrap">
      <div className="card" style={{ alignItems: "center", textAlign: "center" }}>
        <Pipo size="lg" />
        <p className="eyebrow">Segera hadir · tahap {tahap}</p>
        <h1>{judul}</h1>
        {children}
        <Link className="btn ghost" href="/pemain">
          Ke daftar pemain
        </Link>
      </div>
    </main>
  );
}
