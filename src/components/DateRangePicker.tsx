import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { dayDiff, isSameDay, kstToday, startOfDay } from "../lib/time";
export type DateRange = { start: Date; end: Date };
interface DateRangePickerProps { open: boolean; title: string; description: string; value?: DateRange | null; maxRangeDays?: number; minDate?: Date; maxDate?: Date; onConfirm: (range: DateRange) => void; onClose: () => void; }
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const monthLabel = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" });
export function DateRangePicker({ open, title, description, value, maxRangeDays = 365, minDate, maxDate, onConfirm, onClose }: DateRangePickerProps) {
  const [pendingStart, setPendingStart] = useState<Date | null>(value ? startOfDay(value.start) : null);
  const [pendingEnd, setPendingEnd] = useState<Date | null>(value ? startOfDay(value.end) : null);
  const [viewMonth, setViewMonth] = useState(() => monthOf(value?.start ?? maxDate ?? kstToday()));
  const resetPending = useCallback(() => { setPendingStart(value ? startOfDay(value.start) : null); setPendingEnd(value ? startOfDay(value.end) : null); setViewMonth(monthOf(value?.start ?? maxDate ?? kstToday())); }, [maxDate, value]);
  useEffect(() => { if (open) resetPending(); }, [open, resetPending]);
  useEffect(() => { if (!open) return; const handler = (event: KeyboardEvent) => { if (event.key === "Escape") { resetPending(); onClose(); } }; window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler); }, [onClose, open, resetPending]);
  const min = minDate ? startOfDay(minDate) : null, max = maxDate ? startOfDay(maxDate) : null, today = kstToday();
  const selectingEnd = pendingStart !== null && pendingEnd === null;
  const isDisabled = (day: Date) => Boolean((min && dayDiff(min, day) < 0) || (max && dayDiff(day, max) < 0) || (selectingEnd && pendingStart && Math.abs(dayDiff(pendingStart, day)) > maxRangeDays - 1));
  const select = (day: Date) => { if (isDisabled(day)) return; if (!pendingStart || pendingEnd) { setPendingStart(day); setPendingEnd(null); } else if (dayDiff(pendingStart, day) < 0) { setPendingEnd(pendingStart); setPendingStart(day); } else setPendingEnd(day); };
  const grid = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);
  const inRange = (day: Date) => Boolean(pendingStart && pendingEnd && dayDiff(pendingStart, day) > 0 && dayDiff(day, pendingEnd) > 0);
  const canGoPrev = !min || viewMonth.getTime() > monthOf(min).getTime(), canGoNext = !max || viewMonth.getTime() < monthOf(max).getTime();
  const rangeComplete = Boolean(pendingStart && pendingEnd), confirmLabel = rangeComplete ? `${monthLabel.format(pendingStart!)} ~ ${monthLabel.format(pendingEnd!)}` : "기간을 선택하세요";
  const close = () => { resetPending(); onClose(); };
  if (!open) return null;
  return <div className="date-range-picker__backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
    <section className="date-range-picker" role="dialog" aria-modal="true" aria-labelledby="date-range-picker-title">
      <div className="date-range-picker__header"><div><h2 id="date-range-picker-title" className="date-range-picker__title">{title}</h2><p className="date-range-picker__description">{description}</p></div><button type="button" className="date-range-picker__close" onClick={close} aria-label="기간 선택 닫기"><X size={18} aria-hidden="true" /></button></div>
      <div className="date-range-picker__nav"><span className="date-range-picker__month">{`${viewMonth.getFullYear()}년 ${viewMonth.getMonth() + 1}월`}</span><div className="date-range-picker__nav-controls"><button type="button" className="date-range-picker__nav-button" onClick={() => setViewMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))} disabled={!canGoPrev} aria-label="이전 달"><ChevronLeft size={20} aria-hidden="true" /></button><button type="button" className="date-range-picker__nav-button" onClick={() => setViewMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))} disabled={!canGoNext} aria-label="다음 달"><ChevronRight size={20} aria-hidden="true" /></button></div></div>
      <div className="date-range-picker__weekdays" aria-hidden="true">{WEEKDAYS.map((label) => <span key={label} className="date-range-picker__weekday">{label}</span>)}</div>
      <div className="date-range-picker__grid" role="grid">{grid.map((day, index) => day === null ? <span key={`blank-${index}`} className="date-range-picker__cell date-range-picker__cell--blank" /> : <button key={day.getTime()} type="button" role="gridcell" className={cellClassName(day, pendingStart, pendingEnd, inRange(day), isSameDay(day, today))} disabled={isDisabled(day)} aria-pressed={(pendingStart && isSameDay(day, pendingStart)) || (pendingEnd && isSameDay(day, pendingEnd)) ? true : undefined} onClick={() => select(day)}>{day.getDate()}</button>)}</div>
      <button type="button" className="date-range-picker__confirm" disabled={!rangeComplete} onClick={() => { if (!pendingStart || !pendingEnd) return; onConfirm({ start: pendingStart, end: pendingEnd }); onClose(); }}>{confirmLabel}</button>
    </section>
  </div>;
}
function monthOf(date: Date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
function buildMonthGrid(viewMonth: Date): Array<Date | null> { const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1).getDay(), days = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate(); return [...Array.from({ length: first }, () => null), ...Array.from({ length: days }, (_, index) => new Date(viewMonth.getFullYear(), viewMonth.getMonth(), index + 1))]; }
function cellClassName(day: Date, start: Date | null, end: Date | null, isInRange: boolean, isToday: boolean) { const classes = ["date-range-picker__cell"]; if (start && isSameDay(day, start)) classes.push("date-range-picker__cell--start"); if (end && isSameDay(day, end)) classes.push("date-range-picker__cell--end"); if (isInRange) classes.push("date-range-picker__cell--in-range"); if (isToday) classes.push("date-range-picker__cell--today"); return classes.join(" "); }
