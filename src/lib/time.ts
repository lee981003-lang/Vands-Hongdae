import type { Bed, BedStatus, FlagStatus } from "../types";

const WARNING_MINUTES = 15;
const CRITICAL_MINUTES = 30;
const DEFAULT_DURATION_MINUTES = 45;

export function elapsedMinutes(startedAt: string | null, now: number): number | null {
  if (!startedAt) return null;

  const started = new Date(startedAt).getTime();
  if (Number.isNaN(started)) return null;

  return Math.max(0, Math.floor((now - started) / 60_000));
}

export function warningLevel(minutes: number | null): 0 | 1 | 2 {
  if (minutes === null || minutes < WARNING_MINUTES) return 0;
  if (minutes < CRITICAL_MINUTES) return 1;
  return 2;
}

export function formatElapsed(minutes: number | null) {
  if (minutes === null) return "-";
  if (minutes < 60) return `${minutes}분`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}시간 ${rest}분`;
}

export function remainingMinutes(minutes: number | null, status: BedStatus): number | null {
  if (status === "empty" || minutes === null) return null;
  return Math.max(0, DEFAULT_DURATION_MINUTES - minutes);
}

export function formatRemaining(minutes: number | null, status: BedStatus) {
  if (status === "empty") return "";
  if (minutes === null) return "-";
  if (minutes === 0) return "종료 예정";
  return `${minutes}분 남음`;
}

function formatClock(startedAt: string | null) {
  if (!startedAt) return "";

  const started = new Date(startedAt);
  if (Number.isNaN(started.getTime())) return "";

  return new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(started);
}

function minutesBetween(startedAt: string | null, endedAt: string | null) {
  if (!startedAt || !endedAt) return null;

  const started = new Date(startedAt).getTime();
  const ended = new Date(endedAt).getTime();
  if (Number.isNaN(started) || Number.isNaN(ended)) return null;

  return Math.max(0, Math.floor((ended - started) / 60_000));
}

export function formatStatusTimeline(bed: Bed, now: number) {
  if (bed.status === "empty") return [];

  if (bed.status === "waiting") {
    const waitingStartedAt = bed.waiting_started_at ?? bed.status_started_at;
    const waitingStarted = formatClock(waitingStartedAt);
    const waitingMinutes = elapsedMinutes(waitingStartedAt, now);
    if (!waitingStarted) return [];

    return [`${waitingStarted}~`, `(${formatElapsed(waitingMinutes)} 대기 중)`];
  }

  const treatmentStarted = formatClock(bed.status_started_at);
  const treatmentMinutes = elapsedMinutes(bed.status_started_at, now);
  const rows: string[] = [];

  if (bed.waiting_started_at && bed.status_started_at) {
    const waitingStarted = formatClock(bed.waiting_started_at);
    const waitingEnded = formatClock(bed.status_started_at);
    const waitingMinutes = minutesBetween(bed.waiting_started_at, bed.status_started_at);
    if (waitingStarted && waitingEnded) {
      rows.push(`대기 ${waitingStarted}~${waitingEnded} (${formatElapsed(waitingMinutes)})`);
    }
  }

  if (treatmentStarted) {
    rows.push(`시술중 ${treatmentStarted}~ (${formatElapsed(treatmentMinutes)} 경과)`);
  }

  return rows;
}

export function progressPercent(minutes: number | null, status: BedStatus) {
  if (status === "empty" || minutes === null) return 0;
  return Math.min(100, Math.max(6, Math.round((minutes / DEFAULT_DURATION_MINUTES) * 100)));
}

export function statusLabel(status: BedStatus) {
  if (status === "in_treatment") return "시술 중";
  if (status === "waiting") return "대기";
  return "빈 룸";
}

export function nextFlagStatus(status: FlagStatus): FlagStatus {
  if (status === "none") return "pending";
  if (status === "pending") return "done";
  return "none";
}

export function nextBedStatus(status: BedStatus): BedStatus {
  if (status === "empty") return "waiting";
  if (status === "waiting") return "in_treatment";
  return "empty";
}

export function applyLocalStatus(bed: Bed, status: BedStatus): Bed {
  const now = new Date().toISOString();

  if (status === "empty") {
    return {
      ...bed,
      status,
      status_started_at: now,
      waiting_started_at: null,
      customer_name: null,
      treatment_name: null,
      prescription_status: "none",
      postpay_status: "none",
      is_follow_up: false,
      memo: null,
      updated_at: now,
    };
  }

  if (status === "waiting") {
    return {
      ...bed,
      status,
      status_started_at: now,
      waiting_started_at: now,
      updated_at: now,
    };
  }

  return {
    ...bed,
    status,
    status_started_at: now,
    waiting_started_at: bed.status === "waiting" ? bed.waiting_started_at ?? bed.status_started_at : bed.waiting_started_at ?? null,
    updated_at: now,
  };
}
