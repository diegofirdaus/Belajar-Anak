import { WORLDS, type WorldId } from "@/lib/worlds";
import { WorldArt } from "./WorldArt";

export function WorldCard({
  world,
  selected = false,
  onSelect,
}: {
  world: WorldId;
  selected?: boolean;
  onSelect?: (w: WorldId) => void;
}) {
  const w = WORLDS[world];
  return (
    <button type="button" className="tcard" aria-pressed={selected} onClick={() => onSelect?.(world)}>
      <WorldArt world={world} />
      <span className="tb">
        <b className={`wf-${world}`}>{w.name}</b>
        <span>{w.short}</span>
      </span>
    </button>
  );
}
