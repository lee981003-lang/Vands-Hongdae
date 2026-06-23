import { useMemo, useState } from "react";
import { DateRangePicker, type DateRange } from "./DateRangePicker";
import { addDays, kstToday } from "../lib/time";
const rangeLabel = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" });
export function ProcedureHistory() {
  const [selected, setSelected] = useState<DateRange | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const { minDate, maxDate } = useMemo(() => { const today = kstToday(); return { minDate: addDays(today, -364), maxDate: today }; }, []);
  return <section className="procedure-history" role="tabpanel" aria-label="시술 기록">
    <div className="procedure-history__heading"><h1>시술 기록</h1><p>완료 내역과 평균 대기 시간 조회는 준비 중입니다.</p></div>
    <button type="button" className="date-range-trigger" onClick={() => setIsPickerOpen(true)}>{selected ? `${rangeLabel.format(selected.start)} ~ ${rangeLabel.format(selected.end)}` : "조회 기간 선택"}</button>
    <DateRangePicker open={isPickerOpen} title="조회 기간을 선택하세요" description="기간은 최대 1년까지 선택할 수 있어요." value={selected} minDate={minDate} maxDate={maxDate} maxRangeDays={365} onConfirm={setSelected} onClose={() => setIsPickerOpen(false)} />
    {selected ? <p className="procedure-history__selected">선택된 기간: {rangeLabel.format(selected.start)} ~ {rangeLabel.format(selected.end)}</p> : null}
  </section>;
}