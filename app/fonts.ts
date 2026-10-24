import { Chakra_Petch, Lilita_One, Nunito, Orbitron, Pixelify_Sans } from "next/font/google";

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

export const fontVariables = [nunito, pixelify, chakra, orbitron, lilita].map((f) => f.variable).join(" ");
