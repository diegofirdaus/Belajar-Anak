"use client";

import { useEffect } from "react";
import type { WorldId } from "@/lib/worlds";

/** Memasang kelas tema dunia di <body>. `null` = tema dasar. */
export function ThemeBody({ world }: { world: WorldId | null }) {
  useEffect(() => {
    const cls = world ? `t-${world}` : null;
    if (cls) document.body.classList.add(cls);
    return () => {
      if (cls) document.body.classList.remove(cls);
    };
  }, [world]);
  return null;
}
