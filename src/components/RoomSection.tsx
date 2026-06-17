import { BedCard } from "./BedCard";
import type { Bed, BedDetailsInput, BedFlagsInput, BedMemoInput, BedStatus, RoomWithBeds } from "../types";

interface RoomSectionProps {
  room: RoomWithBeds;
  now: number;
  onSetStatus: (bed: Bed, status: BedStatus) => Promise<void>;
  onSetDetails: (bed: Bed, input: BedDetailsInput) => Promise<void>;
  onSetFlags: (bed: Bed, input: BedFlagsInput) => Promise<void>;
  onSetMemo: (bed: Bed, input: BedMemoInput) => Promise<void>;
}

function roomClassName(name: string) {
  if (name.includes("VIP")) return "room-section--vip";
  if (name.includes("제모")) return "room-section--hair";
  if (name.includes("진료") || name.includes("처치")) return "room-section--treatment";
  if (name.includes("레이저")) return "room-section--laser";
  if (name.includes("관리")) return "room-section--care";
  return "room-section--default";
}

export function RoomSection({ room, now, onSetStatus, onSetDetails, onSetFlags, onSetMemo }: RoomSectionProps) {
  return (
    <section className={`room-section ${roomClassName(room.name)}`}>
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
            onSetDetails={onSetDetails}
            onSetFlags={onSetFlags}
            onSetMemo={onSetMemo}
          />
        ))}
      </div>
    </section>
  );
}
