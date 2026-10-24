import Link from "next/link";

const STARS = [
  { right: "36%", top: "8%", delay: "0s" },
  { right: "6%", top: "34%", delay: "-.8s" },
  { right: "22%", top: "24%", delay: "-1.6s" },
  { right: "3%", top: "5%", delay: "-1.2s" },
  { right: "40%", top: "20%", delay: "-.4s" },
];

export default function Pembuka() {
  return (
    <main className="splash">
      <div className="sp-sun" aria-hidden="true" />
      <div className="sp-blk kayu" aria-hidden="true" />
      <div className="sp-blk batu" aria-hidden="true" />
      <div className="sp-blk permata" aria-hidden="true" />
      <div aria-hidden="true">
        {STARS.map((s) => (
          <i key={s.right + s.top} className="sp-star" style={{ right: s.right, top: s.top, animationDelay: s.delay }} />
        ))}
      </div>
      <div className="sp-planet" aria-hidden="true" />
      <div className="sp-crest" aria-hidden="true" />
      <div className="sp-ground" aria-hidden="true" />
      <div className="sp-floor" aria-hidden="true" />
      <div className="sp-hero" aria-hidden="true">
        <div className="h" />
        <div className="bd" />
        <div className="lg" />
      </div>
      <div className="sp-shield" aria-hidden="true" />

      <div className="sp-panel">
        <span className="sp-eyebrow">Latihan soal keluarga</span>
        <h1 className="sp-title">
          <span className="a">Markas</span> <span className="b">Latihan</span>
        </h1>
        <p className="sp-tag">
          Jawab soal, kumpulkan hadiah, dan bangun duniamu sendiri. Makin rajin latihan, makin hebat duniamu!
        </p>
        <Link className="sp-start" href="/mulai">
          <span aria-hidden="true">▶</span> Ayo Mulai!
        </Link>
        <ul className="sp-worlds" aria-label="Empat dunia">
          <li className="w-blok">Dunia Blok</li>
          <li className="w-pahlawan">Arena Pahlawan</li>
          <li className="w-antariksa">Misi Antariksa</li>
          <li className="w-dino">Lembah Dino</li>
        </ul>
      </div>
    </main>
  );
}
