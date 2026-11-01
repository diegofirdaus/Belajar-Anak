"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useToast } from "@/components/Toast";
import { api, apiMessage, ApiFailure } from "@/lib/api";
import { loginErrorMessage, loginUlangGoogle } from "@/lib/firebase/client";

/**
 * PIN admin (brief 7.8). `buat`: PIN pertama atau ganti PIN. Selain itu: masukkan PIN.
 * PIN dicek di server; 5 kali salah → jeda 5 menit. Lupa PIN → login ulang Google.
 */
export function GerbangPin({
  buat,
  ganti,
  sesi,
  onMasuk,
  onPinDihapus,
  onBatal,
}: {
  buat: boolean;
  ganti?: boolean;
  sesi?: string;
  onMasuk: (token: string) => void;
  onPinDihapus: () => void;
  onBatal?: () => void;
}) {
  const id = useId();
  const toast = useToast();
  const [pin1, setPin1] = useState("");
  const [pin2, setPin2] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [lupa, setLupa] = useState(false);
  const masukan = useRef<HTMLInputElement>(null);

  useEffect(() => {
    masukan.current?.focus({ preventScroll: true });
  }, [buat]);

  async function kirim(e: FormEvent) {
    e.preventDefault();
    const v = pin1.trim();
    if (!/^\d{4}$/.test(v)) return setGalat("PIN harus 4 angka.");
    if (buat && v !== pin2.trim()) return setGalat("PIN yang diulang belum sama. Coba ketik lagi.");
    setGalat(null);
    setSibuk(true);
    try {
      const token = buat ? await api.aturPin(v, sesi) : await api.masukAdmin(v);
      if (buat) toast(ganti ? "PIN admin sudah diganti." : "PIN admin tersimpan.");
      onMasuk(token);
    } catch (err) {
      setGalat(apiMessage(err));
      setPin1("");
      setPin2("");
      masukan.current?.focus();
    } finally {
      setSibuk(false);
    }
  }

  async function resetLewatGoogle() {
    setGalat(null);
    setSibuk(true);
    try {
      await loginUlangGoogle();
      await api.resetPin();
      toast("PIN lama dihapus. Buat PIN baru, ya.");
      setLupa(false);
      onPinDihapus();
    } catch (err) {
      setGalat(err instanceof ApiFailure ? apiMessage(err) : loginErrorMessage(err));
    } finally {
      setSibuk(false);
    }
  }

  const pinInput = (nilai: string, ubah: (v: string) => void, label: string, kunci: string, ref?: React.Ref<HTMLInputElement>) => (
    <div className="field">
      <label htmlFor={`${id}-${kunci}`}>{label}</label>
      <input
        ref={ref}
        id={`${id}-${kunci}`}
        className="input pin-input"
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        autoComplete="off"
        value={nilai}
        onChange={(e) => ubah(e.target.value.replace(/\D/g, "").slice(0, 4))}
      />
    </div>
  );

  return (
    <>
      <form className="card" onSubmit={kirim} noValidate>
        <p>
          {buat
            ? "Buat PIN 4 angka untuk mode admin. Simpan baik-baik dan jangan beri tahu anak-anak, ya."
            : "Masukkan PIN admin untuk mengatur soal pilihan."}
        </p>
        {pinInput(pin1, setPin1, buat ? "PIN baru" : "PIN admin", "1", masukan)}
        {buat && pinInput(pin2, setPin2, "Ulangi PIN", "2")}
        {galat && (
          <p className="form-msg" role="alert">
            {galat}
          </p>
        )}
        <button className="btn" type="submit" disabled={sibuk}>
          {buat ? "Simpan PIN" : "Masuk"}
        </button>
        {onBatal && (
          <button className="btn ghost" type="button" onClick={onBatal}>
            Batal
          </button>
        )}
      </form>

      {!buat &&
        (lupa ? (
          <div className="card">
            <p>
              <b>Lupa PIN?</b> Masuk ulang dengan akun Google orang tua. Setelah itu PIN lama dihapus dan Anda bisa membuat PIN baru.
            </p>
            <div className="row-btns">
              <button className="btn" type="button" onClick={resetLewatGoogle} disabled={sibuk}>
                Masuk ulang dengan Google
              </button>
              <button className="btn ghost" type="button" onClick={() => setLupa(false)}>
                Batal
              </button>
            </div>
          </div>
        ) : (
          <button className="linkbtn" type="button" onClick={() => setLupa(true)}>
            Lupa PIN?
          </button>
        ))}
    </>
  );
}
