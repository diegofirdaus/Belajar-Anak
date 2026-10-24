export type Rewards = {
  blok: { kayu: number; batu: number; permata: number };
  pahlawan: { xp: number; bosses: number };
  antariksa: { fuel: number };
  dino: { bones: number; done: string[] };
};

export function emptyRewards(): Rewards {
  return {
    blok: { kayu: 0, batu: 0, permata: 0 },
    pahlawan: { xp: 0, bosses: 0 },
    antariksa: { fuel: 0 },
    dino: { bones: 0, done: [] },
  };
}
