import { Check, CreditCard, FileText } from "lucide-react";
import { nextFlagStatus } from "../lib/time";
import type { Bed, BedFlagsInput, FlagStatus } from "../types";

interface BedFlagsProps {
  bed: Bed;
  onSetFlags: (bed: Bed, input: BedFlagsInput) => Promise<void>;
  getAdminPin: () => string | undefined;
}

function flagLabel(status: FlagStatus) {
  if (status === "pending") return "대기";
  if (status === "done") return "완료";
  return "없음";
}

export function BedFlags({ bed, onSetFlags, getAdminPin }: BedFlagsProps) {
  const updateFlag = (target: "prescription" | "postpay") => {
    const pin = getAdminPin();
    if (pin === undefined) return;

    const input: BedFlagsInput = {
      prescriptionStatus: target === "prescription" ? nextFlagStatus(bed.prescription_status) : bed.prescription_status,
      postpayStatus: target === "postpay" ? nextFlagStatus(bed.postpay_status) : bed.postpay_status,
      pin,
    };

    void onSetFlags(bed, input);
  };

  return (
    <div className="flag-row" aria-label="처방전 및 후수납 상태">
      <button
        className={`flag-chip flag-chip--${bed.prescription_status}`}
        type="button"
        onClick={() => updateFlag("prescription")}
        title="처방전 상태 변경"
      >
        {bed.prescription_status === "done" ? <Check size={14} aria-hidden="true" /> : <FileText size={14} aria-hidden="true" />}
        <span>처방전 {flagLabel(bed.prescription_status)}</span>
      </button>
      <button
        className={`flag-chip flag-chip--${bed.postpay_status}`}
        type="button"
        onClick={() => updateFlag("postpay")}
        title="후수납 상태 변경"
      >
        {bed.postpay_status === "done" ? <Check size={14} aria-hidden="true" /> : <CreditCard size={14} aria-hidden="true" />}
        <span>후수납 {flagLabel(bed.postpay_status)}</span>
      </button>
    </div>
  );
}
