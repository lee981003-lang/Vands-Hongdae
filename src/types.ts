export const STATUS_OPTIONS = [
  { value: "empty", label: "빈 룸" },
  { value: "in_treatment", label: "시술중" },
  { value: "waiting", label: "시술대기" },
  { value: "reanesthesia_waiting", label: "재마취(대기실)" },
  { value: "reanesthesia_bed", label: "재마취(베드)" },
] as const;

export type BedStatus = (typeof STATUS_OPTIONS)[number]["value"];
export type FlagStatus = "none" | "pending" | "done";
export type ConnectionState = "local" | "connecting" | "live" | "error";

export interface Room {
  id: string;
  name: string;
  sort_order: number;
}

export interface Bed {
  id: string;
  room_id: string;
  label: string;
  sort_order: number;
  status: BedStatus;
  status_started_at: string | null;
  customer_name: string | null;
  treatment_name: string | null;
  prescription_status: FlagStatus;
  postpay_status: FlagStatus;
  memo: string | null;
  updated_at: string;
}

export interface RoomWithBeds extends Room {
  beds: Bed[];
}

export interface BedDetailsInput {
  customerName: string;
  treatmentName: string;
}

export interface BedFlagsInput {
  prescriptionStatus: FlagStatus;
  postpayStatus: FlagStatus;
  pin?: string;
}

export interface BedMemoInput {
  memo: string;
  pin?: string;
}
