import type { WorldId } from "@/lib/worlds";
import { BoneIcon } from "./BoneIcon";

/** Tile gambar dunia (CSS orisinal). `mini` = 64×56 untuk kartu pemain. */
export function WorldArt({ world, mini = false }: { world: WorldId; mini?: boolean }) {
  return (
    <div className={`art ${world}${mini ? " mini" : ""}`} aria-hidden="true">
      {world === "dino" && <BoneIcon className="bone-ico" />}
    </div>
  );
}
