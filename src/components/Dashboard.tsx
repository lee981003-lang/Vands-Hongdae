import { Circle, LogOut, UserCog, Users, Wifi, WifiOff } from "lucide-react";
import { RoomSection } from "./RoomSection";
import { SidePanel } from "./SidePanel";
import { elapsedMinutes, remainingMinutes } from "../lib/time";
import type { Bed, BedDetailsInput, BedFlagsInput, BedMemoInput, BedStatus, ConnectionState, Room, RoomWithBeds } from "../types";

interface DashboardProps {
  rooms: Room[];
  beds: Bed[];
  connection: ConnectionState;
  loading: boolean;
  now: number;
  onSetStatus: (bed: Bed, status: BedStatus) => Promise<void>;
  onSetDetails: (bed: Bed, input: BedDetailsInput) => Promise<void>;
  onSetFlags: (bed: Bed, input: BedFlagsInput) => Promise<void>;
  onSetMemo: (bed: Bed, input: BedMemoInput) => Promise<void>;
}

function buildRooms(rooms: Room[], beds: Bed[]): RoomWithBeds[] {
  return rooms.map((room) => ({
    ...room,
    beds: beds
      .filter((bed) => bed.room_id === room.id)
      .sort((a, b) => a.sort_order - b.sort_order),
  }));
}

function connectionLabel(connection: ConnectionState) {
  if (connection === "live") return "Realtime 연결";
  if (connection === "connecting") return "연결 중";
  if (connection === "local") return "로컬 목업";
  return "연결 오류";
}

function isSoon(bed: Bed, now: number) {
  const remaining = remainingMinutes(elapsedMinutes(bed.status_started_at, now), bed.status);
  return remaining !== null && remaining <= 15 && bed.status !== "empty";
}

export function Dashboard({
  rooms,
  beds,
  connection,
  loading,
  now,
  onSetStatus,
  onSetDetails,
  onSetFlags,
  onSetMemo,
}: DashboardProps) {
  const groupedRooms = buildRooms(rooms, beds);
  const isConnected = connection === "live";
  const roomNames = new Map(rooms.map((room) => [room.id, room.name]));
  const soonBeds = beds
    .filter((bed) => isSoon(bed, now))
    .sort((a, b) => {
      const aRemaining = remainingMinutes(elapsedMinutes(a.status_started_at, now), a.status) ?? 999;
      const bRemaining = remainingMinutes(elapsedMinutes(b.status_started_at, now), b.status) ?? 999;
      return aRemaining - bRemaining;
    });
  const waitingBeds = beds
    .filter((bed) => bed.status === "waiting" || bed.status === "reanesthesia_waiting")
    .sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());

  return (
    <div className="dashboard">
      <section className="status-strip" aria-label="연결 상태">
        <span className={`connection-pill connection-pill--${connection}`}>
          {isConnected ? <Wifi size={16} aria-hidden="true" /> : <WifiOff size={16} aria-hidden="true" />}
          {connectionLabel(connection)}
        </span>
        <span>{loading ? "데이터 동기화 중" : `총 ${beds.length}개 베드`}</span>
      </section>

      <div className="workspace-grid">
        <section className="floor-plan" aria-label="시술실 배치">
          {groupedRooms.map((room) => (
            <RoomSection
              key={room.id}
              room={room}
              now={now}
              onSetStatus={onSetStatus}
              onSetDetails={onSetDetails}
              onSetFlags={onSetFlags}
              onSetMemo={onSetMemo}
            />
          ))}
        </section>
        <aside className="side-rail" aria-label="운영 목록">
          <SidePanel title="곧 종료 예정" beds={soonBeds} roomNames={roomNames} now={now} tone="orange" />
          <SidePanel title="대기 목록" beds={waitingBeds} roomNames={roomNames} now={now} tone="blue" />
        </aside>
      </div>

      <div className="mode-bar" aria-label="화면 모드">
        <div className="mode-group">
          <span>모드</span>
          <button className="segmented-button segmented-button--active" type="button">
            <Users size={16} aria-hidden="true" />
            공용 화면
          </button>
          <button className="segmented-button" type="button">
            <UserCog size={16} aria-hidden="true" />
            관리자 화면
          </button>
        </div>
        <div className="legend">
          <span><Circle size={10} fill="currentColor" /> 시술 중</span>
          <span><Circle size={10} fill="currentColor" /> 대기</span>
          <span><Circle size={10} fill="currentColor" /> 곧 종료</span>
          <span><Circle size={10} fill="currentColor" /> 빈 룸</span>
        </div>
        <button className="icon-text-button logout-button" type="button">
          <LogOut size={16} aria-hidden="true" />
          로그아웃
        </button>
      </div>
    </div>
  );
}
