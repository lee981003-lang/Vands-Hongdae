import { useEffect, useState } from "react";
import { AlarmClock } from "lucide-react";
import { elapsedMinutes, formatElapsed, statusLabel, warningLevel } from "../lib/time";
import type { Bed } from "../types";

interface SidePanelProps {
  beds: Bed[];
  roomNames: Map<string, string>;
  now: number;
}

export function SidePanel({ beds, roomNames, now }: SidePanelProps) {
  const [waitingExpanded, setWaitingExpanded] = useState(false);
  const [inTreatmentExpanded, setInTreatmentExpanded] = useState(false);
  const waitingBeds = beds.filter((bed) => bed.status === "waiting");
  const inTreatmentBeds = beds.filter((bed) => bed.status === "in_treatment");
  const waitingSignature = waitingBeds.map((bed) => `${bed.id}:${bed.status}:${bed.status_started_at}`).join("|");
  const inTreatmentSignature = inTreatmentBeds
    .map((bed) => `${bed.id}:${bed.status}:${bed.status_started_at}`)
    .join("|");
  const visibleWaitingBeds = waitingExpanded ? waitingBeds : waitingBeds.slice(0, 4);
  const visibleInTreatmentBeds = inTreatmentExpanded ? inTreatmentBeds : inTreatmentBeds.slice(0, 4);

  useEffect(() => {
    setWaitingExpanded(false);
  }, [waitingSignature]);

  useEffect(() => {
    setInTreatmentExpanded(false);
  }, [inTreatmentSignature]);

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
            visibleWaitingBeds.map(renderBed)
          )}
        </div>
        {waitingBeds.length > 4 && (
          <button
            className="side-list-more"
            type="button"
            aria-expanded={waitingExpanded}
            onClick={() => setWaitingExpanded((expanded) => !expanded)}
          >
            {waitingExpanded ? "\uC811\uAE30 \u2303" : `\uB354\uBCF4\uAE30 (\uC678 ${waitingBeds.length - 4}\uAC74) \u2304`}
          </button>
        )}
      </section>
      <section className="side-panel-section">
        <h3>시술중 고객</h3>
        <div className="side-list">
          {inTreatmentBeds.length === 0 ? (
            <p className="side-empty">시술 중인 고객의 경과 알림이 없습니다.</p>
          ) : (
            visibleInTreatmentBeds.map(renderBed)
          )}
        </div>
        {inTreatmentBeds.length > 4 && (
          <button
            className="side-list-more"
            type="button"
            aria-expanded={inTreatmentExpanded}
            onClick={() => setInTreatmentExpanded((expanded) => !expanded)}
          >
            {inTreatmentExpanded ? "\uC811\uAE30 \u2303" : `\uB354\uBCF4\uAE30 (\uC678 ${inTreatmentBeds.length - 4}\uAC74) \u2304`}
          </button>
        )}
      </section>
    </section>
  );
}
