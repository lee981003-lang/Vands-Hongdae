import type { KeyboardEvent } from "react";
import { Check, CreditCard, FileText } from "lucide-react";
import { nextFlagStatus } from "../lib/time";
import type { Bed, BedFlagsInput, FlagStatus } from "../types";

interface BedFlagsProps {
  bed: Bed;
  onSetFlags: (bed: Bed, input: BedFlagsInput) => Promise<void>;
}

function flagLabel(status: FlagStatus) {
  if (status === "pending") return "대기";
  if (status === "done") return "완료";
  return "없음";
}

export function BedFlags({ bed, onSetFlags }: BedFlagsProps) {
  const updateFlag = (target: "prescription" | "postpay") => {
    const input: BedFlagsInput = {
      prescriptionStatus: target === "prescription" ? nextFlagStatus(bed.prescription_status) : bed.prescription_status,
      postpayStatus: target === "postpay" ? nextFlagStatus(bed.postpay_status) : bed.postpay_status,
    };

    void onSetFlags(bed, input);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, target: "prescription" | "postpay") => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    updateFlag(target);
  };

  return (
    <div className="flag-row" aria-label="처방전 및 후수납 상태">
      <button
        className={`flag-chip flag-chip--${bed.prescription_status}`}
        type="button"
        onClick={() => updateFlag("prescription")}
        onKeyDown={(event) => handleKeyDown(event, "prescription")}
        title="처방전 상태 변경"
      >
        {bed.prescription_status === "done" ? <Check size={14} aria-hidden="true" /> : <FileText size={14} aria-hidden="true" />}
        <span>처방전 {flagLabel(bed.prescription_status)}</span>
      </button>
      <button
        className={`flag-chip flag-chip--${bed.postpay_status}`}
        type="button"
        onClick={() => updateFlag("postpay")}
        onKeyDown={(event) => handleKeyDown(event, "postpay")}
        title="후수납 상태 변경"
      >
        {bed.postpay_status === "done" ? <Check size={14} aria-hidden="true" /> : <CreditCard size={14} aria-hidden="true" />}
        <span>후수납 {flagLabel(bed.postpay_status)}</span>
      </button>
    </div>
  );
}
