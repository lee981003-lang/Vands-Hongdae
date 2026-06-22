import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type ActivityLogEntry = {
  id: number;
  actor_username: string | null;
  action: string;
  room_name: string;
  bed_label: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  created_at: string;
};

const actionLabels: Record<string, string> = {
  bed_status_change: "상태 변경",
  bed_memo_change: "메모 변경",
  bed_flags_change: "처방/후불 변경",
  bed_follow_up_change: "후속 관리 변경",
  bed_details_change: "고객/시술 변경",
};

const fieldLabels: Record<string, string> = {
  status: "상태",
  customer_name: "고객명",
  treatment_name: "시술명",
  prescription_status: "처방",
  postpay_status: "후불",
  is_follow_up: "후속 관리",
  memo: "메모",
};

const valueLabels: Record<string, string> = {
  empty: "빈 룸",
  in_treatment: "시술 중",
  waiting: "시술 대기",
  none: "없음",
  pending: "대기",
  done: "완료",
};

function formatValue(value: unknown) {
  if (value === null || value === "") return "없음";
  if (value === true) return "예";
  if (value === false) return "아니오";
  if (typeof value === "string") return valueLabels[value] ?? value;
  return String(value);
}

function describeChange(before: Record<string, unknown>, after: Record<string, unknown>) {
  return Object.keys(after)
    .filter((key) => before[key] !== after[key])
    .map((key) => `${fieldLabels[key] ?? key}: ${formatValue(before[key])} → ${formatValue(after[key])}`)
    .join(" · ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export function ActivityLog() {
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) {
      setError("Supabase 연결 설정을 확인해 주세요.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("get_activity_log", { p_limit: 50, p_offset: 0 });

    if (rpcError) {
      setError("활동 로그를 불러올 수 없습니다.");
    } else {
      setEntries((data ?? []) as ActivityLogEntry[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="activity-log" role="tabpanel" aria-label="활동 로그">
      <div className="activity-log__heading">
        <div>
          <h1>활동 로그</h1>
          <p>최근 베드 상태와 정보 변경 이력입니다.</p>
        </div>
        <button className="admin-card__button" type="button" onClick={() => void load()} disabled={loading}>새로고침</button>
      </div>

      {loading ? <p className="activity-log__empty">활동 로그를 불러오는 중입니다.</p> : null}
      {error ? <p className="activity-log__empty">{error}</p> : null}
      {!loading && !error && entries.length === 0 ? <p className="activity-log__empty">최근 30일 동안 기록된 활동이 없습니다.</p> : null}
      {!loading && !error && entries.length > 0 ? (
        <div className="activity-log__table-wrap">
          <table>
            <thead>
              <tr><th>시각</th><th>작업자</th><th>대상</th><th>작업</th><th>변경 내용</th></tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{formatDate(entry.created_at)}</td>
                  <td>{entry.actor_username || "알 수 없음"}</td>
                  <td>{entry.room_name} · {entry.bed_label}</td>
                  <td>{actionLabels[entry.action] ?? entry.action}</td>
                  <td>{describeChange(entry.before, entry.after)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
