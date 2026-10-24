"use client";

// HP mengingat profil anak yang terakhir dipakai. Hanya kenyamanan per perangkat:
// kalau penyimpanan diblokir, app tetap jalan dan menampilkan daftar pemain.
const KEY = "ml:pemain";

export function getDevicePlayer(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setDevicePlayer(id: string | null): void {
  try {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  } catch {
    /* abaikan */
  }
}
