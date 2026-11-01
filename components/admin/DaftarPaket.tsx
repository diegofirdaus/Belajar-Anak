"use client";

import { useState } from "react";
import { kelasShort } from "@/lib/kelas";
import type { PaketPilihan } from "@/lib/soalPilihan";

/** Daftar soal pilihan (brief 7.8). Hapus meminta konfirmasi di dalam kartu. */
export function DaftarPaket({
  paket,
  onTambah,
  onUbah,
  onHapus,
  onGantiPin,
}: {
  paket: PaketPilihan[] | null;
  onTambah: () => void;
  onUbah: (p: PaketPilihan) => void;
  onHapus: (p: PaketPilihan) => Promise<void>;
  onGantiPin: () => void;
}) {
  const [konfirmasi, setKonfirmasi] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);

  return (
    <>
      <p className="muted">
        Soal yang Anda ketik di sini muncul sebagai tombol <b>★ Soal pilihan</b> untuk anak di kelas dan pelajaran yang sesuai. Anak bisa
        mengerjakannya apa adanya, atau meminta AI membuat soal yang mirip.
      </p>
      <button className="btn" type="button" onClick={onTambah}>
        + Tambah soal pilihan
      </button>
      <div className="set-list">
        {paket === null && <p className="muted">Memuat soal pilihan…</p>}
        {paket?.length === 0 && <p className="note">Belum ada soal pilihan. Tekan &quot;Tambah soal pilihan&quot; untuk membuat yang pertama.</p>}
        {paket?.map((p) => (
          <div key={p.id} className="set-card">
            <b>{p.title}</b>
            <span className="muted small">
              {kelasShort(p.kelas)} · {p.subject} · {p.questions.length} soal
            </span>
            {konfirmasi === p.id ? (
              <div className="stack-6" role="group" aria-label={`Konfirmasi hapus ${p.title}`}>
                <p>
                  <b>Hapus &quot;{p.title}&quot;?</b> Soal ini tidak akan muncul lagi untuk anak.
                </p>
                <div className="row-btns">
                  <button
                    className="btn small danger-solid"
                    type="button"
                    disabled={sibuk}
                    onClick={async () => {
                      setSibuk(true);
                      await onHapus(p).finally(() => setSibuk(false));
                      setKonfirmasi(null);
                    }}
                  >
                    Ya, hapus
                  </button>
                  <button className="btn ghost small" type="button" onClick={() => setKonfirmasi(null)}>
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              <div className="row-btns">
                <button className="btn ghost small" type="button" onClick={() => onUbah(p)}>
                  Ubah
                </button>
                <button className="btn ghost small danger" type="button" onClick={() => setKonfirmasi(p.id)}>
                  Hapus
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      <button className="linkbtn" type="button" onClick={onGantiPin}>
        Ganti PIN admin
      </button>
    </>
  );
}
