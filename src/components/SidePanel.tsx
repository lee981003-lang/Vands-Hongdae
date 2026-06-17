import { AlarmClock, UsersRound } from "lucide-react";
import { elapsedMinutes, formatRemaining, remainingMinutes } from "../lib/time";
import type { Bed } from "../types";

interface SidePanelProps {
  title: string;
  beds: Bed[];
  roomNames: Map<string, string>;
  now: number;
  tone: "orange" | "blue";
}

function panelIcon(tone: SidePanelProps["tone"]) {
  return tone === "orange" ? AlarmClock : UsersRound;
}

export function SidePanel({ title, beds, roomNames, now, tone }: SidePanelProps) {
  const Icon = panelIcon(tone);
  const visibleBeds = beds.slice(0, 4);

  return (
    <section className="side-panel">
      <h2>{title}</h2>
      <div className="side-list">
        {visibleBeds.length === 0 ? (
          <p className="side-empty">표시할 항목이 없습니다.</p>
        ) : (
          visibleBeds.map((bed) => {
            const remaining = remainingMinutes(elapsedMinutes(bed.status_started_at, now), bed.status);
            return (
              <article className="side-list-item" key={bed.id}>
                <span className={`side-icon side-icon--${tone}`}>
                  <Icon size={18} aria-hidden="true" />
                </span>
                <div>
                  <strong>
                    {roomNames.get(bed.room_id)} {bed.label}
                  </strong>
                  <span>{bed.treatment_name || bed.customer_name || "대기 1명"}</span>
                </div>
                <em>{formatRemaining(remaining, bed.status)}</em>
              </article>
            );
          })
        )}
      </div>
      <button className="side-more" type="button">
        전체 보기
      </button>
    </section>
  );
}
