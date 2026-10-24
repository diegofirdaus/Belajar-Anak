import type { Metadata } from "next";
import { Katalog } from "./Katalog";

export const metadata: Metadata = { title: "Katalog komponen · Markas Latihan", robots: { index: false } };

export default function Page() {
  return <Katalog />;
}
