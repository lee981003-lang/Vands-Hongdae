import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { dayDiff, isSameDay, kstToday, startOfDay } from "../lib/time";

export type DateRange = { start: Date; end: Date };

interface DateRangePickerProps {
  value?: DateRange | null;
  /** 시작·종료일을 포함한 선택 가능 일수 (기본 365). */
  maxRangeDays?: number;
  /** 선택 가능한 가장 이른 날짜 (포함). */
  minDate?: Date;
  /** 선택 가능한 가장 늦은 날짜 (포함). */
  maxDate?: Date;
  onConfirm: (range: DateRange) => void;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const monthLabel = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" });

export function DateRangePicker({ value, maxRangeDays = 365, minDate, maxDate, onConfirm }: DateRangePickerProps) {
  const [pendingStart, setPendingStart] = useState<Date | null>(value ? startOfDay(value.start) : null);
  const [pendingEnd, setPendingEnd] = useState<Date | null>(value ? startOfDay(value.end) : null);
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    const base = value?.start ?? maxDate ?? kstToday();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  // 외부 value가 바뀌면 내부 선택 상태를 동기화한다.
  useEffect(() => {
    setPendingStart(value ? startOfDay(value.start) : null);
    setPendingEnd(value ? startOfDay(value.end) : null);
  }, [value]);

  const min = minDate ? startOfDay(minDate) : null;
  const max = maxDate ? startOfDay(maxDate) : null;
  const today = kstToday();

  const selectingEnd = pendingStart !== null && pendingEnd === null;

  function isDisabled(day: Date): boolean {
    if (min && dayDiff(min, day) < 0) return true;
    if (max && dayDiff(day, max) < 0) return true;
    // 종료일 선택 중에는 시작일 기준 maxRangeDays 범위를 벗어난 날짜를 막는다.
    if (selectingEnd && pendingStart && Math.abs(dayDiff(pendingStart, day)) > maxRangeDays - 1) return true;
    return false;
  }

  function handleSelect(day: Date) {
    if (isDisabled(day)) return;

    if (pendingStart === null || pendingEnd !== null) {
      // 새 범위 시작
      setPendingStart(day);
      setPendingEnd(null);
      return;
    }

    // 두 번째 탭 → 종료일 확정 (역순이면 자동 교환)
    if (dayDiff(pendingStart, day) < 0) {
      setPendingEnd(pendingStart);
      setPendingStart(day);
    } else {
      setPendingEnd(day);
    }
  }

  const grid = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);

  function inRange(day: Date): boolean {
    if (!pendingStart || !pendingEnd) return false;
    return dayDiff(pendingStart, day) > 0 && dayDiff(day, pendingEnd) > 0;
  }

  const canGoPrev = !min || viewMonth.getTime() > new Date(min.getFullYear(), min.getMonth(), 1).getTime();
  const canGoNext = !max || viewMonth.getTime() < new Date(max.getFullYear(), max.getMonth(), 1).getTime();

  const rangeComplete = pendingStart !== null && pendingEnd !== null;
  const confirmLabel = rangeComplete
    ? `${monthLabel.format(pendingStart!)} ~ ${monthLabel.format(pendingEnd!)}`
    : "기간을 선택하세요";

  return (
    <div className="date-range-picker">
      <div className="date-range-picker__nav">
        <button
          type="button"
          className="date-range-picker__nav-button"
          onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          disabled={!canGoPrev}
          aria-label="이전 달"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <span className="date-range-picker__month">{`${viewMonth.getFullYear()}년 ${viewMonth.getMonth() + 1}월`}</span>
        <button
          type="button"
          className="date-range-picker__nav-button"
          onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          disabled={!canGoNext}
          aria-label="다음 달"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="date-range-picker__weekdays" aria-hidden="true">
        {WEEKDAYS.map((label) => (
          <span key={label} className="date-range-picker__weekday">{label}</span>
        ))}
      </div>

      <div className="date-range-picker__grid" role="grid">
        {grid.map((day, index) =>
          day === null ? (
            <span key={`blank-${index}`} className="date-range-picker__cell date-range-picker__cell--blank" />
          ) : (
            <button
              key={day.getTime()}
              type="button"
              role="gridcell"
              className={cellClassName(day, pendingStart, pendingEnd, inRange(day), isSameDay(day, today))}
              disabled={isDisabled(day)}
              aria-pressed={
                (pendingStart && isSameDay(day, pendingStart)) || (pendingEnd && isSameDay(day, pendingEnd))
                  ? true
                  : undefined
              }
              onClick={() => handleSelect(day)}
            >
              {day.getDate()}
            </button>
          ),
        )}
      </div>

      <button
        type="button"
        className="date-range-picker__confirm"
        disabled={!rangeComplete}
        onClick={() => {
          if (pendingStart && pendingEnd) onConfirm({ start: pendingStart, end: pendingEnd });
        }}
      >
        {confirmLabel}
      </button>
    </div>
  );
}

function buildMonthGrid(viewMonth: Date): Array<Date | null> {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: Array<Date | null> = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(new Date(year, month, d));
  return cells;
}

function cellClassName(
  day: Date,
  start: Date | null,
  end: Date | null,
  isInRange: boolean,
  isToday: boolean,
): string {
  const classes = ["date-range-picker__cell"];
  if (start && isSameDay(day, start)) classes.push("date-range-picker__cell--start");
  if (end && isSameDay(day, end)) classes.push("date-range-picker__cell--end");
  if (isInRange) classes.push("date-range-picker__cell--in-range");
  if (isToday) classes.push("date-range-picker__cell--today");
  return classes.join(" ");
}
