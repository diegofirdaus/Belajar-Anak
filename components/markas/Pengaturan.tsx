"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { Segment } from "@/components/Segment";
import { useToast } from "@/components/Toast";
import { WorldCard } from "@/components/WorldCard";
import { api, apiMessage } from "@/lib/api";
import { JENJANG_INFO, jenjangOf, kelasInJenjang, kelasShort, type Jenjang } from "@/lib/kelas";
import { playerName, type Player, type PlayerUpdate } from "@/lib/player";
import { WORLD_IDS } from "@/lib/worlds";

type Panel = "kelas" | "dunia" | "nama" | "hapus" | null;

/** Pengaturan pemain di markas (brief 7.4 no. 7). */
export function Pengaturan({
  pemain,
  onUbah,
  onHapus,
}: {
  pemain: Player;
  onUbah: (p: Player) => void;
  onHapus: () => void;
}) {
  const id = useId();
  const toast = useToast();
  const [panel, setPanel] = useState<Panel>(null);
  const [sibuk, setSibuk] = useState(false);

  const buka = (p: Exclude<Panel, null>) => setPanel((x) => (x === p ? null : p));

  async function ubah(u: PlayerUpdate, pesan?: (p: Player) => string) {
    setSibuk(true);
    try {
      const p = await api.updatePlayer(pemain.id, u);
      onUbah(p);
      if (pesan) toast(pesan(p));
      setPanel(null);
    } catch (e) {
      toast(apiMessage(e));
    } finally {
      setSibuk(false);
    }
  }

  async function hapus() {
    setSibuk(true);
    try {
      await api.deletePlayer(pemain.id);
      toast(`${pemain.name} sudah dihapus.`);
      onHapus();
    } catch (e) {
      toast(apiMessage(e));
      setSibuk(false);
    }
  }

  const tombol = (p: Exclude<Panel, null>, label: string, kelas = "") => (
    <button
      type="button"
      className={`btn ghost small ${kelas}`}
      aria-expanded={panel === p}
      aria-controls={`${id}-panel`}
      onClick={() => buka(p)}
    >
      {label}
    </button>
  );

  return (
    <section className="card" aria-labelledby={`${id}-judul`}>
      <h2 id={`${id}-judul`}>Pengaturan</h2>
      <div className="set-links">
        {tombol("kelas", "Ubah kelas")}
        {tombol("dunia", "Ganti dunia")}
        {tombol("nama", "Ganti nama")}
        {tombol("hapus", "Hapus pemain", "danger")}
        <Link className="btn ghost small" href="/admin">
          Mode admin
        </Link>
      </div>

      <div id={`${id}-panel`}>
        {panel === "kelas" && <PanelKelas pemain={pemain} sibuk={sibuk} onPilih={(k) => ubah({ kelas: k }, (p) => `Kelas diubah ke ${kelasShort(p.kelas)}.`)} />}

        {panel === "dunia" && (
          <div className="stack-12">
            <p>Pilih dunia. Hadiah di dunia lama tetap tersimpan.</p>
            <div className="tgrid">
              {WORLD_IDS.map((w) => (
                <WorldCard
                  key={w}
                  world={w}
                  selected={pemain.theme === w}
                  onSelect={(x) => (x === pemain.theme ? setPanel(null) : ubah({ theme: x }))}
                />
              ))}
            </div>
          </div>
        )}

        {panel === "nama" && <PanelNama nama={pemain.name} sibuk={sibuk} onSimpan={(name) => ubah({ name })} />}

        {panel === "hapus" && (
          <div className="stack-12" role="alertdialog" aria-labelledby={`${id}-hapus`}>
            <p id={`${id}-hapus`}>
              <b>Hapus {pemain.name}?</b> Semua hadiah dan riwayat latihannya ikut terhapus dan tidak bisa dikembalikan.
            </p>
            <div className="row-btns">
              <button type="button" className="btn danger-solid" disabled={sibuk} onClick={hapus}>
                Ya, hapus
              </button>
              <button type="button" className="btn ghost" disabled={sibuk} onClick={() => setPanel(null)}>
                Batal
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function PanelKelas({ pemain, sibuk, onPilih }: { pemain: Player; sibuk: boolean; onPilih: (k: number) => void }) {
  const [jenjang, setJenjang] = useState<Jenjang>(jenjangOf(pemain.kelas));
  return (
    <div className="stack-12">
      <Segment
        label="Jenjang"
        options={(Object.keys(JENJANG_INFO) as Jenjang[]).map((j) => ({ value: j, label: j }))}
        value={jenjang}
        onChange={setJenjang}
      />
      <div className="kgrid" role="group" aria-label="Kelas">
        {JENJANG_INFO[jenjang].kelas.map((k) => (
          <button
            key={k}
            type="button"
            className="choice"
            aria-pressed={pemain.kelas === k}
            disabled={sibuk}
            onClick={() => onPilih(k)}
          >
            <b>Kelas {k}</b>
            {jenjang !== "SD" && (
              <span>
                kelas {kelasInJenjang(k)} {jenjang}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function PanelNama({ nama, sibuk, onSimpan }: { nama: string; sibuk: boolean; onSimpan: (n: string) => void }) {
  const id = useId();
  const [isi, setIsi] = useState(nama);
  const [galat, setGalat] = useState<string | null>(null);

  function kirim(e: FormEvent) {
    e.preventDefault();
    const h = playerName.safeParse(isi);
    if (!h.success) {
      setGalat("Tulis dulu nama panggilanmu, ya.");
      return;
    }
    setGalat(null);
    onSimpan(h.data);
  }

  return (
    <form className="stack-12" onSubmit={kirim} noValidate>
      <div className="field">
        <label htmlFor={`${id}-nama`}>Nama panggilan</label>
        <div className="ob-form">
          <input id={`${id}-nama`} className="input" type="text" maxLength={20} value={isi} onChange={(e) => setIsi(e.target.value)} autoComplete="off" />
          <button type="submit" className="btn" disabled={sibuk}>
            Simpan
          </button>
        </div>
      </div>
      {galat && (
        <p className="form-msg" role="alert">
          {galat}
        </p>
      )}
    </form>
  );
}
