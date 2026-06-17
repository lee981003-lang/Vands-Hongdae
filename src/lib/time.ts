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

export function progressPercent(minutes: number | null, status: BedStatus) {
  if (status === "empty" || minutes === null) return 0;
  return Math.min(100, Math.max(6, Math.round((minutes / DEFAULT_DURATION_MINUTES) * 100)));
}

export function formatTimeWindow(startedAt: string | null, status: BedStatus) {
  if (status === "empty" || !startedAt) return "";

  const started = new Date(startedAt);
  if (Number.isNaN(started.getTime())) return "";

  const ended = new Date(started.getTime() + DEFAULT_DURATION_MINUTES * 60_000);
  const formatter = new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${formatter.format(started)} ~ ${formatter.format(ended)}`;
}

export function statusLabel(status: BedStatus) {
  if (status === "in_treatment") return "시술 중";
  if (status === "waiting") return "대기";
  if (status === "reanesthesia_waiting") return "재마취 대기";
  if (status === "reanesthesia_bed") return "재마취";
  return "빈 룸";
}

export function maskCustomerName(name: string | null) {
  const value = name?.trim();
  if (!value) return "고객 미입력";
  if (value.length <= 1) return value;
  if (value.length === 2) return `${value[0]}*`;
  return `${value[0]}${"*".repeat(value.length - 2)}${value[value.length - 1]}`;
}

export function nextFlagStatus(status: FlagStatus): FlagStatus {
  if (status === "none") return "pending";
  if (status === "pending") return "done";
  return "none";
}

export function applyLocalStatus(bed: Bed, status: BedStatus): Bed {
  const now = new Date().toISOString();

  if (status === "empty") {
    return {
      ...bed,
      status,
      status_started_at: now,
      customer_name: null,
      treatment_name: null,
      prescription_status: "none",
      postpay_status: "none",
      memo: null,
      updated_at: now,
    };
  }

  return {
    ...bed,
    status,
    status_started_at: now,
    updated_at: now,
  };
}
