"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { api, apiMessage, ApiFailure } from "@/lib/api";
import { getDevicePlayer } from "@/lib/device";
import { kelasShort } from "@/lib/kelas";
import { labelLevel, tanggalPendek, type Riwayat } from "@/lib/latihan";
import {
  aktivitas,
  bandingBulan,
  bisaDibantu,
  daftarBulan,
  kapan,
  kunciBulan,
  mapelTerurut,
  namaBulan,
  namaBulanPendek,
  ringkas,
  ringkasHadiah,
  statusAnak,
  trenMapel,
  type DataProgres,
  type ProgresPemain,
  type TitikTren,
} from "@/lib/progres";
import { WORLDS } from "@/lib/worlds";

const HURUF = "ABCD";
const AWAL_RIWAYAT = 10;

/**
 * Dashboard progres orang tua (mode admin), v2:
 * status 7 hari terakhir per anak, aktivitas, tren nilai per mapel, perbandingan bulanan,
 * saran bantuan, lalu detail yang dilipat.
 */
export function ProgresAnak({ sesi, onSesiHabis }: { sesi: string; onSesiHabis: () => void }) {
  const [data, setData] = useState<DataProgres | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [pilih, setPilih] = useState<string | null>(null);

  useEffect(() => {
    let hidup = true;
    api
      .progres(sesi)
      .then((d) => {
        if (!hidup) return;
        setData(d);
        const hp = getDevicePlayer();
        setPilih(d.pemain.find((p) => p.id === hp)?.id ?? d.pemain[0]?.id ?? null);
      })
      .catch((e) => {
        if (!hidup) return;
        if (e instanceof ApiFailure && e.code === "admin_perlu") onSesiHabis();
        else setGalat(apiMessage(e));
      });
    return () => {
      hidup = false;
    };
  }, [sesi, onSesiHabis]);

  if (galat)
    return (
      <p className="form-msg" role="alert">
        {galat}
      </p>
    );
  if (!data) return <p className="muted">Memuat progres anak…</p>;
  if (!data.pemain.length) return <p className="note">Belum ada pemain. Progres anak akan muncul di sini setelah anak mulai latihan.</p>;

  const anak = data.pemain.find((p) => p.id === pilih) ?? data.pemain[0];

  return (
    <>
      <section className="stack-6" aria-labelledby="status-judul">
        <h2 id="status-judul" className="eyebrow">
          7 hari terakhir
        </h2>
        <div className="status-list" role="group" aria-label="Pilih anak">
          {data.pemain.map((p) => {
            const st = statusAnak(p.riwayat);
            return (
              <button key={p.id} type="button" className="status-card" aria-pressed={p.id === anak.id} onClick={() => setPilih(p.id)}>
                <span className={`status-dot ${st.warna}`} aria-hidden="true" />
                <span className="status-isi">
                  <span className="status-judul">
                    <b>{p.name}</b> {st.judul}
                  </span>
                  <span className="muted small">{st.detail}</span>
                  {st.sorotan && (
                    <span className={st.sorotan.naik ? "status-sorot naik" : "status-sorot turun"}>
                      {st.sorotan.naik ? "▲" : "▼"} {st.sorotan.teks}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <DashboardAnak key={anak.id} anak={anak} data={data} sesi={sesi} onSesiHabis={onSesiHabis} />

      <p className="muted small">
        Pemakaian AI keluarga hari ini:{" "}
        <b className="num">
          {data.ai.keluargaHariIni}/{data.ai.batasKeluarga}
        </b>{" "}
        paket soal.
      </p>
    </>
  );
}

function DashboardAnak({ anak, data, sesi, onSesiHabis }: { anak: ProgresPemain; data: DataProgres; sesi: string; onSesiHabis: () => void }) {
  const id = useId();
  return (
    <>
      <div className="split anak-kepala">
        <h2 id={`${id}-nama`}>{anak.name}</h2>
        <span className="muted small">
          {kelasShort(anak.kelas)} · {WORLDS[anak.theme].name}
        </span>
      </div>
      {anak.riwayat.length ? (
        <>
          <KartuAktivitas riwayat={anak.riwayat} />
          <KartuTren riwayat={anak.riwayat} />
          <KartuBulan riwayat={anak.riwayat} />
        </>
      ) : (
        <p className="note">{anak.name} belum pernah latihan. Grafik dan perbandingan akan muncul setelah latihan pertama.</p>
      )}
      <KartuBantu anak={anak} />
      <Detail anak={anak} data={data} sesi={sesi} onSesiHabis={onSesiHabis} />
    </>
  );
}

/* ---------- Aktivitas 14 hari ---------- */

function KartuAktivitas({ riwayat }: { riwayat: Riwayat[] }) {
  const id = useId();
  const a = useMemo(() => aktivitas(riwayat), [riwayat]);
  const hariIni = a.daftar[a.daftar.length - 1];
  return (
    <section className="card" aria-labelledby={`${id}-j`}>
      <div className="stack-2">
        <h3 id={`${id}-j`}>Aktivitas 2 minggu terakhir</h3>
        <p className="muted">
          Latihan di <b className="fg">{a.hariAktif} dari 14 hari</b>
        </p>
      </div>
      <div
        className="aktivitas"
        role="img"
        aria-label={`Jumlah latihan per hari selama 14 hari terakhir: ${a.daftar.map((d) => d.jumlah).join(", ")}. Hari ini ${hariIni.jumlah} latihan.`}
      >
        <div className="aktivitas-batang">
          {a.daftar.map((d, i) => (
            <i
              key={d.tanggal}
              className={d.jumlah ? (i === a.daftar.length - 1 ? "isi kini" : "isi") : "kosong"}
              style={{ height: d.jumlah ? `${Math.max(14, (d.jumlah / a.maks) * 100)}%` : "4px" }}
            />
          ))}
        </div>
        <div className="aktivitas-label" aria-hidden="true">
          {a.daftar.map((d, i) => (
            <span key={d.tanggal} className={i === a.daftar.length - 1 ? "kini" : undefined}>
              {d.label}
            </span>
          ))}
        </div>
        <div className="split muted small" aria-hidden="true">
          <span>2 minggu lalu</span>
          <span>Hari ini: {hariIni.jumlah} latihan</span>
        </div>
      </div>
    </section>
  );
}

/* ---------- Tren nilai per mapel ---------- */

const WARNA_LEVEL: Record<string, string> = { mudah: "transparent", sedang: "var(--band-sedang)", sulit: "var(--band-sulit)" };

function KartuTren({ riwayat }: { riwayat: Riwayat[] }) {
  const id = useId();
  const daftar = useMemo(() => mapelTerurut(riwayat), [riwayat]);
  const [mapel, setMapel] = useState(daftar[0]);
  const titik = useMemo(() => trenMapel(riwayat, mapel), [riwayat, mapel]);
  const ada = titik.filter((t) => t.pct !== null);
  const pertama = ada[0];
  const akhir = ada[ada.length - 1];
  const levelDipakai = [...new Set(titik.map((t) => t.level).filter(Boolean))] as string[];

  return (
    <section className="card" aria-labelledby={`${id}-j`}>
      <div className="stack-2">
        <h3 id={`${id}-j`}>Tren nilai per mata pelajaran</h3>
        <p className="muted">Rata-rata benar per 7 hari</p>
      </div>
      {daftar.length > 1 && (
        <div className="chips" role="group" aria-label="Pilih mata pelajaran">
          {daftar.map((m) => (
            <button key={m} type="button" className="chip" aria-pressed={m === mapel} onClick={() => setMapel(m)}>
              {m}
            </button>
          ))}
        </div>
      )}
      <p>
        <b>{mapel}:</b>{" "}
        {ada.length > 1 ? (
          <b className={akhir.pct! >= pertama.pct! ? "teks-naik" : "teks-turun"}>
            {pertama.pct}% → {akhir.pct}%
          </b>
        ) : (
          <b>{akhir?.pct ?? 0}%</b>
        )}{" "}
        {ada.length > 1 ? `dalam ${titik.length} pekan` : "baru satu pekan ada data"}
      </p>
      <GrafikTren titik={titik} mapel={mapel} />
      {levelDipakai.some((l) => l !== "mudah") && (
        <p className="muted small">
          Area berwarna = level yang lebih sulit (
          {levelDipakai
            .filter((l) => l !== "mudah")
            .map((l) => (l === "sedang" ? "kuning: sedang" : "jingga: sulit"))
            .join(", ")}
          ). Nilai yang sedikit turun setelah naik level itu wajar, karena soalnya lebih sulit.
        </p>
      )}
    </section>
  );
}

function GrafikTren({ titik, mapel }: { titik: TitikTren[]; mapel: string }) {
  const W = 320;
  const kiri = 40;
  const kanan = 14;
  const atas = 10;
  const bawah = 130;
  const langkah = titik.length > 1 ? (W - kiri - kanan) / (titik.length - 1) : 0;
  const x = (i: number) => (titik.length > 1 ? kiri + i * langkah : (kiri + W - kanan) / 2);
  const y = (p: number) => bawah - (p / 100) * (bawah - atas);
  const lebarPita = titik.length > 1 ? langkah : W - kiri - kanan;

  // Garis putus di pekan tanpa latihan.
  const ruas: { x: number; y: number }[][] = [];
  let kini: { x: number; y: number }[] = [];
  titik.forEach((t, i) => {
    if (t.pct === null) {
      if (kini.length) ruas.push(kini);
      kini = [];
    } else kini.push({ x: x(i), y: y(t.pct) });
  });
  if (kini.length) ruas.push(kini);

  // Label level di awal setiap perubahan level.
  const labelLevel: { i: number; level: string }[] = [];
  let sebelum: string | null = null;
  titik.forEach((t, i) => {
    if (t.level && t.level !== sebelum && t.level !== "mudah") labelLevel.push({ i, level: t.level });
    if (t.level) sebelum = t.level;
  });

  const ringkasan = titik.map((t) => `${t.label === "Ini" ? "7 hari terakhir" : `pekan ${t.label}`}: ${t.pct === null ? "tidak latihan" : `${t.pct}%${t.level ? ` (level ${t.level})` : ""}`}`).join("; ");

  return (
    <svg className="grafik" viewBox={`0 0 ${W} 166`} role="img" aria-label={`${mapel}, rata-rata benar per 7 hari. ${ringkasan}. Garis putus-putus 80% menandai materi dikuasai.`}>
      {titik.map((t, i) =>
        t.level && t.level !== "mudah" ? (
          <rect key={`b${i}`} x={Math.max(kiri - 6, x(i) - lebarPita / 2)} y={atas} width={lebarPita} height={bawah - atas} fill={WARNA_LEVEL[t.level]} />
        ) : null,
      )}
      {[0, 50, 100].map((p) => (
        <g key={p}>
          <line x1={kiri - 6} x2={W} y1={y(p)} y2={y(p)} className={p === 0 ? "grafik-sumbu" : "grafik-garis"} />
          <text x={0} y={y(p) + 4} className="grafik-teks">
            {p}%
          </text>
        </g>
      ))}
      <line x1={kiri - 6} x2={W} y1={y(80)} y2={y(80)} className="grafik-target" />
      <text x={W} y={y(80) - 5} textAnchor="end" className="grafik-teks target">
        80% = dikuasai
      </text>
      {labelLevel.map((l) => (
        <text key={`l${l.i}`} x={Math.max(kiri, x(l.i) - lebarPita / 2 + 4)} y={bawah - 6} className="grafik-teks level">
          Level {l.level}
        </text>
      ))}
      {ruas.map((r, i) =>
        r.length > 1 ? <polyline key={`r${i}`} points={r.map((p) => `${p.x},${p.y}`).join(" ")} className="grafik-tren" /> : null,
      )}
      {titik.map((t, i) =>
        t.pct === null ? null : <circle key={`c${i}`} cx={x(i)} cy={y(t.pct)} r={i === titik.length - 1 ? 5.5 : 4} className={i === titik.length - 1 ? "grafik-titik kini" : "grafik-titik"} />,
      )}
      {titik.map((t, i) =>
        t.pct === null ? null : i === titik.length - 1 || titik.length <= 4 ? (
          <text key={`v${i}`} x={x(i)} y={y(t.pct) - 10} textAnchor="middle" className="grafik-teks nilai">
            {t.pct}%
          </text>
        ) : null,
      )}
      {titik.map((t, i) => (
        <text key={`x${i}`} x={x(i)} y={156} textAnchor="middle" className="grafik-teks">
          {t.label}
        </text>
      ))}
    </svg>
  );
}

/* ---------- Perbandingan bulanan ---------- */

function bulanSebelum(k: string) {
  const [t, b] = k.split("-").map(Number);
  return b === 1 ? `${t - 1}-12` : `${t}-${String(b - 1).padStart(2, "0")}`;
}

function KartuBulan({ riwayat }: { riwayat: Riwayat[] }) {
  const id = useId();
  const sekarang = kunciBulan(new Date());
  const opsi = useMemo(() => [...new Set([...daftarBulan(riwayat), bulanSebelum(sekarang)])].sort().reverse(), [riwayat, sekarang]);
  const [a, setA] = useState(bulanSebelum(sekarang));
  const [b, setB] = useState(sekarang);
  const hasil = useMemo(() => bandingBulan(riwayat, a, b), [riwayat, a, b]);
  const selisih = (x: number | null, y: number | null, satuan = "") => {
    if (x === null || y === null) return <span className="muted small">{y === null ? "belum latihan" : "baru"}</span>;
    const d = y - x;
    if (d === 0) return <span className="muted">sama</span>;
    return (
      <b className={d > 0 ? "teks-naik" : "teks-turun"}>
        {d > 0 ? "▲" : "▼"} {Math.abs(d)}
        {satuan}
      </b>
    );
  };

  return (
    <section className="card" aria-labelledby={`${id}-j`}>
      <h3 id={`${id}-j`}>Perbandingan bulanan</h3>
      <div className="two-col">
        <div className="field">
          <label htmlFor={`${id}-a`}>Bandingkan</label>
          <select id={`${id}-a`} value={a} onChange={(e) => setA(e.target.value)}>
            {opsi.map((m) => (
              <option key={m} value={m} aria-label={namaBulan(m)}>
                {namaBulanPendek(m)} {m.slice(0, 4)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${id}-b`}>Dengan</label>
          <select id={`${id}-b`} value={b} onChange={(e) => setB(e.target.value)}>
            {opsi.map((m) => (
              <option key={m} value={m} aria-label={namaBulan(m)}>
                {namaBulanPendek(m)} {m.slice(0, 4)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <table className="tabel-bulan">
        <thead>
          <tr>
            <th scope="col">
              <span className="sr-only">Ukuran</span>
            </th>
            <th scope="col">{namaBulanPendek(a)}</th>
            <th scope="col">{namaBulanPendek(b)}</th>
            <th scope="col">Selisih</th>
          </tr>
        </thead>
        <tbody>
          {hasil.baris.map((r) => (
            <tr key={r.label}>
              <th scope="row">{r.label}</th>
              <td>{r.a}</td>
              <td className="tebal">{r.b}</td>
              <td>{selisih(r.a, r.b)}</td>
            </tr>
          ))}
          <tr className="sub">
            <th scope="colgroup" colSpan={4}>
              Rata-rata benar per mapel
            </th>
          </tr>
          {hasil.perMapel.length ? (
            hasil.perMapel.map((m) => (
              <tr key={m.mapel}>
                <th scope="row">{m.mapel}</th>
                <td>{m.a === null ? "–" : `${m.a}%`}</td>
                <td className="tebal">{m.b === null ? "–" : `${m.b}%`}</td>
                <td>{selisih(m.a, m.b, " poin")}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className="muted">
                Belum ada latihan di kedua bulan ini.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

/* ---------- Yang bisa Anda bantu ---------- */

function KartuBantu({ anak }: { anak: ProgresPemain }) {
  const id = useId();
  const daftar = useMemo(() => bisaDibantu(anak.name, anak.riwayat, anak.topik), [anak]);
  return (
    <section className="card" aria-labelledby={`${id}-j`}>
      <h3 id={`${id}-j`}>Yang bisa Anda bantu</h3>
      {daftar.length ? (
        <ol className="bantu">
          {daftar.map((b, i) => (
            <li key={`${b.jenis}-${b.judul}`}>
              <span className={`bantu-no ${b.jenis}`} aria-hidden="true">
                {i + 1}
              </span>
              <div className="stack-2">
                <b>{b.judul}</b>
                <span className={`bantu-alasan ${b.jenis}`}>{b.alasan}</span>
                <span>{b.saran}</span>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="muted">Belum ada yang perlu dibantu. Saran muncul setelah {anak.name} latihan soal buatan AI beberapa kali.</p>
      )}
    </section>
  );
}

/* ---------- Detail (dilipat) ---------- */

function Lipat({ judul, ringkasan, children }: { judul: string; ringkasan: string; children: React.ReactNode }) {
  const id = useId();
  const [buka, setBuka] = useState(false);
  return (
    <div className="lipat">
      <button type="button" className="lipat-btn" aria-expanded={buka} aria-controls={`${id}-isi`} onClick={() => setBuka(!buka)}>
        <span className="stack-2">
          <b>{judul}</b>
          <span className="muted small">{ringkasan}</span>
        </span>
      </button>
      {buka && (
        <div id={`${id}-isi`} className="lipat-isi">
          {children}
        </div>
      )}
    </div>
  );
}

function Detail({ anak, data, sesi, onSesiHabis }: { anak: ProgresPemain; data: DataProgres; sesi: string; onSesiHabis: () => void }) {
  const r = ringkas(anak.riwayat, anak.topik);
  const [tampil, setTampil] = useState(AWAL_RIWAYAT);
  const bulanIni = anak.riwayat.filter((x) => kunciBulan(x.waktu) === kunciBulan(new Date())).length;
  const terkuat = [...r.perMapel].filter((m) => m.soal >= 5).sort((a, b) => b.pct - a.pct)[0];

  return (
    <section className="card lipat-kartu" aria-label="Detail">
      <Lipat
        judul="Per mata pelajaran"
        ringkasan={r.perMapel.length ? `${r.perMapel.length} mapel${terkuat ? ` · terkuat ${terkuat.mapel} ${terkuat.pct}%` : ""}` : "Belum ada latihan"}
      >
        {r.perMapel.length ? (
          <ul className="mapel-list">
            {r.perMapel.map((m) => (
              <li key={m.mapel}>
                <div className="split">
                  <b>{m.mapel}</b>
                  <span className="muted small num">
                    {m.latihan} latihan · {m.pct}% benar
                  </span>
                </div>
                <div
                  className={`bar nilai ${m.pct >= 80 ? "baik" : m.pct >= 60 ? "cukup" : "kurang"}`}
                  role="img"
                  aria-label={`${m.mapel}: ${m.pct}% benar dari ${m.soal} soal`}
                >
                  <i style={{ width: `${Math.max(m.pct, 2)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Belum ada latihan.</p>
        )}
      </Lipat>

      <Lipat
        judul="Riwayat latihan"
        ringkasan={anak.riwayat.length ? `${bulanIni} latihan bulan ini · ketuk untuk melihat jawaban` : "Belum ada latihan"}
      >
        {anak.riwayat.length ? (
          <>
            <ul className="hist">
              {anak.riwayat.slice(0, tampil).map((x) => (
                <BarisRiwayat key={x.id} x={x} anak={anak} sesi={sesi} onSesiHabis={onSesiHabis} />
              ))}
            </ul>
            {tampil < anak.riwayat.length && (
              <button type="button" className="btn ghost small" onClick={() => setTampil((t) => t + 20)}>
                Tampilkan lebih banyak
              </button>
            )}
          </>
        ) : (
          <p className="muted">Belum ada latihan.</p>
        )}
      </Lipat>

      <Lipat judul="Hadiah & pemakaian AI" ringkasan={`${ringkasHadiah(anak.theme, anak.rewards)} · AI hari ini ${anak.aiHariIni}/${data.ai.batasPemain}`}>
        <p>
          Hadiah di {WORLDS[anak.theme].name}: <b>{ringkasHadiah(anak.theme, anak.rewards)}</b>
        </p>
        <p>
          Soal AI hari ini:{" "}
          <b className="num">
            {anak.aiHariIni}/{data.ai.batasPemain}
          </b>{" "}
          paket{anak.aiHariIni >= data.ai.batasPemain ? " (jatah habis, besok bisa lagi)" : ""}
        </p>
        {r.terakhir && <p className="muted small">Terakhir latihan {kapan(r.terakhir)}.</p>}
      </Lipat>
    </section>
  );
}

type DetailSoal = { q: string; options: string[]; answer: number; pilihan: number | null }[];

function BarisRiwayat({ x, anak, sesi, onSesiHabis }: { x: Riwayat; anak: ProgresPemain; sesi: string; onSesiHabis: () => void }) {
  const id = useId();
  const [buka, setBuka] = useState(false);
  const [detail, setDetail] = useState<DetailSoal | null>(null);
  const [galat, setGalat] = useState<string | null>(null);

  function alihkan() {
    const baru = !buka;
    setBuka(baru);
    if (baru && !detail) {
      setGalat(null);
      api
        .detailLatihan(sesi, anak.id, x.id)
        .then(setDetail)
        .catch((e) => {
          if (e instanceof ApiFailure && e.code === "admin_perlu") onSesiHabis();
          else setGalat(apiMessage(e));
        });
    }
  }

  return (
    <li className="hist-item">
      <button type="button" className="hist-btn" aria-expanded={buka} aria-controls={`${id}-isi`} onClick={alihkan}>
        <span className="hist-main">
          <b>{x.topik}</b>
          <span className="muted small">
            {x.mapel} · {labelLevel(x.level)} · {tanggalPendek(x.waktu)}
          </span>
        </span>
        <span className="hist-score num" aria-label={`${x.benar} dari ${x.n} benar`}>
          {x.benar}/{x.n}
        </span>
      </button>
      {buka && (
        <div id={`${id}-isi`} className="hist-detail">
          {galat && (
            <p className="form-msg" role="alert">
              {galat}
            </p>
          )}
          {!detail && !galat && <p className="muted small">Memuat jawaban…</p>}
          {detail && (
            <ol className="pv">
              {detail.map((d, i) => {
                const benar = d.pilihan === d.answer;
                return (
                  <li key={i} className={benar ? "pv-q" : "pv-q salah"}>
                    <p>
                      {i + 1}. {d.q}
                    </p>
                    <p className="small">
                      {d.pilihan === null ? (
                        <span className="muted">Tidak dijawab.</span>
                      ) : (
                        <>
                          Jawaban {anak.name}: <b>{benar ? "✓ Benar" : "✗ Salah"}</b> · {HURUF[d.pilihan]}. {d.options[d.pilihan]}
                        </>
                      )}
                    </p>
                    {!benar && (
                      <p className="small">
                        Kunci: <b>{HURUF[d.answer]}. {d.options[d.answer]}</b>
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </li>
  );
}
