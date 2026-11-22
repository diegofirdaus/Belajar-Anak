import { Chakra_Petch, Lilita_One, Noto_Naskh_Arabic, Nunito, Orbitron, Pixelify_Sans } from "next/font/google";

export const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-nunito",
  display: "swap",
});
export const pixelify = Pixelify_Sans({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-pixelify",
  display: "swap",
});
export const chakra = Chakra_Petch({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-chakra",
  display: "swap",
});
export const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["600", "800"],
  variable: "--font-orbitron",
  display: "swap",
});
export const lilita = Lilita_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-lilita",
  display: "swap",
});

/** Huruf Arab (soal Pendidikan Agama Islam / Islamic Studies): Naskh jelas untuk harakat. */
export const naskh = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-arab",
  display: "swap",
  preload: false,
});

export const fontVariables = [nunito, pixelify, chakra, orbitron, lilita, naskh].map((f) => f.variable).join(" ");
