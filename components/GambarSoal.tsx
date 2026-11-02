"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

/** Gambar soal yang sudah diambil, disimpan selama halaman terbuka supaya tidak diunduh ulang. */
const simpanan = new Map<string, Promise<string>>();

function muat(id: string): Promise<string> {
  let p = simpanan.get(id);
  if (!p) {
    p = api.gambar(id).then((r) => `data:${r.media_type};base64,${r.data}`);
    p.catch(() => simpanan.delete(id));
    simpanan.set(id, p);
  }
  return p;
}

/**
 * Gambar di atas soal (STATUS "BERIKUTNYA" no. 3). Ketuk untuk memperbesar.
 * `data` (base64 JPEG) dipakai untuk potongan yang belum diunggah (editor).
 */
export function GambarSoal({ id, data, alt, perbesar = true }: { id?: string; data?: string; alt: string; perbesar?: boolean }) {
  const [muatan, setMuatan] = useState<{ id: string; url: string | null; galat: boolean } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (data || !id) return;
    let aktif = true;
    muat(id)
      .then((u) => aktif && setMuatan({ id, url: u, galat: false }))
      .catch(() => aktif && setMuatan({ id, url: null, galat: true }));
    return () => {
      aktif = false;
    };
  }, [id, data]);

  const url = data ? `data:image/jpeg;base64,${data}` : muatan && muatan.id === id ? muatan.url : null;
  const galat = !data && Boolean(muatan && muatan.id === id && muatan.galat);

  if (!url)
    return (
      <div className="gambar-soal kosong">
        <p className="muted small">{galat ? "Gambar tidak bisa dimuat." : "Memuat gambar…"}</p>
      </div>
    );

  return (
    <figure className="gambar-soal">
      {perbesar ? (
        <button type="button" className="gambar-btn" onClick={() => dialog.current?.showModal()} aria-label={`${alt}. Ketuk untuk memperbesar`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL dari server sendiri */}
          <img src={url} alt="" />
        </button>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} />
      )}
      {perbesar && (
        <dialog ref={dialog} className="gambar-dialog" aria-label={alt} onClick={(e) => e.target === dialog.current && dialog.current?.close()}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={alt} />
          <button type="button" className="btn" onClick={() => dialog.current?.close()}>
            Tutup
          </button>
        </dialog>
      )}
    </figure>
  );
}
