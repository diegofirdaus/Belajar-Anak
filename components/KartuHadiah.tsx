"use client";

import { useEffect, useRef } from "react";
import {
  BONUS_BOSS,
  MATERIAL,
  MATERIAL_WARNA,
  TUJUAN,
  TULANG_PER_KERANGKA,
  bangunan,
  dinoDigali,
  jumlahBlok,
  museum,
  perjalanan,
  rank,
  type Material,
} from "@/lib/hadiah";
import type { Rewards } from "@/lib/rewards";
import type { WorldId } from "@/lib/worlds";
import { BoneIcon } from "./BoneIcon";

/** Kartu hadiah di markas sesuai dunia pemain (brief 8.6). */
export function KartuHadiah({ dunia, hadiah }: { dunia: WorldId; hadiah: Rewards }) {
  if (dunia === "blok") return <KartuBlok r={hadiah.blok} />;
  if (dunia === "pahlawan") return <KartuPahlawan r={hadiah.pahlawan} />;
  if (dunia === "antariksa") return <KartuAntariksa liter={hadiah.antariksa.fuel} />;
  return <KartuDino r={hadiah.dino} />;
}

/* ---------- Dunia Blok ---------- */

function KartuBlok({ r }: { r: Rewards["blok"] }) {
  const n = jumlahBlok(r);
  const b = bangunan(r);
  const cv = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (cv.current) gambarBangunan(cv.current, r);
  }, [r]);

  return (
    <section className="card" aria-label="Hadiah Dunia Blok">
      <canvas ref={cv} className="cv" width={240} height={150} role="img" aria-label={`Bangunanmu: ${b.kini.nama}`} />
      <div className="split">
        <h3>Bangunanmu: {b.kini.nama}</h3>
        <span className="muted num">{n} blok</span>
      </div>
      <div className="bar" role="progressbar" aria-label={`Menuju ${b.berikut?.nama ?? b.kini.nama}`} aria-valuenow={b.persen} aria-valuemin={0} aria-valuemax={100}>
        <i style={{ width: `${b.persen}%` }} />
      </div>
      <p className="muted small">
        {b.berikut ? `${b.kurang} blok lagi untuk membangun ${b.berikut.nama}.` : "Kastil sudah berdiri megah. Terus kumpulkan permata!"}
      </p>
      <div className="inv">
        {MATERIAL.map((m) => (
          <div key={m}>
            <span className="sw" style={{ background: MATERIAL_WARNA[m] }} aria-hidden="true" />
            <b>{r[m]}</b>
            {m}
          </div>
        ))}
      </div>
      <p className="muted rule">Level mudah memberi kayu, sedang memberi batu, sulit memberi permata.</p>
    </section>
  );
}

function gambarBangunan(cv: HTMLCanvasElement, r: Rewards["blok"]) {
  const c = cv.getContext("2d");
  if (!c) return;
  const W = cv.width;
  const H = cv.height;
  const cs = 10;
  const cols = W / cs;
  const rows = H / cs;
  c.fillStyle = "#bfe2f3";
  c.fillRect(0, 0, W, H);
  c.fillStyle = "#ffd34a";
  c.fillRect(W - 40, 12, 20, 20);
  c.fillStyle = "#ffffff";
  c.fillRect(30, 20, 30, 8);
  c.fillRect(40, 14, 14, 6);
  c.fillStyle = "#7a5636";
  c.fillRect(0, H - cs, W, cs);
  c.fillStyle = "#4f9a3a";
  c.fillRect(0, H - cs, W, 3);

  // Urutan sel: dari bawah ke atas, dari tengah ke luar. 12 sel untuk 8 baris pertama, lalu menyempit seperti menara.
  const lebar = 12;
  const x0 = Math.floor((cols - lebar) / 2);
  const urutan: [number, number][] = [];
  for (let baris = 0; baris < rows - 3; baris++) {
    const w = baris < 8 ? lebar : Math.max(2, lebar - (baris - 7) * 2);
    const mulai = Math.floor((lebar - w) / 2);
    const tengah = mulai + w / 2;
    const sel = Array.from({ length: w }, (_, k) => mulai + k).sort(
      (a, b) => Math.abs(a + 0.5 - tengah) - Math.abs(b + 0.5 - tengah),
    );
    sel.forEach((cx) => urutan.push([x0 + cx, rows - 2 - baris]));
  }
  const blok: Material[] = [];
  MATERIAL.forEach((m) => {
    for (let i = 0; i < r[m]; i++) blok.push(m);
  });
  blok.slice(0, urutan.length).forEach((m, i) => {
    const [x, y] = urutan[i];
    c.fillStyle = MATERIAL_WARNA[m];
    c.fillRect(x * cs, y * cs, cs, cs);
    c.fillStyle = "rgba(0,0,0,.18)";
    c.fillRect(x * cs, y * cs + cs - 2, cs, 2);
    c.fillRect(x * cs + cs - 2, y * cs, 2, cs);
  });
  if (!blok.length) {
    c.fillStyle = "#6e4f33";
    c.font = `700 12px ${getComputedStyle(cv).fontFamily}`;
    c.textAlign = "center";
    c.fillText("Jawab benar untuk dapat", W / 2, H / 2 - 4);
    c.fillText("blok pertama!", W / 2, H / 2 + 12);
  }
}

/* ---------- Arena Pahlawan ---------- */

function KartuPahlawan({ r }: { r: Rewards["pahlawan"] }) {
  const k = rank(r.xp);
  return (
    <section className="card" aria-label="Hadiah Arena Pahlawan">
      <div className="rank">
        <div className="crest" aria-hidden="true">
          <span>{k.indeks + 1}</span>
        </div>
        <div className="rank-name">
          <span className="eyebrow">Rank kamu</span>
          <h2>{k.kini.nama}</h2>
        </div>
      </div>
      <div className="bar" role="progressbar" aria-label={`Menuju rank ${k.berikut?.nama ?? k.kini.nama}`} aria-valuenow={k.persen} aria-valuemin={0} aria-valuemax={100}>
        <i style={{ width: `${k.persen}%` }} />
      </div>
      <div className="stats-row">
        <span>
          <b>{r.xp}</b> XP
        </span>
        <span>
          <b>{r.bosses}</b> boss dikalahkan
        </span>
        <span>
          {k.berikut ? (
            <>
              <b>{k.kurang}</b> XP lagi ke {k.berikut.nama}
            </>
          ) : (
            "Rank tertinggi!"
          )}
        </span>
      </div>
      <p className="muted rule">
        Jawaban benar memberi XP: mudah 10, sedang 20, sulit 30. Kalahkan boss untuk bonus {BONUS_BOSS} XP.
      </p>
    </section>
  );
}

/* ---------- Misi Antariksa ---------- */

function KartuAntariksa({ liter }: { liter: number }) {
  const p = perjalanan(liter);
  const cv = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (cv.current) gambarPeta(cv.current, liter);
  }, [liter]);

  return (
    <section className="card" aria-label="Hadiah Misi Antariksa">
      <canvas ref={cv} className="cv" width={320} height={150} role="img" aria-label={`Peta perjalanan roket, sekarang di ${p.kini.nama}`} />
      <div className="split">
        <h3>Sekarang di {p.kini.nama}</h3>
        <span className="muted num">{liter} liter</span>
      </div>
      <div className="bar" role="progressbar" aria-label={`Menuju ${p.berikut?.nama ?? p.kini.nama}`} aria-valuenow={p.persen} aria-valuemin={0} aria-valuemax={100}>
        <i style={{ width: `${p.persen}%` }} />
      </div>
      <p className="muted small">
        {p.berikut ? `${p.kurang} liter lagi untuk terbang ke ${p.berikut.nama}.` : "Kamu sudah sampai ujung tata surya. Kapten hebat!"}
      </p>
      <p className="fact">{p.kini.fakta}</p>
      <p className="muted rule">Jawaban benar mengisi bahan bakar: mudah 10, sedang 20, sulit 30 liter.</p>
    </section>
  );
}

function gambarPeta(cv: HTMLCanvasElement, liter: number) {
  const W = 320;
  const H = 150;
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  cv.width = W * dpr;
  cv.height = H * dpr;
  const c = cv.getContext("2d");
  if (!c) return;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.fillStyle = "#070b22";
  c.fillRect(0, 0, W, H);

  // Bintang tetap (seeded) supaya gambarnya sama setiap kali dibuka.
  let s = 7;
  const acak = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 70; i++) {
    c.fillStyle = `rgba(255,255,255,${0.3 + acak() * 0.7})`;
    const x = acak() * W;
    const y = acak() * H;
    const besar = acak() < 0.15 ? 2 : 1;
    c.fillRect(x, y, besar, besar);
  }

  const titik = TUJUAN.map((_, i) => ({ x: 22 + (i * (W - 44)) / (TUJUAN.length - 1), y: H / 2 + Math.sin(i * 1.25) * 32 }));
  const p = perjalanan(liter);
  const i = p.indeks;

  c.setLineDash([3, 5]);
  c.strokeStyle = "rgba(160,176,216,.45)";
  c.lineWidth = 1.5;
  c.beginPath();
  titik.forEach((q, k) => (k ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y)));
  c.stroke();
  c.setLineDash([]);
  c.strokeStyle = "#5ee0ff";
  c.lineWidth = 2;
  c.beginPath();
  titik.slice(0, i + 1).forEach((q, k) => (k ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y)));
  c.stroke();

  TUJUAN.forEach((t, k) => {
    const q = titik[k];
    c.globalAlpha = k <= i ? 1 : 0.35;
    c.fillStyle = t.warna;
    c.beginPath();
    c.arc(q.x, q.y, t.r, 0, Math.PI * 2);
    c.fill();
    if (t.cincin) {
      c.strokeStyle = "#f2d9a0";
      c.lineWidth = 2;
      c.beginPath();
      c.ellipse(q.x, q.y, t.r + 7, 3.5, -0.25, 0, Math.PI * 2);
      c.stroke();
    }
    c.globalAlpha = k <= i ? 1 : 0.55;
    c.fillStyle = "#cfdaf5";
    c.font = "9px system-ui, sans-serif";
    c.textAlign = "center";
    c.fillText(t.nama, q.x, q.y + (q.y > H / 2 ? -t.r - 6 : t.r + 13));
  });
  c.globalAlpha = 1;

  // Roket di antara tujuan sekarang dan berikutnya sesuai progres.
  let rx = titik[i].x;
  let ry = titik[i].y;
  let sudut = 0;
  if (p.berikut) {
    const t = (liter - p.kini.at) / (p.berikut.at - p.kini.at);
    const a = titik[i];
    const b = titik[i + 1];
    rx = a.x + (b.x - a.x) * t;
    ry = a.y + (b.y - a.y) * t;
    sudut = Math.atan2(b.y - a.y, b.x - a.x);
  }
  c.save();
  c.translate(rx, ry - 16);
  c.rotate(sudut);
  c.fillStyle = "#ff9a3c";
  c.beginPath();
  c.moveTo(-7, -3);
  c.lineTo(-14, 0);
  c.lineTo(-7, 3);
  c.fill();
  c.fillStyle = "#ffffff";
  c.beginPath();
  c.moveTo(11, 0);
  c.lineTo(-7, -6);
  c.lineTo(-7, 6);
  c.closePath();
  c.fill();
  c.fillStyle = "#5ee0ff";
  c.beginPath();
  c.arc(1, 0, 2, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

/* ---------- Lembah Dino ---------- */

export function SlotTulang({ terisi }: { terisi: number }) {
  return (
    <div className="bones" role="img" aria-label={`${terisi} dari ${TULANG_PER_KERANGKA} tulang`}>
      {Array.from({ length: TULANG_PER_KERANGKA }, (_, i) => (
        <span key={i} className={i < terisi ? "bone on" : "bone"}>
          <BoneIcon />
        </span>
      ))}
    </div>
  );
}

function KartuDino({ r }: { r: Rewards["dino"] }) {
  const d = dinoDigali(r);
  const isi = museum(r);
  return (
    <section className="card" aria-label="Hadiah Lembah Dino">
      <span className="eyebrow">Sedang digali</span>
      <div className="split">
        <h2>{d.nama}</h2>
        <span className="muted num">
          {r.bones}/{TULANG_PER_KERANGKA} tulang
        </span>
      </div>
      <SlotTulang terisi={r.bones} />
      <p className="fact">{d.fakta}</p>
      <div className="stack-6">
        <h3>Museum kamu</h3>
        {isi.length ? (
          <div className="museum">
            {isi.map((m) => (
              <span key={m.nama}>
                {m.nama}
                {m.jumlah > 1 ? ` ×${m.jumlah}` : ""}
              </span>
            ))}
          </div>
        ) : (
          <p className="muted small">Belum ada kerangka. Kumpulkan 8 tulang untuk kerangka pertamamu!</p>
        )}
      </div>
      <p className="muted rule">Jawaban benar memberi tulang: mudah 1, sedang 2, sulit 3.</p>
    </section>
  );
}
