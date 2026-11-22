import { Fragment } from "react";
import { adaArab, pecahArab } from "@/lib/arab";

/**
 * Teks yang mungkin berisi huruf Arab: potongan Arab dibungkus <span lang="ar"> yang diisolasi (CSS) dan berarah
 * kanan-ke-kiri. Bukan <bdi>/dir supaya `dir="auto"` di elemen induk tetap melihat hurufnya (pilihan yang
 * seluruhnya Arab jadi rata kanan),
 * memakai font Naskh, dan sedikit lebih besar agar harakat terbaca. Teks tanpa huruf Arab tampil apa adanya.
 */
export function TeksCampur({ teks }: { teks: string }) {
  if (!adaArab(teks)) return <>{teks}</>;
  return (
    <>
      {pecahArab(teks).map((b, k) =>
        b.arab ? (
          <span key={k} lang="ar" className="ar">
            {b.teks}
          </span>
        ) : (
          <Fragment key={k}>{b.teks}</Fragment>
        ),
      )}
    </>
  );
}
