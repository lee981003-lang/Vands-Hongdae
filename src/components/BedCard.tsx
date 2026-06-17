import type { CSSProperties } from "react";
import { ClipboardEdit, StickyNote } from "lucide-react";
import { BedFlags } from "./BedFlags";
import { StatusPicker } from "./StatusPicker";
import {
  elapsedMinutes,
  formatRemaining,
  formatTimeWindow,
  maskCustomerName,
  progressPercent,
  remainingMinutes,
  statusLabel,
  warningLevel,
} from "../lib/time";
import type { Bed, BedDetailsInput, BedFlagsInput, BedMemoInput, BedStatus } from "../types";

interface BedCardProps {
  bed: Bed;
  now: number;
  onSetStatus: (bed: Bed, status: BedStatus) => Promise<void>;
  onSetDetails: (bed: Bed, input: BedDetailsInput) => Promise<void>;
  onSetFlags: (bed: Bed, input: BedFlagsInput) => Promise<void>;
  onSetMemo: (bed: Bed, input: BedMemoInput) => Promise<void>;
}

function getAdminPin() {
  return window.prompt("관리자 PIN을 입력하세요.") ?? undefined;
}

export function BedCard({ bed, now, onSetStatus, onSetDetails, onSetFlags, onSetMemo }: BedCardProps) {
  const minutes = elapsedMinutes(bed.status_started_at, now);
  const level = bed.status === "empty" ? 0 : warningLevel(minutes);
  const remaining = remainingMinutes(minutes, bed.status);
  const progressStyle = { "--progress": `${progressPercent(minutes, bed.status)}%` } as CSSProperties;
  const isEmpty = bed.status === "empty";

  const editDetails = () => {
    const customerName = window.prompt("고객명", bed.customer_name ?? "");
    if (customerName === null) return;
    const treatmentName = window.prompt("시술명", bed.treatment_name ?? "");
    if (treatmentName === null) return;
    void onSetDetails(bed, { customerName, treatmentName });
  };

  const editMemo = () => {
    const pin = getAdminPin();
    if (pin === undefined) return;
    const memo = window.prompt("메모", bed.memo ?? "");
    if (memo === null) return;
    void onSetMemo(bed, { memo, pin });
  };

  return (
    <article className={`bed-card bed-card--${bed.status} bed-card--warning-${level}`}>
      <div className="bed-card__header">
        <div>
          <span className="bed-number">{bed.label}</span>
          <strong>{isEmpty ? "비어있음" : maskCustomerName(bed.customer_name)}</strong>
        </div>
        <div className="card-actions">
          <button className="icon-button" type="button" onClick={editDetails} aria-label="고객 정보 수정" title="고객 정보 수정">
            <ClipboardEdit size={15} aria-hidden="true" />
          </button>
          <button className="icon-button" type="button" onClick={editMemo} aria-label="메모 수정" title="메모 수정">
            <StickyNote size={15} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="bed-detail">
        <span>{isEmpty ? " " : bed.treatment_name || "시술명 미입력"}</span>
        <small>{formatTimeWindow(bed.status_started_at, bed.status)}</small>
      </div>

      <div className="status-progress">
        <StatusPicker value={bed.status} onChange={(status) => void onSetStatus(bed, status)} />
        <span>{formatRemaining(remaining, bed.status)}</span>
      </div>

      <div className="progress-track" style={progressStyle} aria-hidden="true" />
      <BedFlags bed={bed} onSetFlags={onSetFlags} getAdminPin={getAdminPin} />

      {bed.memo ? <p className="memo-preview">{bed.memo}</p> : <p className="memo-preview memo-preview--empty">{statusLabel(bed.status)}</p>}
    </article>
  );
}
