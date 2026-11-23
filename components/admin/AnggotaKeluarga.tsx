"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { useToast } from "@/components/Toast";
import { api, apiMessage, ApiFailure, type RingkasanAnggota } from "@/lib/api";

/**
 * Anggota keluarga: akun Google lain (mis. pasangan) yang memakai data keluarga yang sama.
 * Pemilik bisa mengundang lewat email dan mencabut; anggota hanya melihat daftar.
 */
export function AnggotaKeluarga({
  sesi,
  onSesiHabis,
  onPeran,
}: {
  sesi: string;
  onSesiHabis: () => void;
  /** Peran akun ini (untuk menyembunyikan tombol khusus pemilik di bagian lain). */
  onPeran: (peran: RingkasanAnggota["saya"]) => void;
}) {
  const id = useId();
  const toast = useToast();
  const [data, setData] = useState<RingkasanAnggota | null>(null);
  const [email, setEmail] = useState("");
  const [sibuk, setSibuk] = useState<string | null>(null);
  const [galat, setGalat] = useState<string | null>(null);

  const gagal = (e: unknown) => {
    if (e instanceof ApiFailure && e.code === "admin_perlu") return onSesiHabis();
    setGalat(apiMessage(e));
  };

  useEffect(() => {
    api
      .anggota(sesi)
      .then((r) => {
        setData(r);
        onPeran(r.saya);
      })
      .catch(gagal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesi]);

  async function undang(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return setGalat("Tulis alamat email Google anggota keluarga dulu, ya.");
    setGalat(null);
    setSibuk("undang");
    try {
      setData(await api.undangAnggota(sesi, email.trim()));
      toast(`${email.trim()} ditambahkan. Minta dia masuk dengan akun Google itu.`);
      setEmail("");
    } catch (err) {
      gagal(err);
    } finally {
      setSibuk(null);
    }
  }

  async function cabut(target: string) {
    setGalat(null);
    setSibuk(target);
    try {
      setData(await api.cabutAnggota(sesi, target));
      toast(`${target} tidak lagi menjadi anggota keluarga.`);
    } catch (err) {
      gagal(err);
    } finally {
      setSibuk(null);
    }
  }

  const pemilik = data?.saya === "pemilik";

  return (
    <section className="card" aria-labelledby={`${id}-judul`}>
      <h2 id={`${id}-judul`}>Anggota keluarga</h2>
      <p className="muted small">
        Orang tua lain (misalnya pasangan) bisa masuk dengan akun Google-nya sendiri dan melihat anak, soal pilihan, dan progres yang sama. Mode
        admin memakai PIN yang sama.
      </p>
      {!data ? (
        !galat && <p className="muted small">Memuat anggota…</p>
      ) : (
        <ul className="anggota-list">
          <li>
            <span className="anggota-email">{data.emailPemilik ?? "Akun pemilik"}</span>
            <span className="tag">Pemilik{pemilik ? " (Anda)" : ""}</span>
          </li>
          {data.anggota.map((a) => (
            <li key={a.email}>
              <span className="anggota-email">{a.email}</span>
              <span className="tag">{a.status === "bergabung" ? "Anggota" : "Menunggu masuk"}</span>
              {pemilik && (
                <button type="button" className="linkbtn danger" disabled={sibuk !== null} onClick={() => cabut(a.email)} aria-label={`Cabut ${a.email}`}>
                  {sibuk === a.email ? "Mencabut…" : "Cabut"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {pemilik && (
        <form className="stack-12" onSubmit={undang} noValidate>
          <div className="field">
            <label htmlFor={`${id}-email`}>Email Google anggota baru</label>
            <input
              id={`${id}-email`}
              className="input"
              type="email"
              inputMode="email"
              autoComplete="off"
              autoCapitalize="none"
              placeholder="nama@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <span className="pv-note">
              Setelah ditambahkan, dia cukup masuk ke Markas Latihan dengan akun Google itu. Data yang pernah dia buat di akunnya sendiri akan
              dihapus dan diganti data keluarga ini.
            </span>
          </div>
          <button type="submit" className="btn ghost small" disabled={sibuk !== null}>
            {sibuk === "undang" ? "Menambahkan…" : "Tambah anggota"}
          </button>
        </form>
      )}
      {data && !pemilik && <p className="pv-note">Hanya pemilik keluarga yang bisa menambah atau mencabut anggota.</p>}
      {galat && (
        <p className="form-msg" role="alert">
          {galat}
        </p>
      )}
    </section>
  );
}
