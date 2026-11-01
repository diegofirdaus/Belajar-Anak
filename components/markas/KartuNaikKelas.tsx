"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";
import { api, apiMessage } from "@/lib/api";
import { academicYear, kelasShort } from "@/lib/kelas";
import type { Player } from "@/lib/player";

/** Muncul sekali per tahun ajaran baru (mulai Juli), brief 9.3. */
export function KartuNaikKelas({ pemain, onUbah }: { pemain: Player; onUbah: (p: Player) => void }) {
  const toast = useToast();
  const [sibuk, setSibuk] = useState(false);
  if (!(pemain.academicYear < academicYear())) return null;

  async function simpan(u: Parameters<typeof api.updatePlayer>[1], pesan?: string) {
    setSibuk(true);
    try {
      onUbah(await api.updatePlayer(pemain.id, u));
      if (pesan) toast(pesan);
    } catch (e) {
      toast(apiMessage(e));
    } finally {
      setSibuk(false);
    }
  }

  if (pemain.kelas >= 12)
    return (
      <section className="card accent-left" aria-live="polite">
        <h3>Tahun ajaran baru sudah mulai!</h3>
        <p>Kalau kelasmu berubah, ubah lewat Pengaturan di bawah.</p>
        <div className="row-btns">
          <button type="button" className="btn small" disabled={sibuk} onClick={() => simpan({ konfirmasiTahunAjaran: true })}>
            Oke
          </button>
        </div>
      </section>
    );

  const naik = pemain.kelas + 1;
  return (
    <section className="card accent-left" aria-live="polite">
      <h3>Tahun ajaran baru sudah mulai!</h3>
      <p>{pemain.name}, kamu sudah naik kelas belum?</p>
      <div className="row-btns">
        <button
          type="button"
          className="btn small"
          disabled={sibuk}
          onClick={() => simpan({ kelas: naik }, `Selamat naik kelas, ${pemain.name}!`)}
        >
          Sudah, sekarang {kelasShort(naik)}
        </button>
        <button type="button" className="btn ghost small" disabled={sibuk} onClick={() => simpan({ konfirmasiTahunAjaran: true })}>
          Belum, masih {kelasShort(pemain.kelas)}
        </button>
      </div>
    </section>
  );
}
