import { AlarmClock, DoorOpen, UserRound, UsersRound } from "lucide-react";
import { elapsedMinutes, remainingMinutes } from "../lib/time";
import type { Bed } from "../types";

interface SummaryBarProps {
  beds: Bed[];
  now: number;
}

export function SummaryBar({ beds, now }: SummaryBarProps) {
  const inTreatment = beds.filter((bed) => bed.status === "in_treatment" || bed.status === "reanesthesia_bed").length;
  const waiting = beds.filter((bed) => bed.status === "waiting" || bed.status === "reanesthesia_waiting").length;
  const empty = beds.filter((bed) => bed.status === "empty").length;
  const endingSoon = beds.filter((bed) => {
    const remaining = remainingMinutes(elapsedMinutes(bed.status_started_at, now), bed.status);
    return remaining !== null && remaining <= 15 && bed.status !== "empty";
  }).length;

  const items = [
    { label: "시술 중", value: inTreatment, icon: UserRound, tone: "green" },
    { label: "대기", value: waiting, icon: UsersRound, tone: "blue" },
    { label: "곧 종료", value: endingSoon, icon: AlarmClock, tone: "orange" },
    { label: "빈 룸", value: empty, icon: DoorOpen, tone: "neutral" },
  ] as const;

  return (
    <section className="summary-grid" aria-label="현황 요약">
      {items.map(({ label, value, icon: Icon, tone }) => (
        <div className={`summary-tile summary-tile--${tone}`} key={label}>
          <Icon size={18} aria-hidden="true" />
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </section>
  );
}
