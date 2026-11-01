"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LoadingCard, RequireLogin } from "@/components/RequireLogin";
import { api, apiMessage } from "@/lib/api";
import { getDevicePlayer, setDevicePlayer } from "@/lib/device";

/**
 * Gerbang setelah "Ayo Mulai!" (brief 7):
 * HP ini sudah punya pemain → markasnya; akun punya pemain → daftar pemain; belum ada → perkenalan.
 */
export default function Mulai() {
  return <RequireLogin>{() => <Arahkan />}</RequireLogin>;
}

function Arahkan() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .listPlayers()
      .then((players) => {
        if (!alive) return;
        const mine = getDevicePlayer();
        if (mine && players.some((p) => p.id === mine)) router.replace(`/main/${mine}`);
        else {
          if (mine) setDevicePlayer(null);
          router.replace(players.length ? "/pemain" : "/kenalan");
        }
      })
      .catch((e) => alive && setErr(apiMessage(e)));
    return () => {
      alive = false;
    };
  }, [router]);

  if (err)
    return (
      <main className="wrap">
        <div className="card">
          <p className="form-msg" role="alert">
            {err}
          </p>
          <button type="button" className="btn" onClick={() => location.reload()}>
            Coba lagi
          </button>
        </div>
      </main>
    );
  return <LoadingCard />;
}
