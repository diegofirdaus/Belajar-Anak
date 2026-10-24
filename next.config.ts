import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Selalu diisi supaya Next menyisipkan nilainya saat build dan kode khusus emulator terbuang dari build asli.
  env: { NEXT_PUBLIC_USE_FIREBASE_EMULATOR: process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR ?? "0" },
};

export default nextConfig;
