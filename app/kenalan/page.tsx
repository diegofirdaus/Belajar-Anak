"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Pipo } from "@/components/Pipo";
import { RequireLogin } from "@/components/RequireLogin";
import { WorldCard } from "@/components/WorldCard";
import { api, apiMessage } from "@/lib/api";
import { setDevicePlayer } from "@/lib/device";
import { JENJANG_INFO, kelasInJenjang, kelasShort, type Jenjang } from "@/lib/kelas";
import { playerName } from "@/lib/player";
import { WORLDS, WORLD_IDS, type WorldId } from "@/lib/worlds";

export default function Kenalan() {
  return <RequireLogin>{() => <Percakapan />}</RequireLogin>;
}

type Pesan = { id: number; dari: "bot" | "aku"; isi: ReactNode };
type Langkah = 1 | 2 | 3 | 4 | 5;

const JEDA_MENGETIK = 550;
const JEDA_ANTAR_PESAN = 180;
const tunggu = (ms: number) => new Promise((r) => setTimeout(r, ms));
const SAPAAN: ReactNode[] = [
  <>
    Halo! Aku <b>Pipo</b>, pemandu di Markas Latihan.
  </>,
  "Biar akrab, kamu biasa dipanggil siapa?",
];
const kurangiGerak = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Perkenalan gaya chat dengan Pipo (brief 7.3). */
function Percakapan() {
  const router = useRouter();
  const [pesan, setPesan] = useState<Pesan[]>([]);
  const [mengetik, setMengetik] = useState(false);
  const [siap, setSiap] = useState(false);
  const [langkah, setLangkah] = useState<Langkah>(1);
  const [nama, setNama] = useState("");
  const [isianNama, setIsianNama] = useState("");
  const [jenjang, setJenjang] = useState<Jenjang | null>(null);
  const [kelas, setKelas] = useState<number | null>(null);
  const [dunia, setDunia] = useState<WorldId | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);
  const [adaPemainLain, setAdaPemainLain] = useState(false);

  const putaran = useRef(0);
  const nomor = useRef(0);
  const areaInput = useRef<HTMLDivElement>(null);
  const kolomNama = useRef<HTMLInputElement>(null);

  const tambah = useCallback((dari: Pesan["dari"], isi: ReactNode) => {
    nomor.current += 1;
    const id = nomor.current;
    setPesan((p) => [...p, { id, dari, isi }]);
  }, []);

  /**
   * Pipo mengirim beberapa pesan berurutan, lalu area jawaban muncul.
   * Selalu dimulai setelah satu jeda supaya urutan yang dibatalkan (mis. remount) tidak ikut menulis.
   */
  const pipoBerkata = useCallback(
    async (baris: ReactNode[]) => {
      const ini = ++putaran.current;
      const cepat = kurangiGerak();
      for (let i = 0; i < baris.length; i++) {
        await tunggu(cepat ? 0 : i > 0 ? JEDA_ANTAR_PESAN : 0);
        if (ini !== putaran.current) return;
        if (!cepat) {
          setMengetik(true);
          await tunggu(JEDA_MENGETIK);
        }
        if (ini !== putaran.current) return;
        setMengetik(false);
        tambah("bot", baris[i]);
      }
      setSiap(true);
    },
    [tambah],
  );

  /** Untuk tombol "Ulangi perkenalan". */
  function ulangi() {
    setSiap(false);
    setPesan([]);
    setLangkah(1);
    setNama("");
    setIsianNama("");
    setJenjang(null);
    setKelas(null);
    setDunia(null);
    setGalat(null);
    void pipoBerkata(SAPAAN);
  }

  useEffect(() => {
    const p = putaran;
    const t = setTimeout(() => void pipoBerkata(SAPAAN), 0);
    return () => {
      clearTimeout(t);
      p.current++; // batalkan urutan pesan yang masih berjalan
    };
  }, [pipoBerkata]);

  useEffect(() => {
    let hidup = true;
    api
      .listPlayers()
      .then((p) => hidup && setAdaPemainLain(p.length > 0))
      .catch(() => {});
    return () => {
      hidup = false;
    };
  }, []);

  // Area jawaban selalu terlihat setelah Pipo selesai bicara.
  useEffect(() => {
    if (!siap) return;
    areaInput.current?.scrollIntoView({ block: "nearest", behavior: kurangiGerak() ? "auto" : "smooth" });
    if (langkah === 1) kolomNama.current?.focus({ preventScroll: true });
  }, [siap, langkah]);

  function kirimNama(e: FormEvent) {
    e.preventDefault();
    const hasil = playerName.safeParse(isianNama);
    if (!hasil.success) {
      setGalat("Tulis dulu nama panggilanmu, ya.");
      return;
    }
    setGalat(null);
    setSiap(false);
    setNama(hasil.data);
    tambah("aku", hasil.data);
    setLangkah(2);
    void pipoBerkata([
      <>
        Hai, <b>{hasil.data}</b>! Senang kenalan sama kamu.
      </>,
      "Sekarang kamu sekolah di mana?",
    ]);
  }

  function pilihJenjang(j: Jenjang) {
    setSiap(false);
    setJenjang(j);
    tambah("aku", j);
    setLangkah(3);
    void pipoBerkata([`Oke, ${j}! Kamu kelas berapa?`]);
  }

  function pilihKelas(k: number) {
    setSiap(false);
    setKelas(k);
    tambah("aku", `Kelas ${k}`);
    setLangkah(4);
    void pipoBerkata([
      `Kelas ${k}, siap! Nanti soal-soalnya aku sesuaikan dengan pelajaran ${kelasShort(k)}.`,
      "Terakhir nih. Kamu mau berpetualang di dunia yang mana?",
    ]);
  }

  function pilihDunia(w: WorldId) {
    setSiap(false);
    setDunia(w);
    tambah("aku", WORLDS[w].name);
    setLangkah(5);
    void pipoBerkata([
      <>
        Pilihan keren! Selamat datang di <b>{WORLDS[w].name}</b>, {nama}.
      </>,
      WORLDS[w].rewardText,
    ]);
  }

  async function masukMarkas() {
    if (!kelas || !dunia) return;
    setMenyimpan(true);
    setGalat(null);
    try {
      const p = await api.createPlayer({ name: nama, kelas, theme: dunia });
      setDevicePlayer(p.id);
      router.replace(`/main/${p.id}`);
    } catch (e) {
      setGalat(apiMessage(e));
      setMenyimpan(false);
    }
  }

  return (
    <main className="wrap">
      <header className="screen-head">
        <Pipo />
        <div className="grow">
          <p className="eyebrow">Kenalan dulu, yuk</p>
          <div className="steps" aria-label={`Langkah ${Math.min(langkah, 4)} dari 4`}>
            {[1, 2, 3, 4].map((i) => (
              <i key={i} className={i <= langkah ? "on" : undefined} />
            ))}
          </div>
        </div>
        {adaPemainLain && (
          <Link className="linkbtn" href="/pemain">
            Batal
          </Link>
        )}
      </header>

      <div className="ob-log" aria-live="polite">
        {pesan.map((m) =>
          m.dari === "bot" ? (
            <div key={m.id} className="chat-row bot">
              <Pipo size="sm" />
              <div className="bub">{m.isi}</div>
            </div>
          ) : (
            <div key={m.id} className="chat-row me">
              <div className="bub">{m.isi}</div>
            </div>
          ),
        )}
        {mengetik && (
          <div className="chat-row bot">
            <Pipo size="sm" />
            <div className="bub" role="status" aria-label="Pipo sedang mengetik">
              <span className="typing" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="ob-input" ref={areaInput}>
        {siap && langkah === 1 && (
          <form className="ob-form" onSubmit={kirimNama} noValidate>
            <label htmlFor="ob-nama" className="sr-only">
              Nama panggilan
            </label>
            <input
              id="ob-nama"
              ref={kolomNama}
              className="input"
              type="text"
              placeholder="Nama panggilan kamu"
              maxLength={20}
              autoComplete="off"
              autoCapitalize="words"
              enterKeyHint="next"
              value={isianNama}
              onChange={(e) => setIsianNama(e.target.value)}
            />
            <button type="submit" className="btn">
              Lanjut
            </button>
          </form>
        )}

        {siap && langkah === 2 && (
          <div className="choice-list">
            {(Object.keys(JENJANG_INFO) as Jenjang[]).map((j) => (
              <button key={j} type="button" className="choice" onClick={() => pilihJenjang(j)}>
                <b>{j}</b>
                <span>{JENJANG_INFO[j].full}</span>
              </button>
            ))}
          </div>
        )}

        {siap && langkah === 3 && jenjang && (
          <div className="kgrid">
            {JENJANG_INFO[jenjang].kelas.map((k) => (
              <button key={k} type="button" className="choice" onClick={() => pilihKelas(k)}>
                <b>Kelas {k}</b>
                {jenjang !== "SD" && (
                  <span>
                    kelas {kelasInJenjang(k)} {jenjang}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {siap && langkah === 4 && (
          <div className="tgrid">
            {WORLD_IDS.map((w) => (
              <WorldCard key={w} world={w} onSelect={pilihDunia} />
            ))}
          </div>
        )}

        {siap && langkah === 5 && (
          <>
            <button type="button" className="btn" onClick={masukMarkas} disabled={menyimpan}>
              {menyimpan ? "Menyiapkan markas…" : "Masuk ke markas"}
            </button>
            <button type="button" className="linkbtn" onClick={ulangi} disabled={menyimpan}>
              Ulangi perkenalan
            </button>
          </>
        )}

        {galat && (
          <p className="form-msg" role="alert">
            {galat}
          </p>
        )}
      </div>
    </main>
  );
}
