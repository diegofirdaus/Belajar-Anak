"use client";

import { useId, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";
import { api, apiMessage, ApiFailure } from "@/lib/api";
import { loginErrorMessage, loginUlangGoogle } from "@/lib/firebase/client";

const KATA = "HAPUS";

/**
 * Unduh dan hapus semua data keluarga (brief 11, UU PDP).
 * Selain PIN admin, keduanya wajib login ulang dengan akun Google orang tua.
 */
export function DataKeluarga({ sesi, onSesiHabis, onDihapus }: { sesi: string; onSesiHabis: () => void; onDihapus: () => void }) {
  const id = useId();
  const toast = useToast();
  const { logout } = useAuth();
  const [mode, setMode] = useState<"diam" | "hapus">("diam");
  const [ketik, setKetik] = useState("");
  const [sibuk, setSibuk] = useState<null | "unduh" | "hapus">(null);
  const [galat, setGalat] = useState<string | null>(null);

  const pesan = (e: unknown) => (e instanceof ApiFailure ? apiMessage(e) : loginErrorMessage(e));

  async function unduh() {
    setGalat(null);
    setSibuk("unduh");
    try {
      await loginUlangGoogle();
      const data = await api.eksporData(sesi);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `markas-latihan-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      toast("Data keluarga sudah diunduh.");
    } catch (e) {
      if (e instanceof ApiFailure && e.code === "admin_perlu") return onSesiHabis();
      setGalat(pesan(e));
    } finally {
      setSibuk(null);
    }
  }

  async function hapus() {
    if (ketik.trim().toUpperCase() !== KATA) return setGalat(`Ketik ${KATA} untuk melanjutkan.`);
    setGalat(null);
    setSibuk("hapus");
    try {
      await loginUlangGoogle();
      await api.hapusKeluarga(sesi);
      await logout().catch(() => {});
      toast("Semua data keluarga sudah dihapus.");
      onDihapus();
    } catch (e) {
      if (e instanceof ApiFailure && e.code === "admin_perlu") return onSesiHabis();
      setGalat(pesan(e));
      setSibuk(null);
    }
  }

  return (
    <section className="card" aria-labelledby={`${id}-judul`}>
      <h2 id={`${id}-judul`}>Data keluarga</h2>
      <p className="muted small">
        Unduh salinan semua data keluarga, atau hapus semuanya dari Markas Latihan. Keduanya meminta Anda masuk ulang dengan akun Google orang
        tua.
      </p>
      {mode === "diam" ? (
        <div className="row-btns">
          <button type="button" className="btn ghost small" onClick={unduh} disabled={sibuk !== null}>
            {sibuk === "unduh" ? "Menyiapkan data…" : "Unduh semua data"}
          </button>
          <button
            type="button"
            className="btn ghost small danger"
            onClick={() => {
              setMode("hapus");
              setGalat(null);
            }}
          >
            Hapus semua data keluarga
          </button>
        </div>
      ) : (
        <div className="stack-12 danger-box">
          <p>
            <b>Hapus semua data keluarga?</b> Semua pemain, hadiah, riwayat latihan, soal pilihan, dan PIN admin terhapus permanen dan tidak bisa
            dikembalikan. Akun Google Anda tidak terhapus, tetapi tidak lagi tersambung ke Markas Latihan.
          </p>
          <div className="field">
            <label htmlFor={`${id}-ketik`}>Ketik {KATA} untuk melanjutkan</label>
            <input
              id={`${id}-ketik`}
              className="input"
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              value={ketik}
              onChange={(e) => setKetik(e.target.value)}
            />
          </div>
          <div className="row-btns">
            <button
              type="button"
              className="btn danger-solid"
              onClick={hapus}
              disabled={sibuk !== null || ketik.trim().toUpperCase() !== KATA}
            >
              {sibuk === "hapus" ? "Menghapus…" : "Masuk ulang dengan Google lalu hapus"}
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setMode("diam");
                setKetik("");
                setGalat(null);
              }}
              disabled={sibuk !== null}
            >
              Batal
            </button>
          </div>
        </div>
      )}
      {galat && (
        <p className="form-msg" role="alert">
          {galat}
        </p>
      )}
    </section>
  );
}
