import type { CSSProperties, KeyboardEvent } from "react";
import {
  elapsedMinutes,
  formatStatusTimeline,
  nextBedStatus,
  progressPercent,
  statusLabel,
  warningLevel,
} from "../lib/time";
import type { Bed, BedStatus } from "../types";

interface BedCardProps {
  bed: Bed;
  now: number;
  onSetStatus: (bed: Bed, status: BedStatus) => Promise<void>;
  onSetFollowUp: (bed: Bed, isFollowUp: boolean) => Promise<void>;
}

export function BedCard({ bed, now, onSetStatus, onSetFollowUp }: BedCardProps) {
  const minutes = elapsedMinutes(bed.status_started_at, now);
  const level = bed.status === "empty" ? 0 : warningLevel(minutes);
  const progressStyle = { "--progress": String(progressPercent(minutes, bed.status)) + "%" } as CSSProperties;
  const timelineRows = formatStatusTimeline(bed, now);
  const className = [
    "bed-card",
    ["bed-card--", bed.status].join(""),
    ["bed-card--warning-", level].join(""),
    bed.is_follow_up ? "bed-card--followup" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const rotateStatus = () => {
    void onSetStatus(bed, nextBedStatus(bed.status));
  };

  const toggleFollowUp = () => {
    void onSetFollowUp(bed, !bed.is_follow_up);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    rotateStatus();
  };

  const handleControlKeyDown = (event: KeyboardEvent<HTMLButtonElement>, action: () => void) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    action();
  };

  return (
    <article
      className={className}
      role="button"
      tabIndex={0}
      aria-label={[bed.label, statusLabel(bed.status)].join(" ")}
      onClick={rotateStatus}
      onKeyDown={handleKeyDown}
    >
      <div className="bed-card__header">
        <div>
          <span className="bed-number">{bed.label}</span>
          <strong>{statusLabel(bed.status)}</strong>
        </div>
      </div>

      <div className="bed-detail">
        {timelineRows.length > 0 ? timelineRows.map((row) => <small key={row}>{row}</small>) : <small> </small>}
      </div>

      <div className="progress-track" style={progressStyle} aria-hidden="true" />

      <div className="bed-card__controls" onClick={(event) => event.stopPropagation()}>
        <button
          className={bed.is_follow_up ? "flag-chip flag-chip--followup flag-chip--active" : "flag-chip flag-chip--followup"}
          type="button"
          onClick={toggleFollowUp}
          onKeyDown={(event) => handleControlKeyDown(event, toggleFollowUp)}
          aria-pressed={bed.is_follow_up}
          title="F/U"
        >
          F/U
        </button>
      </div>
    </article>
  );
}
