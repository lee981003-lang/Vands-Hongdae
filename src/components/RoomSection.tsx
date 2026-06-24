import { BedCard } from "./BedCard";
import type { CSSProperties } from "react";

// Keep this in sync with the six floor-plan tracks in styles.css.
const MAX_COLS = 6;
import type { Bed, BedStatus, RoomWithBeds } from "../types";

interface RoomSectionProps {
  room: RoomWithBeds;
  now: number;
  onSetStatus: (bed: Bed, status: BedStatus) => Promise<void>;
  onSetFollowUp: (bed: Bed, isFollowUp: boolean) => Promise<void>;
}

function roomClassName(name: string) {
  if (name.includes("VIP")) return "room-section--vip";
  if (name.includes("제모")) return "room-section--hair";
  if (name.includes("진료") || name.includes("처치")) return "room-section--treatment";
  if (name.includes("레이저")) return "room-section--laser";
  if (name.includes("관리")) return "room-section--care";
  return "room-section--default";
}

export function RoomSection({ room, now, onSetStatus, onSetFollowUp }: RoomSectionProps) {
  const span = Math.min(room.beds.length || 1, MAX_COLS);
  const layoutStyle = {
    "--room-span": String(span),
    "--bed-cols": String(span),
  } as CSSProperties;

  return (
    <section className={`room-section ${roomClassName(room.name)}`} style={layoutStyle}>
      <div className="room-heading">
        <h2>{room.name}</h2>
      </div>
      <div className="bed-grid">
        {room.beds.map((bed) => (
          <BedCard
            key={bed.id}
            bed={bed}
            now={now}
            onSetStatus={onSetStatus}
            onSetFollowUp={onSetFollowUp}
          />
        ))}
      </div>
    </section>
  );
}
