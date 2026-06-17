import { RefreshCw } from "lucide-react";
import vandsLogo from "./assets/vands-logo.png";
import { Dashboard } from "./components/Dashboard";
import { SummaryBar } from "./components/SummaryBar";
import { Toast } from "./components/Toast";
import { useBeds } from "./hooks/useBeds";
import { useNow } from "./hooks/useNow";

export function App() {
  const now = useNow();
  const beds = useBeds();

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-block" aria-label="브랜드">
          <img src={vandsLogo} alt="홍대 밴스피부과의원" />
        </div>
        <SummaryBar beds={beds.beds} now={now} />
        <div className="topbar-actions">
          <div className="live-clock">
            <span>{new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(now)}</span>
            <small>실시간 업데이트</small>
          </div>
          <button className="icon-text-button" type="button" onClick={beds.refresh} disabled={beds.loading}>
            <RefreshCw size={18} aria-hidden="true" />
            새로고침
          </button>
        </div>
      </header>

      <Dashboard
        beds={beds.beds}
        rooms={beds.rooms}
        connection={beds.connection}
        loading={beds.loading}
        now={now}
        onSetStatus={beds.setStatus}
        onSetDetails={beds.setDetails}
        onSetFlags={beds.setFlags}
        onSetMemo={beds.setMemo}
      />

      {beds.message ? <Toast message={beds.message} tone={beds.messageTone} onClose={beds.clearMessage} /> : null}
    </main>
  );
}
