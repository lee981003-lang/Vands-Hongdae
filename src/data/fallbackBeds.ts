import type { Bed, Room } from "../types";

const roomSpecs = [
  ["vip", "VIP실", ["1", "2"]],
  ["hair-removal", "제모실", ["H1-1", "H1-2", "H2-1", "H2-2"]],
  ["treatment", "진료실", ["P1", "P2", "P3", "P4"]],
  ["laser", "레이저실", ["L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8", "L9", "L10", "L11", "L12"]],
  ["care", "관리실", ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]],
] as const;

const sampleStartedAt = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000).toISOString();

export const fallbackRooms: Room[] = roomSpecs.map(([id, name], index) => ({
  id,
  name,
  sort_order: index + 1,
}));

export const fallbackBeds: Bed[] = roomSpecs.flatMap(([roomId, , labels]) =>
  labels.map((label, index) => {
    const id = `${roomId}-${label}`;
    const base = {
      id,
      room_id: roomId,
      label,
      sort_order: index + 1,
      status: "empty",
      status_started_at: null,
      customer_name: null,
      treatment_name: null,
      prescription_status: "none",
      postpay_status: "none",
      memo: null,
      updated_at: sampleStartedAt(0),
    } satisfies Bed;

    if (roomId === "vip" && index === 0) {
      return {
        ...base,
        status: "in_treatment",
        status_started_at: sampleStartedAt(18),
        customer_name: "김민지",
        treatment_name: "리프팅",
        prescription_status: "pending",
        memo: "원장 확인",
      } satisfies Bed;
    }

    if (roomId === "laser" && index === 2) {
      return {
        ...base,
        status: "waiting",
        status_started_at: sampleStartedAt(34),
        customer_name: "이서연",
        treatment_name: "토닝",
        postpay_status: "pending",
      } satisfies Bed;
    }

    if (roomId === "care" && index === 4) {
      return {
        ...base,
        status: "reanesthesia_bed",
        status_started_at: sampleStartedAt(9),
        customer_name: "박지훈",
        treatment_name: "수면 재마취",
      } satisfies Bed;
    }

    return base;
  }),
);
