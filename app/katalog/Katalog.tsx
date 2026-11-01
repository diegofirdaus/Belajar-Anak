"use client";

import { useEffect, useState } from "react";
import { BoneIcon } from "@/components/BoneIcon";
import { KartuHadiah } from "@/components/KartuHadiah";
import { Pipo } from "@/components/Pipo";
import { Segment } from "@/components/Segment";
import { ThemeBody } from "@/components/ThemeBody";
import { ToastProvider, useToast } from "@/components/Toast";
import { WorldArt } from "@/components/WorldArt";
import { WorldCard } from "@/components/WorldCard";
import { JENJANG_INFO, MAPEL, kelasShort, type Level } from "@/lib/kelas";
import { emptyRewards, type Rewards } from "@/lib/rewards";
import { WORLDS, WORLD_IDS, type WorldId } from "@/lib/worlds";

type Theme = "auto" | "light" | "dark" | WorldId;

const THEMES: { id: Theme; label: string }[] = [
  { id: "auto", label: "Dasar (otomatis)" },
  { id: "light", label: "Dasar terang" },
  { id: "dark", label: "Dasar gelap" },
  ...WORLD_IDS.map((w) => ({ id: w as Theme, label: WORLDS[w].name })),
];

const SWATCHES = ["--bg", "--fg", "--muted", "--card", "--line", "--soft", "--accent", "--accent-fg", "--good", "--bad", "--field-bg", "--opt-bg"];

/** Contoh data hadiah: kosong, di tengah perjalanan, dan hampir/sudah maksimal. */
const CONTOH_HADIAH: { judul: string; r: Rewards }[] = [
  { judul: "Baru mulai", r: emptyRewards() },
  {
    judul: "Di tengah perjalanan",
    r: {
      blok: { kayu: 18, batu: 9, permata: 4 },
      pahlawan: { xp: 230, bosses: 4 },
      antariksa: { fuel: 300 },
      dino: { bones: 5, done: ["T-Rex", "Triceratops"] },
    },
  },
  {
    judul: "Sudah jauh",
    r: {
      blok: { kayu: 60, batu: 50, permata: 45 },
      pahlawan: { xp: 1240, bosses: 31 },
      antariksa: { fuel: 1050 },
      dino: { bones: 2, done: ["T-Rex", "Triceratops", "Stegosaurus", "Brachiosaurus", "Velociraptor", "Ankylosaurus", "T-Rex"] },
    },
  },
];

export function Katalog() {
  return (
    <ToastProvider>
      <KatalogInner />
    </ToastProvider>
  );
}

function KatalogInner() {
  const [theme, setTheme] = useState<Theme>("auto");
  const world = (WORLD_IDS as readonly string[]).includes(theme) ? (theme as WorldId) : null;
  const toast = useToast();

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light" || theme === "dark") root.dataset.theme = theme;
    else delete root.dataset.theme;
    return () => {
      delete root.dataset.theme;
    };
  }, [theme]);

  const [level, setLevel] = useState<Level | "pilihan">("mudah");
  const [jumlah, setJumlah] = useState<"5" | "10">("5");
  const [mapel, setMapel] = useState(MAPEL.SD[0]);
  const [picked, setPicked] = useState<number | null>(null);
  const [pickedWorld, setPickedWorld] = useState<WorldId>("blok");
  const answer = 1;
  const options = ["1/2", "1", "4/8", "2"];

  return (
    <>
      <ThemeBody world={world} />
      <div className="kat-switch">
        <div className="chips" role="group" aria-label="Pilih tema">
          {THEMES.map((t) => (
            <button key={t.id} type="button" className="chip" aria-pressed={theme === t.id} onClick={() => setTheme(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="wrap" style={{ marginTop: 16 }}>
        <header style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <Pipo />
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
            <p className="eyebrow">Katalog komponen · tahap 1</p>
            <h1>Markas Latihan</h1>
            <p className="muted">Semua komponen di bawah hanya membaca token. Ganti tema di atas untuk mengecek.</p>
          </div>
        </header>

        <section className="card">
          <h2>Tipografi</h2>
          <p className="eyebrow">Eyebrow · Fase C Kurikulum Merdeka</p>
          <h1>Judul h1 Ambil misi baru</h1>
          <h2>Judul h2 Riwayat latihan</h2>
          <h3>Judul h3 Pengaturan</h3>
          <p>Teks isi 16px. Setelah menjawab, anak langsung melihat benar/salah, kunci jawaban, dan penjelasan yang ramah anak.</p>
          <p className="muted small">Teks kecil abu-abu, misalnya status penyimpanan.</p>
          <p className="num">Angka tabular: 0123456789 · 4/5 · 1000 liter</p>
          <div className="chips" aria-label="Font dunia">
            {WORLD_IDS.map((w) => (
              <span key={w} className={`tag wf-${w}`} style={{ textTransform: w === "pahlawan" ? "uppercase" : "none" }}>
                {WORLDS[w].name}
              </span>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>Token warna</h2>
          <div className="swatches">
            {SWATCHES.map((s) => (
              <div className="swatch" key={s}>
                <i style={{ background: `var(${s})` }} />
                <code>{s}</code>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>Tombol</h2>
          <button className="btn" type="button" onClick={() => toast("Tersimpan. Muncul untuk Kelas 5 SD di pelajaran Matematika.")}>
            {world ? WORLDS[world].startLabel : "Tombol utama"}
          </button>
          <button className="btn" type="button" disabled>
            Nonaktif
          </button>
          <button className="btn ghost" type="button">
            Coba soal contoh
          </button>
          <div className="row-btns">
            <button className="btn ghost small" type="button">
              Ubah kelas
            </button>
            <button className="btn ghost small" type="button">
              Ganti dunia
            </button>
            <button className="btn ghost small danger" type="button">
              Hapus pemain
            </button>
          </div>
          <div className="row-btns">
            <button className="btn danger-solid" type="button">
              Ya, hapus
            </button>
            <button className="btn ghost" type="button">
              Batal
            </button>
          </div>
          <button className="linkbtn" type="button">
            Mode admin (untuk orang tua)
          </button>
          <p className="muted small">Tombol utama di atas memunculkan toast.</p>
        </section>

        <section className="card">
          <h2>{world ? WORLDS[world].formTitle : "Formulir"}</h2>
          <div className="field">
            <label htmlFor="k-mapel">Mata pelajaran</label>
            <select id="k-mapel" value={mapel} onChange={(e) => setMapel(e.target.value)}>
              {MAPEL.SD.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="k-topik">Materi atau tema</label>
            <input id="k-topik" className="input" type="text" maxLength={120} placeholder="contoh: pecahan senilai" />
          </div>
          <Segment
            label="Level"
            value={level}
            onChange={setLevel}
            options={[
              { value: "mudah", label: "Mudah" },
              { value: "sedang", label: "Sedang" },
              { value: "sulit", label: "Sulit" },
              { value: "pilihan", label: "★ Soal pilihan", wide: true },
            ]}
          />
          <Segment
            label="Jumlah soal"
            columns={2}
            value={jumlah}
            onChange={setJumlah}
            options={[
              { value: "5", label: "5 soal" },
              { value: "10", label: "10 soal" },
            ]}
          />
          <p className="form-msg">Tulis dulu materi yang mau dilatih, misalnya &quot;pecahan&quot; atau &quot;gaya dan gerak&quot;.</p>
          <div className="field">
            <label htmlFor="k-pin">PIN admin</label>
            <input id="k-pin" className="input pin-input" type="password" inputMode="numeric" maxLength={4} autoComplete="off" />
          </div>
          <div className="field">
            <label htmlFor="k-soal">Soal</label>
            <textarea id="k-soal" placeholder={"Ketik atau tempel soal di sini. Tidak harus rapi."} />
          </div>
        </section>

        <section className="card">
          <h2>Chip, progress, status</h2>
          <div className="chips">
            <button type="button" className="chip up">
              Siap naik: Pecahan → sedang
            </button>
            <button type="button" className="chip weak">
              Latih lagi: Bilangan bulat (mudah)
            </button>
            <button type="button" className="chip">
              Matematika
            </button>
          </div>
          <div className="bar" role="progressbar" aria-label="Contoh progres" aria-valuenow={62} aria-valuemin={0} aria-valuemax={100}>
            <i style={{ width: "62%" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span className="tag">mudah · Pecahan</span>
            <span className="muted small num">Soal 3 dari 5</span>
          </div>
          <div className="dots" aria-hidden="true">
            <i className="ok" />
            <i className="no" />
            <i className="now" />
            <i />
            <i />
          </div>
          <div className="note">Level mudah memberi kayu, sedang memberi batu, sulit memberi permata.</div>
          <div className="card accent-left">
            <h3>Tahun ajaran baru sudah mulai!</h3>
            <p>Raka, kamu sudah naik kelas belum?</p>
          </div>
        </section>

        <section className="card">
          <h2>Kartu soal</h2>
          <p className="qtext">Hasil dari 3/4 + 1/4 adalah…</p>
          <div className="opts">
            {options.map((o, i) => {
              const done = picked !== null;
              const cls = done && i === answer ? "opt right" : done && i === picked ? "opt wrong" : "opt";
              return (
                <button key={o} type="button" className={cls} disabled={done} onClick={() => setPicked(i)}>
                  <span className="k">{"ABCD"[i]}</span>
                  <span>{o}</span>
                </button>
              );
            })}
          </div>
          {picked !== null && (
            <div className={picked === answer ? "card fb" : "card fb bad"}>
              <h3>{picked === answer ? "Tepat sekali!" : "Belum tepat, Raka. Tidak apa-apa!"}</h3>
              {picked === answer && <p className="reward-pop">+1 kayu</p>}
              <p className="key">Jawaban yang benar: B. 1</p>
              <p>Penyebutnya sudah sama, jadi cukup jumlahkan pembilangnya: 3 + 1 = 4. Hasilnya 4/4, yaitu 1.</p>
              <button type="button" className="btn ghost" onClick={() => setPicked(null)}>
                Ulangi contoh
              </button>
            </div>
          )}
        </section>

        <section className="card" style={{ alignItems: "center", textAlign: "center" }}>
          <h2>Hasil &amp; memuat</h2>
          <p className="banner win">Misi berhasil!</p>
          <p className="banner lose">Terus menambang!</p>
          <p className="big">4/5</p>
          <p className="muted">80% benar · Pecahan · level mudah</p>
          <div className="spinner" role="img" aria-label="Memuat" />
          <p className="muted small">Biasanya butuh 10–40 detik.</p>
        </section>

        <section className="card">
          <h2>Pipo &amp; chat</h2>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-end" }}>
            <Pipo size="sm" />
            <Pipo />
            <Pipo size="lg" />
          </div>
          <div aria-live="polite" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="chat-row bot">
              <Pipo size="sm" />
              <div className="bub">
                Halo! Aku <b>Pipo</b>, pemandu di Markas Latihan.
              </div>
            </div>
            <div className="chat-row me">
              <div className="bub">Raka</div>
            </div>
            <div className="chat-row bot">
              <Pipo size="sm" />
              <div className="bub" aria-label="Pipo sedang mengetik">
                <span className="typing" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(Object.keys(JENJANG_INFO) as (keyof typeof JENJANG_INFO)[]).map((j) => (
              <button key={j} type="button" className="choice">
                <b>{j}</b>
                <span>{JENJANG_INFO[j].full}</span>
              </button>
            ))}
          </div>
          <div className="kgrid">
            {[7, 8, 9].map((k, i) => (
              <button key={k} type="button" className="choice">
                <b>Kelas {k}</b>
                <span>kelas {i + 1} SMP</span>
              </button>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>Dunia</h2>
          <div className="tgrid">
            {WORLD_IDS.map((w) => (
              <WorldCard key={w} world={w} selected={pickedWorld === w} onSelect={setPickedWorld} />
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {WORLD_IDS.map((w, i) => (
              <button key={w} type="button" className="pl-card">
                <WorldArt world={w} mini />
                <span className="pl-info">
                  <b>{["Raka", "Nadia", "Bima", "Sekar"][i]}</b>
                  <span className="muted small">
                    {kelasShort([5, 8, 11, 2][i])} · {WORLDS[w].name}
                  </span>
                </span>
              </button>
            ))}
            <button type="button" className="pl-add">
              + Pemain baru
            </button>
          </div>
          <div style={{ width: 48, color: "#8a6a3a" }} aria-hidden="true">
            <BoneIcon className="bone-ico" />
          </div>
        </section>
        <section className="stack-12" aria-labelledby="kat-hadiah">
          <h2 id="kat-hadiah">Kartu hadiah (contoh data)</h2>
          {world ? (
            CONTOH_HADIAH.map((c) => (
              <div key={c.judul} className="stack-6">
                <p className="eyebrow">{c.judul}</p>
                <KartuHadiah dunia={world} hadiah={c.r} />
              </div>
            ))
          ) : (
            <p className="muted">Pilih salah satu dunia di atas untuk melihat kartu hadiahnya.</p>
          )}
        </section>
      </main>
    </>
  );
}
