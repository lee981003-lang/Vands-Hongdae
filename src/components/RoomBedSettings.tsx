import { FormEvent, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Bed, Room } from "../types";
import { Toast } from "./Toast";

type RoomBedSettingsProps = {
  rooms: Room[];
  beds: Bed[];
  loading: boolean;
  refresh: () => Promise<void>;
};

type ToastTone = "success" | "error";

export function RoomBedSettings({ rooms, beds, loading, refresh }: RoomBedSettingsProps) {
  const [pending, setPending] = useState<string | null>(null);
  const [roomName, setRoomName] = useState("");
  const [bedLabels, setBedLabels] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<ToastTone>("success");

  const showMessage = (nextMessage: string, tone: ToastTone) => {
    setMessage(nextMessage);
    setMessageTone(tone);
  };

  const run = async (action: string, rpc: string, args: Record<string, unknown>, successMessage: string) => {
    if (!supabase) {
      showMessage("Supabase 연결 설정을 확인해 주세요.", "error");
      return false;
    }

    setPending(action);
    try {
      const { error } = await supabase.rpc(rpc, args);
      if (error) {
        showMessage(error.message || "저장 중 오류가 발생했습니다.", "error");
        return false;
      }

      await refresh();
      showMessage(successMessage, "success");
      return true;
    } finally {
      setPending(null);
    }
  };

  const createRoom = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (await run("create-room", "create_room", { p_name: roomName }, "룸을 추가했습니다.")) setRoomName("");
  };

  const renameRoom = async (event: FormEvent<HTMLFormElement>, room: Room) => {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name") ?? "");
    await run(`rename-room-${room.id}`, "rename_room", { p_room_id: room.id, p_name: name }, "룸 이름을 변경했습니다.");
  };

  const moveRoom = async (roomIndex: number, direction: -1 | 1) => {
    const targetIndex = roomIndex + direction;
    if (targetIndex < 0 || targetIndex >= rooms.length) return;
    const nextRooms = [...rooms];
    [nextRooms[roomIndex], nextRooms[targetIndex]] = [nextRooms[targetIndex], nextRooms[roomIndex]];
    await run("reorder-rooms", "reorder_rooms", { p_room_ids: nextRooms.map((room) => room.id) }, "룸 순서를 변경했습니다.");
  };

  const deleteRoom = async (room: Room) => {
    if (!window.confirm(`'${room.name}' 룸과 비어 있는 베드를 삭제할까요?`)) return;
    await run(`delete-room-${room.id}`, "delete_room", { p_room_id: room.id }, "룸을 삭제했습니다.");
  };

  const createBed = async (event: FormEvent<HTMLFormElement>, room: Room) => {
    event.preventDefault();
    const label = bedLabels[room.id] ?? "";
    if (await run(`create-bed-${room.id}`, "create_bed", { p_room_id: room.id, p_label: label }, "베드를 추가했습니다.")) {
      setBedLabels((current) => ({ ...current, [room.id]: "" }));
    }
  };

  const renameBed = async (event: FormEvent<HTMLFormElement>, bed: Bed) => {
    event.preventDefault();
    const label = String(new FormData(event.currentTarget).get("label") ?? "");
    await run(`rename-bed-${bed.id}`, "rename_bed", { p_bed_id: bed.id, p_label: label }, "베드 라벨을 변경했습니다.");
  };

  const moveBed = async (room: Room, roomBeds: Bed[], bedIndex: number, direction: -1 | 1) => {
    const targetIndex = bedIndex + direction;
    if (targetIndex < 0 || targetIndex >= roomBeds.length) return;
    const nextBeds = [...roomBeds];
    [nextBeds[bedIndex], nextBeds[targetIndex]] = [nextBeds[targetIndex], nextBeds[bedIndex]];
    await run(`reorder-beds-${room.id}`, "reorder_beds", { p_room_id: room.id, p_bed_ids: nextBeds.map((bed) => bed.id) }, "베드 순서를 변경했습니다.");
  };

  const deleteBed = async (bed: Bed) => {
    if (!window.confirm(`'${bed.label}' 베드를 삭제할까요?`)) return;
    await run(`delete-bed-${bed.id}`, "delete_bed", { p_bed_id: bed.id }, "베드를 삭제했습니다.");
  };

  return (
    <section className="room-bed-settings" role="tabpanel" aria-label="룸/베드 설정">
      <div className="room-bed-settings__heading">
        <div>
          <h1>룸/베드 설정</h1>
          <p>룸과 베드를 추가, 이름 변경, 순서 변경, 삭제할 수 있습니다.</p>
        </div>
        <button className="admin-card__button" type="button" onClick={() => void refresh()} disabled={loading || pending !== null}>새로고침</button>
      </div>

      <form className="admin-card room-bed-settings__create-room" onSubmit={(event) => void createRoom(event)}>
        <label>
          새 룸 이름
          <input value={roomName} onChange={(event) => setRoomName(event.target.value)} required />
        </label>
        <button className="admin-card__button admin-card__button--primary" type="submit" disabled={pending === "create-room"}>
          {pending === "create-room" ? "추가 중…" : "룸 추가"}
        </button>
      </form>

      {rooms.length === 0 ? <p className="room-bed-settings__empty">등록된 룸이 없습니다.</p> : (
        <div className="room-bed-settings__list">
          {rooms.map((room, roomIndex) => {
            const roomBeds = beds.filter((bed) => bed.room_id === room.id);
            return (
              <section className="admin-card room-bed-settings__room" key={room.id}>
                <div className="room-bed-settings__room-header">
                  <form className="room-bed-settings__rename" onSubmit={(event) => void renameRoom(event, room)}>
                    <label>
                      룸 이름
                      <input name="name" defaultValue={room.name} required />
                    </label>
                    <button className="admin-card__button" type="submit" disabled={pending !== null}>이름 변경</button>
                  </form>
                  <div className="room-bed-settings__actions">
                    <button className="admin-card__button" type="button" onClick={() => void moveRoom(roomIndex, -1)} disabled={roomIndex === 0 || pending !== null}>위로</button>
                    <button className="admin-card__button" type="button" onClick={() => void moveRoom(roomIndex, 1)} disabled={roomIndex === rooms.length - 1 || pending !== null}>아래로</button>
                    <button className="admin-card__button admin-card__button--danger" type="button" onClick={() => void deleteRoom(room)} disabled={pending !== null}>룸 삭제</button>
                  </div>
                </div>

                <form className="room-bed-settings__create-bed" onSubmit={(event) => void createBed(event, room)}>
                  <label>
                    새 베드 라벨
                    <input value={bedLabels[room.id] ?? ""} onChange={(event) => setBedLabels((current) => ({ ...current, [room.id]: event.target.value }))} required />
                  </label>
                  <button className="admin-card__button admin-card__button--primary" type="submit" disabled={pending !== null}>베드 추가</button>
                </form>

                {roomBeds.length === 0 ? <p className="room-bed-settings__empty">등록된 베드가 없습니다.</p> : (
                  <div className="room-bed-settings__beds">
                    {roomBeds.map((bed, bedIndex) => (
                      <div className="room-bed-settings__bed" key={bed.id}>
                        <form className="room-bed-settings__rename" onSubmit={(event) => void renameBed(event, bed)}>
                          <label>
                            베드 라벨
                            <input name="label" defaultValue={bed.label} required />
                          </label>
                          <button className="admin-card__button" type="submit" disabled={pending !== null}>이름 변경</button>
                        </form>
                        <div className="room-bed-settings__actions">
                          <button className="admin-card__button" type="button" onClick={() => void moveBed(room, roomBeds, bedIndex, -1)} disabled={bedIndex === 0 || pending !== null}>위로</button>
                          <button className="admin-card__button" type="button" onClick={() => void moveBed(room, roomBeds, bedIndex, 1)} disabled={bedIndex === roomBeds.length - 1 || pending !== null}>아래로</button>
                          <button className="admin-card__button admin-card__button--danger" type="button" onClick={() => void deleteBed(bed)} disabled={pending !== null}>베드 삭제</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {message ? <Toast message={message} tone={messageTone} onClose={() => setMessage(null)} /> : null}
    </section>
  );
}
