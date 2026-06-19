import { AlarmClock } from "lucide-react";
import { elapsedMinutes, formatElapsed, statusLabel, warningLevel } from "../lib/time";
import type { Bed } from "../types";

interface SidePanelProps {
  beds: Bed[];
  roomNames: Map<string, string>;
  now: number;
}

export function SidePanel({ beds, roomNames, now }: SidePanelProps) {
  const visibleBeds = beds.slice(0, 4);

  return (
    <section className="side-panel side-panel--elapsed">
      <h2>경과 알림</h2>
      <div className="side-list">
        {visibleBeds.length === 0 ? (
          <p className="side-empty">경과 알림이 없습니다.</p>
        ) : (
          visibleBeds.map((bed) => {
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
          })
        )}
      </div>
    </section>
  );
}
