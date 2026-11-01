import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Selalu diisi supaya Next menyisipkan nilainya saat build dan kode khusus emulator terbuang dari build asli.
  env: { NEXT_PUBLIC_USE_FIREBASE_EMULATOR: process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR ?? "0" },
  // Halaman login Google (Firebase Auth) dilayani lewat domain app sendiri, bukan firebaseapp.com.
  // Safari iOS memisahkan penyimpanan antar-situs, sehingga login lewat redirect ke domain lain gagal
  // ("missing initial state"). Lihat lib/firebase/client.ts (authDomain = host app).
  async rewrites() {
    return [{ source: "/__/auth/:path*", destination: "https://markas-latihan.firebaseapp.com/__/auth/:path*" }];
  },
};

export default nextConfig;
