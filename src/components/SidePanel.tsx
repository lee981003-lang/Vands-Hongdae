import { AlarmClock } from "lucide-react";
import { elapsedMinutes, formatElapsed, statusLabel, warningLevel } from "../lib/time";
import type { Bed } from "../types";

interface SidePanelProps {
  beds: Bed[];
  roomNames: Map<string, string>;
  now: number;
}

export function SidePanel({ beds, roomNames, now }: SidePanelProps) {
  const waitingBeds = beds.filter((bed) => bed.status === "waiting").slice(0, 4);
  const inTreatmentBeds = beds.filter((bed) => bed.status === "in_treatment").slice(0, 4);

  const renderBed = (bed: Bed) => {
    const elapsed = elapsedMinutes(bed.status_started_at, now);
    const tone = warningLevel(elapsed) === 2 ? "red" : "orange";

    return (
      <article className={`side-list-item side-list-item--${tone}`} key={bed.id}>
        <span className={`side-icon side-icon--${tone}`}>
          <AlarmClock size={18} aria-hidden="true" />
        </span>
        <div>
          <strong>
            {roomNames.get(bed.room_id)} {bed.label}
          </strong>
          <span>{statusLabel(bed.status)}</span>
        </div>
        <em>{formatElapsed(elapsed)}</em>
      </article>
    );
  };

  return (
    <section className="side-panel side-panel--elapsed">
      <h2>경과 알림</h2>
      <section className="side-panel-section">
        <h3>대기 고객</h3>
        <div className="side-list">
          {waitingBeds.length === 0 ? (
            <p className="side-empty">대기 중인 고객의 경과 알림이 없습니다.</p>
          ) : (
            waitingBeds.map(renderBed)
          )}
        </div>
      </section>
      <section className="side-panel-section">
        <h3>시술중 고객</h3>
        <div className="side-list">
          {inTreatmentBeds.length === 0 ? (
            <p className="side-empty">시술 중인 고객의 경과 알림이 없습니다.</p>
          ) : (
            inTreatmentBeds.map(renderBed)
          )}
        </div>
      </section>
    </section>
  );
}
