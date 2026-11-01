"use client";

import { useEffect, useId, useState } from "react";
import { api, apiMessage, ApiFailure } from "@/lib/api";
import { getDevicePlayer } from "@/lib/device";
import { kelasShort } from "@/lib/kelas";
import { labelLevel, tanggalPendek, type Riwayat } from "@/lib/latihan";
import { kapan, ringkas, ringkasHadiah, type DataProgres, type ProgresPemain } from "@/lib/progres";
import { WORLDS } from "@/lib/worlds";

const HURUF = "ABCD";
const AWAL_RIWAYAT = 10;

/** Dashboard progres orang tua (mode admin): per anak, per mapel, topik, riwayat, pemakaian AI. */
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
      {data.pemain.length > 1 && (
        <div className="chips" role="group" aria-label="Pilih anak">
          {data.pemain.map((p) => (
            <button key={p.id} type="button" className="chip" aria-pressed={p.id === anak.id} onClick={() => setPilih(p.id)}>
              {p.name}
            </button>
          ))}
        </div>
      )}
      <KartuAnak key={anak.id} anak={anak} data={data} sesi={sesi} onSesiHabis={onSesiHabis} />
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

function KartuAnak({ anak, data, sesi, onSesiHabis }: { anak: ProgresPemain; data: DataProgres; sesi: string; onSesiHabis: () => void }) {
  const id = useId();
  const r = ringkas(anak.riwayat, anak.topik);
  const [tampil, setTampil] = useState(AWAL_RIWAYAT);

  return (
    <>
      <section className="card" aria-labelledby={`${id}-nama`}>
        <div className="split">
          <h2 id={`${id}-nama`}>{anak.name}</h2>
          <span className="muted small">
            {kelasShort(anak.kelas)} · {WORLDS[anak.theme].name}
          </span>
        </div>
        <p className="muted small">{r.terakhir ? `Terakhir latihan ${kapan(r.terakhir)}.` : "Belum pernah latihan."}</p>
        <div className="inv stat-grid">
          <div>
            <b>{r.latihanPekanIni}</b>latihan 7 hari terakhir
          </div>
          <div>
            <b>{r.soal}</b>soal dijawab
          </div>
          <div>
            <b>{r.soal ? `${r.pct}%` : "–"}</b>benar
          </div>
        </div>
        <p className="small">
          Hadiah: <b>{ringkasHadiah(anak.theme, anak.rewards)}</b>
        </p>
        <p className="small">
          AI hari ini:{" "}
          <b className="num">
            {anak.aiHariIni}/{data.ai.batasPemain}
          </b>{" "}
          paket soal{anak.aiHariIni >= data.ai.batasPemain ? " (jatah habis)" : ""}
        </p>
      </section>

      <section className="card" aria-labelledby={`${id}-mapel`}>
        <h2 id={`${id}-mapel`}>Per mata pelajaran</h2>
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
      </section>

      <section className="card" aria-labelledby={`${id}-topik`}>
        <h2 id={`${id}-topik`}>Topik</h2>
        <div className="stack-6">
          <h3>Perlu dibantu</h3>
          {r.perluDibantu.length ? (
            <div className="chips">
              {r.perluDibantu.map((s) => (
                <span key={`${s.mapel}-${s.topik}-${s.level}`} className="chip weak">
                  {s.topik} ({s.level}) · {s.mapel}
                </span>
              ))}
            </div>
          ) : (
            <p className="muted small">Belum ada topik dengan skor terakhir di bawah 60%.</p>
          )}
        </div>
        <div className="stack-6">
          <h3>Siap naik level</h3>
          {r.siapNaik.length ? (
            <div className="chips">
              {r.siapNaik.map((s) => (
                <span key={`${s.mapel}-${s.topik}-${s.level}`} className="chip up">
                  {s.topik} → {s.level} · {s.mapel}
                </span>
              ))}
            </div>
          ) : (
            <p className="muted small">Belum ada. Topik muncul di sini setelah skornya 80% atau lebih.</p>
          )}
        </div>
        <p className="muted rule">Dihitung dari soal buatan AI. Soal pilihan dan soal contoh tidak ikut dihitung.</p>
      </section>

      <section className="card" aria-labelledby={`${id}-riwayat`}>
        <h2 id={`${id}-riwayat`}>Riwayat latihan</h2>
        {anak.riwayat.length ? (
          <>
            <p className="muted small">Ketuk latihan untuk melihat jawaban {anak.name} per soal.</p>
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
            {anak.riwayat.length >= data.riwayatMaks && tampil >= anak.riwayat.length && (
              <p className="muted small">Menampilkan {data.riwayatMaks} latihan terakhir.</p>
            )}
          </>
        ) : (
          <p className="muted">Belum ada latihan.</p>
        )}
      </section>
    </>
  );
}

type Detail = { q: string; options: string[]; answer: number; pilihan: number | null }[];

function BarisRiwayat({ x, anak, sesi, onSesiHabis }: { x: Riwayat; anak: ProgresPemain; sesi: string; onSesiHabis: () => void }) {
  const id = useId();
  const [buka, setBuka] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);
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
