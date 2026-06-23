import { useMemo, useState } from "react";
import { DateRangePicker, type DateRange } from "./DateRangePicker";
import { addDays, kstToday } from "../lib/time";

const rangeLabel = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" });

export function ProcedureHistory() {
  const [selected, setSelected] = useState<DateRange | null>(null);

  // 활동 로그 30일 보존 정책에 맞춰 최근 30일(오늘 포함)만 선택 가능.
  const { minDate, maxDate } = useMemo(() => {
    const today = kstToday();
    return { minDate: addDays(today, -29), maxDate: today };
  }, []);

  return (
    <section className="procedure-history" role="tabpanel" aria-label="시술 기록">
      <div className="procedure-history__heading">
        <h1>조회 기간을 선택하세요</h1>
        <p>기간은 최근 30일 내에서 선택할 수 있어요.</p>
      </div>

      <DateRangePicker
        value={selected}
        minDate={minDate}
        maxDate={maxDate}
        maxRangeDays={30}
        onConfirm={setSelected}
      />

      {selected ? (
        <p className="procedure-history__selected">
          선택된 기간: {rangeLabel.format(selected.start)} ~ {rangeLabel.format(selected.end)}
        </p>
      ) : null}

      {/* TODO: 선택한 기간으로 시술 완료 내역·평균 대기 시간 통계를 조회한다(후속 Decision). */}
    </section>
  );
}
