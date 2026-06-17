import type { BedStatus } from "../types";
import { STATUS_OPTIONS } from "../types";

interface StatusPickerProps {
  value: BedStatus;
  onChange: (status: BedStatus) => void;
}

export function StatusPicker({ value, onChange }: StatusPickerProps) {
  return (
    <label className={`status-picker status-picker--${value}`}>
      <span className="sr-only">베드 상태</span>
      <select value={value} onChange={(event) => onChange(event.target.value as BedStatus)} aria-label="베드 상태 선택">
      {STATUS_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
      </select>
    </label>
  );
}
