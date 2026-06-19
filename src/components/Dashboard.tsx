import { Wifi, WifiOff } from "lucide-react";
import { RoomSection } from "./RoomSection";
import { SidePanel } from "./SidePanel";
import { elapsedMinutes, warningLevel } from "../lib/time";
import type { Bed, BedFlagsInput, BedMemoInput, BedStatus, ConnectionState, Room, RoomWithBeds } from "../types";

interface DashboardProps {
  rooms: Room[];
  beds: Bed[];
  connection: ConnectionState;
  loading: boolean;
  now: number;
  onSetStatus: (bed: Bed, status: BedStatus) => Promise<void>;
  onSetFlags: (bed: Bed, input: BedFlagsInput) => Promise<void>;
  onSetFollowUp: (bed: Bed, isFollowUp: boolean) => Promise<void>;
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

export function Dashboard({
  rooms,
  beds,
  connection,
  loading,
  now,
  onSetStatus,
  onSetFlags,
  onSetFollowUp,
  onSetMemo,
}: DashboardProps) {
  const groupedRooms = buildRooms(rooms, beds);
  const isConnected = connection === "live";
  const roomNames = new Map(rooms.map((room) => [room.id, room.name]));
  const elapsedAlertBeds = beds
    .filter((bed) => bed.status !== "empty" && warningLevel(elapsedMinutes(bed.status_started_at, now)) > 0)
    .sort((a, b) => {
      const aElapsed = elapsedMinutes(a.status_started_at, now) ?? 0;
      const bElapsed = elapsedMinutes(b.status_started_at, now) ?? 0;
      return bElapsed - aElapsed;
    });

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
              onSetFlags={onSetFlags}
              onSetFollowUp={onSetFollowUp}
              onSetMemo={onSetMemo}
            />
          ))}
        </section>
        <aside className="side-rail" aria-label="운영 알림">
          <SidePanel beds={elapsedAlertBeds} roomNames={roomNames} now={now} />
        </aside>
      </div>
    </div>
  );
}
