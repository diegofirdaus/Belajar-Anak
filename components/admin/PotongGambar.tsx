"use client";

import { useId, useRef, useState } from "react";
import { potongGambar } from "@/lib/foto";
import { geserKotak, rapikanKotak, tarikSudut, type Kotak, type Sudut } from "@/lib/gambarSoal";

const SUDUT: Sudut[] = ["kiri-atas", "kanan-atas", "kiri-bawah", "kanan-bawah"];
const LANGKAH = 0.02;

type Tarik = { mode: "geser" | Sudut; awalX: number; awalY: number; kotak: Kotak; lebar: number; tinggi: number; kiri: number; atas: number };

/**
 * Memotong gambar soal dari foto yang masih ada di HP (STATUS "BERIKUTNYA" no. 3).
 * Kotak bisa digeser (seret di dalam kotak) dan diubah ukurannya (seret sudut) dengan jari,
 * atau dengan keyboard: panah = geser, Shift + panah = ubah ukuran.
 */
export function PotongGambar({
  nomor,
  foto,
  awal,
  onPakai,
  onBatal,
}: {
  nomor: number;
  /** Foto (data URL JPEG) yang dibaca di editor ini. */
  foto: string[];
  awal: Kotak;
  onPakai: (data: string) => void;
  onBatal: () => void;
}) {
  const id = useId();
  const [kotak, setKotak] = useState<Kotak>(() => rapikanKotak({ ...awal, foto: Math.min(awal.foto, foto.length - 1) }));
  const [memotong, setMemotong] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const area = useRef<HTMLDivElement>(null);
  const tarik = useRef<Tarik | null>(null);

  function mulai(e: React.PointerEvent, mode: Tarik["mode"]) {
    const r = area.current?.getBoundingClientRect();
    if (!r) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    tarik.current = { mode, awalX: e.clientX, awalY: e.clientY, kotak, lebar: r.width, tinggi: r.height, kiri: r.left, atas: r.top };
  }

  function gerak(e: React.PointerEvent) {
    const t = tarik.current;
    if (!t) return;
    if (t.mode === "geser") setKotak(geserKotak(t.kotak, (e.clientX - t.awalX) / t.lebar, (e.clientY - t.awalY) / t.tinggi));
    else setKotak(tarikSudut(t.kotak, t.mode, (e.clientX - t.kiri) / t.lebar, (e.clientY - t.atas) / t.tinggi));
  }

  function selesai() {
    tarik.current = null;
  }

  function tombol(e: React.KeyboardEvent) {
    const arah: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const d = arah[e.key];
    if (!d) return;
    e.preventDefault();
    const [dx, dy] = [d[0] * LANGKAH, d[1] * LANGKAH];
    setKotak((k) => (e.shiftKey ? tarikSudut(k, "kanan-bawah", k.x2 + dx, k.y2 + dy) : geserKotak(k, dx, dy)));
  }

  async function pakai() {
    setMemotong(true);
    setGalat(null);
    try {
      onPakai(await potongGambar(foto[kotak.foto], kotak));
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gambar tidak bisa dipotong.");
    } finally {
      setMemotong(false);
    }
  }

  const pct = (v: number) => `${(v * 100).toFixed(2)}%`;

  return (
    <div className="potong" role="group" aria-labelledby={`${id}-judul`}>
      <p id={`${id}-judul`} className="small">
        <b>Potong gambar soal {nomor}.</b> Geser kotak dengan jari, tarik sudutnya untuk mengubah ukuran.
      </p>
      {foto.length > 1 && (
        <div className="row-btns potong-foto">
          {foto.map((_, i) => (
            <button
              key={i}
              type="button"
              className={i === kotak.foto ? "btn small" : "btn ghost small"}
              aria-pressed={i === kotak.foto}
              onClick={() => setKotak((k) => ({ ...k, foto: i }))}
            >
              Foto {i + 1}
            </button>
          ))}
        </div>
      )}
      <div className="potong-area" ref={area} onPointerMove={gerak} onPointerUp={selesai} onPointerCancel={selesai}>
        {/* eslint-disable-next-line @next/next/no-img-element -- foto lokal di memori HP */}
        <img src={foto[kotak.foto]} alt={`Foto ${kotak.foto + 1}`} draggable={false} />
        <div
          className="potong-kotak"
          style={{ left: pct(kotak.x1), top: pct(kotak.y1), width: pct(kotak.x2 - kotak.x1), height: pct(kotak.y2 - kotak.y1) }}
          tabIndex={0}
          role="application"
          aria-label="Kotak potong. Panah untuk menggeser, Shift dan panah untuk mengubah ukuran."
          onPointerDown={(e) => mulai(e, "geser")}
          onKeyDown={tombol}
        >
          {SUDUT.map((s) => (
            <span key={s} className={`potong-sudut ${s}`} aria-hidden="true" onPointerDown={(e) => mulai(e, s)} />
          ))}
        </div>
      </div>
      {galat && (
        <p className="form-msg" role="alert">
          {galat}
        </p>
      )}
      <div className="row-btns">
        <button type="button" className="btn" onClick={pakai} disabled={memotong}>
          {memotong ? "Memotong…" : "Pakai gambar ini"}
        </button>
        <button type="button" className="btn ghost" onClick={onBatal}>
          Batal
        </button>
      </div>
    </div>
  );
}
