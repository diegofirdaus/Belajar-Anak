"use client";

import { useEffect, useId, useRef, useState } from "react";
import { GambarSoal } from "@/components/GambarSoal";
import { Pipo } from "@/components/Pipo";
import { ApiFailure, api, apiMessage } from "@/lib/api";
import { bisaDitambah } from "@/lib/esai";
import { KALIMAT_BENAR, labelLevel, teksHadiahSatu } from "@/lib/latihan";
import type { Rewards } from "@/lib/rewards";
import type { HasilJawab, PaketSesi } from "@/lib/soal";
import { ESAI_JAWABAN_MAKS } from "@/lib/soalPilihan";
import type { WorldId } from "@/lib/worlds";
import { HudDunia } from "./HudDunia";

const HURUF = "ABCD";
const kurangiGerak = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const acak = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

export type AkhirSesi = NonNullable<HasilJawab["akhir"]>;

/**
 * Mengerjakan soal (brief 7.6). Kunci dan penjelasan baru diterima dari server setelah anak menjawab.
 * Hadiah sudah tersimpan di server setiap jawaban benar; `onRewards` menyalin hadiah terbaru ke markas.
 */
export function Mengerjakan({
  pemainId,
  nama,
  dunia,
  paket,
  awal,
  kini,
  onRewards,
  onSelesai,
  onKeluar,
}: {
  pemainId: string;
  nama: string;
  dunia: WorldId;
  paket: PaketSesi;
  awal: Rewards;
  kini: Rewards;
  onRewards: (r: Rewards) => void;
  onSelesai: (a: AkhirSesi) => void;
  onKeluar: () => void;
}) {
  const n = paket.soal.length;
  const [i, setI] = useState(0);
  const [hasil, setHasil] = useState<(HasilJawab | null)[]>(() => Array(n).fill(null));
  const [judul, setJudul] = useState("");
  const [memeriksa, setMemeriksa] = useState<number | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [kena, setKena] = useState(0);
  const [teks, setTeks] = useState("");
  const idEsai = useId();
  const fb = useRef<HTMLDivElement>(null);
  const teksSoal = useRef<HTMLParagraphElement>(null);

  const soal = paket.soal[i];
  const h = hasil[i];
  const benar = hasil.filter((x) => x?.benar).length;
  const salah = hasil.filter((x) => x && !x.benar).length;
  const terakhir = i === n - 1;

  useEffect(() => {
    if (!h) return;
    const t = setTimeout(() => {
      fb.current?.scrollIntoView({ behavior: kurangiGerak() ? "auto" : "smooth", block: "nearest" });
      fb.current?.focus({ preventScroll: true });
    }, 60);
    return () => clearTimeout(t);
  }, [h]);

  async function jawab(k: number) {
    if (h || memeriksa !== null) return;
    const esai = soal.jenis === "esai";
    if (esai && !teks.trim()) return setGalat("Tulis dulu jawabanmu, ya.");
    setMemeriksa(k);
    setGalat(null);
    try {
      const r = await api.jawab(paket.sesiId, esai ? { pemainId, nomor: i, teks } : { pemainId, nomor: i, pilihan: k });
      setJudul(r.benar ? acak(KALIMAT_BENAR[dunia]) : `Belum tepat, ${nama}. Tidak apa-apa!`);
      setHasil((lama) => lama.map((x, j) => (j === i ? r : x)));
      onRewards(r.rewards);
      if (r.benar && dunia === "pahlawan") setKena((x) => x + 1);
    } catch (e) {
      const code = e instanceof ApiFailure ? e.code : "";
      if (esai && code === "ai_belum_siap") setGalat("Pipo belum bisa memeriksa jawaban esai sekarang. Coba lagi nanti, atau minta orang tua mengecek.");
      else if (esai && (code === "json_rusak" || code === "gangguan" || code === "jaringan"))
        setGalat("Pipo belum selesai memeriksa. Tekan Periksa sekali lagi.");
      else setGalat(apiMessage(e));
    } finally {
      setMemeriksa(null);
    }
  }

  function lanjut() {
    if (!terakhir) {
      setI(i + 1);
      setGalat(null);
      setTeks("");
      window.scrollTo(0, 0);
      requestAnimationFrame(() => teksSoal.current?.focus({ preventScroll: true }));
      return;
    }
    const akhir = h?.akhir ?? { benar, n, bossKalah: false };
    onSelesai(akhir);
  }

  const tag = paket.level === "pilihan" ? `soal pilihan · ${paket.topik}` : `${labelLevel(paket.level)} · ${paket.topik}`;

  return (
    <main className="wrap">
      <div className="qtop">
        <span className="tag">{tag}</span>
        <span className="muted num qcount">
          Soal {i + 1} dari {n}
        </span>
      </div>
      <div className="dots" aria-hidden="true">
        {paket.soal.map((_, k) => (
          <i key={k} className={hasil[k] ? (hasil[k]!.benar ? "ok" : "no") : k === i ? "now" : ""} />
        ))}
      </div>

      <HudDunia dunia={dunia} awal={awal} kini={kini} benar={benar} salah={salah} n={n} kena={kena} />

      <section className="card" aria-label={`Soal ${i + 1}`}>
        {soal.gambarId && <GambarSoal key={soal.gambarId} id={soal.gambarId} alt={`Gambar untuk soal ${i + 1}`} />}
        <p className="qtext" ref={teksSoal} tabIndex={-1}>
          {soal.q}
        </p>
        {soal.jenis === "esai" ? (
          <div className="esai-jawab">
            <label htmlFor={`${idEsai}-jawab`}>Jawabanmu</label>
            <textarea
              id={`${idEsai}-jawab`}
              maxLength={ESAI_JAWABAN_MAKS}
              value={h?.esai?.teks ?? teks}
              disabled={Boolean(h) || memeriksa !== null}
              placeholder="Tulis jawabanmu dengan kalimatmu sendiri."
              aria-describedby={`${idEsai}-sisa`}
              onChange={(e) => setTeks(e.target.value)}
            />
            <span id={`${idEsai}-sisa`} className="muted small num">
              {(h?.esai?.teks ?? teks).length}/{ESAI_JAWABAN_MAKS} huruf
            </span>
            {!h && (
              <button type="button" className="btn" disabled={memeriksa !== null} onClick={() => jawab(0)}>
                {memeriksa !== null ? "Memeriksa…" : "Periksa"}
              </button>
            )}
          </div>
        ) : (
          <div className="opts">
            {soal.options.map((o, k) => {
              const kelas = h ? (k === h.answer ? "opt right" : k === h.pilihan ? "opt wrong" : "opt") : "opt";
              return (
                <button
                  key={`${i}-${k}`}
                  type="button"
                  className={kelas}
                  disabled={Boolean(h) || memeriksa !== null}
                  aria-busy={memeriksa === k || undefined}
                  onClick={() => jawab(k)}
                >
                  <span className="k">{HURUF[k]}</span>
                  <span>{o}</span>
                </button>
              );
            })}
          </div>
        )}
        {memeriksa !== null &&
          (soal.jenis === "esai" ? (
            <p className="pipo-periksa" role="status">
              <Pipo size="sm" /> Pipo sedang memeriksa jawabanmu…
            </p>
          ) : (
            <p className="muted small">Memeriksa jawaban…</p>
          ))}
        {galat && (
          <p className="form-msg" role="alert">
            {galat}
          </p>
        )}
      </section>

      {h && (
        <div ref={fb} className={h.benar ? "card fb" : "card fb bad"} tabIndex={-1} aria-live="polite">
          <h3>{judul}</h3>
          {h.hadiah && (
            <p className="reward-pop" key={i}>
              {teksHadiahSatu(h.hadiah)}
            </p>
          )}
          {h.esai ? (
            <>
              <ul className="esai-hasil">
                {h.esai.poin
                  .filter((p) => p.wajib)
                  .map((p, k) => (
                    <li key={k} className={p.ada ? "ada" : "belum"}>
                      <span aria-hidden="true">{p.ada ? "✓" : "✗"}</span> {p.ada ? p.poin : `Belum ada: ${p.poin}`}
                    </li>
                  ))}
              </ul>
              {h.esai.keliru && <p>Ada yang keliru: {h.esai.keliru}</p>}
              {bisaDitambah(h.esai).length > 0 && <p className="muted">Bisa ditambah: {bisaDitambah(h.esai).join("; ")}.</p>}
              {h.esai.contoh && (
                <p className="key">
                  Contoh jawaban: <span className="esai-contoh-teks">{h.esai.contoh}</span>
                </p>
              )}
            </>
          ) : (
            <p className="key">
              Jawaban yang benar: {HURUF[h.answer]}. {soal.options[h.answer]}
            </p>
          )}
          {h.explain && <p>{h.explain}</p>}
          <button type="button" className="btn" onClick={lanjut}>
            {terakhir ? "Lihat hasil" : "Soal berikutnya"}
          </button>
        </div>
      )}

      <button type="button" className="linkbtn" onClick={onKeluar}>
        Berhenti dan kembali ke markas
      </button>
    </main>
  );
}
