import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { ApiError } from "../http";

let klien: Anthropic | null = null;

/** Klien Claude API, hanya di server. Kunci dari ANTHROPIC_API_KEY (tidak pernah dikirim ke browser). */
function claude(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new ApiError("ai_belum_siap");
  klien ??= new Anthropic({ timeout: 55_000, maxRetries: 1 });
  return klien;
}

export const aiTersedia = () => Boolean(process.env.ANTHROPIC_API_KEY);
export const MODEL_SOAL = () => process.env.AI_MODEL_SOAL || "claude-sonnet-5-5";
/** Membaca foto soal (buku/LKS/tulisan tangan): butuh ketelitian baca, jadi Sonnet. */
export const MODEL_BACA_FOTO = () => process.env.AI_MODEL_BACA_FOTO || "claude-sonnet-5-5";
/** Merapikan soal admin: tugas menyalin dan merapikan, cukup Haiku (brief 5). */
export const MODEL_RAPIKAN = () => process.env.AI_MODEL_RAPIKAN || "claude-haiku-5-5";
type Effort = "low" | "medium" | "high" | "xhigh" | "max";
const EFFORT_SOAL = (): Effort => (process.env.AI_EFFORT_SOAL as Effort) || "medium";

/** Model yang mendukung server-side fallback mode "default" (Haiku 5.5 tidak). */
const bisaFallback = (model: string) => /^claude-(sonnet-5-5|opus-5|fable-5)/.test(model);

export type HasilJson = {
  data: unknown;
  model: string;
  pemakaian: { masuk: number; keluar: number; cacheBaca: number };
};

/**
 * Satu permintaan ke Claude yang wajib membalas JSON sesuai skema (structured outputs).
 * Error dipetakan ke kode yang punya pesan ramah anak (brief 10.5).
 */
export type GambarMasuk = { media_type: "image/jpeg" | "image/png" | "image/webp"; data: string };

export async function mintaJson(p: {
  model: string;
  effort?: Effort;
  prompt: string;
  skema: Record<string, unknown>;
  /** Foto yang ikut dibaca (base64). Diletakkan sebelum teks perintah. */
  gambar?: GambarMasuk[];
  /** Batas waktu khusus (ms), mis. untuk membaca beberapa foto. */
  waktuMaks?: number;
}): Promise<HasilJson> {
  const c = claude();
  let res: Anthropic.Beta.BetaMessage;
  const content: Anthropic.Beta.BetaContentBlockParam[] | string = p.gambar?.length
    ? [
        ...p.gambar.map((g) => ({ type: "image" as const, source: { type: "base64" as const, media_type: g.media_type, data: g.data } })),
        { type: "text" as const, text: p.prompt },
      ]
    : p.prompt;
  try {
    res = await c.beta.messages.create(
      {
        model: p.model,
        max_tokens: 16000,
        output_config: { effort: p.effort ?? EFFORT_SOAL(), format: { type: "json_schema", schema: p.skema } },
        messages: [{ role: "user", content }],
        // Penolakan kategori cyber/frontier_llm dicoba ulang di model lain oleh server Anthropic.
        ...(bisaFallback(p.model) ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
      },
      p.waktuMaks ? { timeout: p.waktuMaks, maxRetries: 0 } : undefined,
    );
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) throw new ApiError("terlalu_cepat");
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
      console.error("Kunci Claude API ditolak:", e.message);
      throw new ApiError("ai_belum_siap");
    }
    if (e instanceof Anthropic.APIError && e.status === 529) throw new ApiError("terlalu_cepat");
    console.error("Permintaan ke Claude gagal:", e);
    throw new ApiError("gangguan");
  }

  const pemakaian = {
    masuk: res.usage.input_tokens,
    keluar: res.usage.output_tokens,
    cacheBaca: res.usage.cache_read_input_tokens ?? 0,
  };
  if (res.stop_reason === "refusal") throw new ApiError("ditolak", undefined, { model: res.model, pemakaian });

  const teks = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  let data: unknown;
  try {
    data = JSON.parse(teks);
  } catch {
    throw new ApiError("json_rusak", undefined, { model: res.model, pemakaian });
  }
  return { data, model: res.model, pemakaian };
}
