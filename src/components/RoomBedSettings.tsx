import { FormEvent, PointerEvent as ReactPointerEvent, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Bed, Room } from "../types";
import { ROOM_TAG_PALETTE } from "../roomTagPalette";
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

  const dragRef = useRef<{
    roomId: string;
    beds: Bed[];
    dragIndex: number;
    slot: number;
    containerTop: number;
    startY: number;
    pointerId: number;
  } | null>(null);
  const [dragView, setDragView] = useState<{
    roomId: string;
    dragIndex: number;
    slot: number;
    offsetY: number;
    overIndex: number;
  } | null>(null);

  const roomDragRef = useRef<{
    dragIndex: number;
    slot: number;
    originX: number;
    startX: number;
    pointerId: number;
  } | null>(null);
  const [roomDragView, setRoomDragView] = useState<{
    dragIndex: number;
    slot: number;
    offsetX: number;
    overIndex: number;
  } | null>(null);

  const showMessage = (nextMessage: string, tone: ToastTone) => {
    setMessage(nextMessage);
    setMessageTone(tone);
  };

  const hasActive = (bedList: Bed[]) => bedList.some((bed) => bed.status !== "empty");
  const confirmActive = () => window.confirm("현재 시술중/시술대기 데이터가 있습니다. 수정하시겠습니까?");

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
    if (hasActive(beds.filter((bed) => bed.room_id === room.id)) && !confirmActive()) return;
    await run(`rename-room-${room.id}`, "rename_room", { p_room_id: room.id, p_name: name }, "룸 이름을 변경했습니다.");
  };

  const moveRoom = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || toIndex >= rooms.length) return;
    if (hasActive(beds.filter((bed) => bed.room_id === rooms[fromIndex].id)) && !confirmActive()) return;
    const nextRooms = [...rooms];
    const [moved] = nextRooms.splice(fromIndex, 1);
    nextRooms.splice(toIndex, 0, moved);
    await run("reorder-rooms", "reorder_rooms", { p_room_ids: nextRooms.map((room) => room.id) }, "룸 순서를 변경했습니다.");
  };

  const onRoomPointerDown = (event: ReactPointerEvent<HTMLSpanElement>, roomIndex: number) => {
    if (pending !== null) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const grip = event.currentTarget;
    const columnEl = grip.closest(".rbs-column") as HTMLElement | null;
    const boardEl = grip.closest(".rbs-board") as HTMLElement | null;
    if (!columnEl || !boardEl) return;

    const columnRect = columnEl.getBoundingClientRect();
    const styles = window.getComputedStyle(boardEl);
    const gap = parseFloat(styles.columnGap || styles.gap || "16") || 16;
    const slot = columnRect.width + gap;

    grip.setPointerCapture(event.pointerId);
    roomDragRef.current = {
      dragIndex: roomIndex,
      slot,
      originX: columnRect.left - roomIndex * slot,
      startX: event.clientX,
      pointerId: event.pointerId,
    };
    setRoomDragView({ dragIndex: roomIndex, slot, offsetX: 0, overIndex: roomIndex });
    event.preventDefault();
  };

  const roomOverIndex = (originX: number, slot: number, clientX: number) =>
    Math.max(0, Math.min(rooms.length - 1, Math.floor((clientX - originX) / slot)));

  const onRoomPointerMove = (event: ReactPointerEvent<HTMLSpanElement>) => {
    const state = roomDragRef.current;
    if (!state) return;
    const offsetX = event.clientX - state.startX;
    const overIndex = roomOverIndex(state.originX, state.slot, event.clientX);
    setRoomDragView((prev) => (prev ? { ...prev, offsetX, overIndex } : prev));
  };

  const finishRoomDrag = (event: ReactPointerEvent<HTMLSpanElement>, commit: boolean) => {
    const state = roomDragRef.current;
    roomDragRef.current = null;
    setRoomDragView(null);
    if (!state) return;
    try {
      event.currentTarget.releasePointerCapture(state.pointerId);
    } catch {
      // capture already released
    }
    if (!commit) return;
    const overIndex = roomOverIndex(state.originX, state.slot, event.clientX);
    if (overIndex !== state.dragIndex) {
      void moveRoom(state.dragIndex, overIndex);
    }
  };

  const setRoomColor = async (room: Room, color: string | null) => {
    if (room.name_tag_color === color) return;
    await run(`set-room-color-${room.id}`, "set_room_color", { p_room_id: room.id, p_color: color }, "룸 색상을 변경했습니다.");
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
    if (bed.status !== "empty" && !confirmActive()) return;
    await run(`rename-bed-${bed.id}`, "rename_bed", { p_bed_id: bed.id, p_label: label }, "베드 라벨을 변경했습니다.");
  };

  const moveBed = async (room: Room, roomBeds: Bed[], fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || toIndex >= roomBeds.length) return;
    if (roomBeds[fromIndex].status !== "empty" && !confirmActive()) return;
    const nextBeds = [...roomBeds];
    const [moved] = nextBeds.splice(fromIndex, 1);
    nextBeds.splice(toIndex, 0, moved);
    await run(`reorder-beds-${room.id}`, "reorder_beds", { p_room_id: room.id, p_bed_ids: nextBeds.map((bed) => bed.id) }, "베드 순서를 변경했습니다.");
  };

  const onBedPointerDown = (event: ReactPointerEvent<HTMLSpanElement>, room: Room, roomBeds: Bed[], bed: Bed) => {
    if (pending !== null) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const handle = event.currentTarget;
    const cardEl = handle.closest(".rbs-card") as HTMLElement | null;
    const container = handle.closest(".rbs-column__cards") as HTMLElement | null;
    if (!cardEl || !container) return;
    const dragIndex = roomBeds.findIndex((item) => item.id === bed.id);
    if (dragIndex === -1) return;

    const cardRect = cardEl.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const styles = window.getComputedStyle(container);
    const gap = parseFloat(styles.rowGap || styles.gap || "8") || 8;
    const slot = cardRect.height + gap;

    handle.setPointerCapture(event.pointerId);
    dragRef.current = {
      roomId: room.id,
      beds: roomBeds,
      dragIndex,
      slot,
      containerTop: containerRect.top,
      startY: event.clientY,
      pointerId: event.pointerId,
    };
    setDragView({ roomId: room.id, dragIndex, slot, offsetY: 0, overIndex: dragIndex });
    event.preventDefault();
  };

  const computeOverIndex = (clientY: number) => {
    const state = dragRef.current;
    if (!state) return 0;
    const raw = Math.floor((clientY - state.containerTop) / state.slot);
    return Math.max(0, Math.min(state.beds.length - 1, raw));
  };

  const onBedPointerMove = (event: ReactPointerEvent<HTMLSpanElement>) => {
    const state = dragRef.current;
    if (!state) return;
    const offsetY = event.clientY - state.startY;
    const overIndex = computeOverIndex(event.clientY);
    setDragView((prev) => (prev ? { ...prev, offsetY, overIndex } : prev));
  };

  const finishBedDrag = (event: ReactPointerEvent<HTMLSpanElement>, room: Room, commit: boolean) => {
    const state = dragRef.current;
    dragRef.current = null;
    setDragView(null);
    if (!state) return;
    try {
      event.currentTarget.releasePointerCapture(state.pointerId);
    } catch {
      // capture already released
    }
    if (!commit) return;
    const overIndex = computeOverIndexFrom(state, event.clientY);
    if (overIndex !== state.dragIndex) {
      void moveBed(room, state.beds, state.dragIndex, overIndex);
    }
  };

  const computeOverIndexFrom = (
    state: { containerTop: number; slot: number; beds: Bed[] },
    clientY: number,
  ) => {
    const raw = Math.floor((clientY - state.containerTop) / state.slot);
    return Math.max(0, Math.min(state.beds.length - 1, raw));
  };

  const deleteBed = async (bed: Bed) => {
    if (bed.status !== "empty") {
      showMessage("현재 시술중/시술대기 데이터가 있어 삭제할 수 없습니다.", "error");
      return;
    }
    if (!window.confirm(`'${bed.label}' 베드를 삭제할까요?`)) return;
    await run(`delete-bed-${bed.id}`, "delete_bed", { p_bed_id: bed.id }, "베드를 삭제했습니다.");
  };

  return (
    <section className="room-bed-settings" role="tabpanel" aria-label="룸/베드 설정">
      <div className="room-bed-settings__heading">
        <div>
          <h1>룸/베드 설정</h1>
          <p>룸은 열, 베드는 카드로 표시됩니다. 열 헤더의 핸들(⠿)로 룸을, 카드의 핸들(⠿)로 베드를 끌어 순서를 바꿀 수 있습니다.</p>
        </div>
        <button className="admin-card__button" type="button" onClick={() => void refresh()} disabled={loading || pending !== null}>새로고침</button>
      </div>

      <div className="rbs-board">
        {rooms.map((room, roomIndex) => {
          const roomBeds = beds.filter((bed) => bed.room_id === room.id);
          const roomDragging = roomDragView !== null && roomIndex === roomDragView.dragIndex;
          let roomTransform: string | undefined;
          if (roomDragView !== null) {
            const { dragIndex, overIndex, slot, offsetX } = roomDragView;
            if (roomDragging) {
              roomTransform = `translateX(${offsetX}px) scale(1.03)`;
            } else if (dragIndex < overIndex && roomIndex > dragIndex && roomIndex <= overIndex) {
              roomTransform = `translateX(${-slot}px)`;
            } else if (dragIndex > overIndex && roomIndex >= overIndex && roomIndex < dragIndex) {
              roomTransform = `translateX(${slot}px)`;
            }
          }
          return (
            <section
              className={`rbs-column${roomDragging ? " rbs-column--dragging" : ""}`}
              key={room.id}
              style={roomTransform ? { transform: roomTransform, transition: roomDragging ? "none" : undefined } : undefined}
            >
              <header className="rbs-column__header">
                <span
                  className="rbs-column__grip"
                  onPointerDown={(event) => onRoomPointerDown(event, roomIndex)}
                  onPointerMove={onRoomPointerMove}
                  onPointerUp={(event) => finishRoomDrag(event, true)}
                  onPointerCancel={(event) => finishRoomDrag(event, false)}
                  role="button"
                  tabIndex={0}
                  aria-label="드래그하여 룸 순서 변경"
                  title="드래그하여 룸 순서 변경"
                >
                  ⠿
                </span>
                <form className="rbs-column__title" onSubmit={(event) => void renameRoom(event, room)}>
                  <input name="name" defaultValue={room.name} aria-label="룸 이름" required />
                  <button className="rbs-icon-btn" type="submit" disabled={pending !== null} title="룸 이름 저장">저장</button>
                </form>
                <div className="rbs-column__actions">
                  <button className="rbs-icon-btn rbs-icon-btn--danger" type="button" onClick={() => void deleteRoom(room)} disabled={pending !== null} title="룸 삭제" aria-label="룸 삭제">×</button>
                </div>
              </header>

              <div className="rbs-column__colors" role="group" aria-label="이름칸 색상 선택">
                <button
                  type="button"
                  className={`rbs-swatch rbs-swatch--reset${room.name_tag_color === null ? " rbs-swatch--active" : ""}`}
                  onClick={() => void setRoomColor(room, null)}
                  disabled={pending !== null}
                  title="기본색"
                  aria-label="기본색"
                  aria-pressed={room.name_tag_color === null}
                >
                  ⦸
                </button>
                {ROOM_TAG_PALETTE.map((swatch) => {
                  const active = (room.name_tag_color ?? "").toLowerCase() === swatch.bg;
                  return (
                    <button
                      key={swatch.bg}
                      type="button"
                      className={`rbs-swatch${active ? " rbs-swatch--active" : ""}`}
                      style={{ background: swatch.bg, color: swatch.fg }}
                      onClick={() => void setRoomColor(room, swatch.bg)}
                      disabled={pending !== null}
                      title={swatch.label}
                      aria-label={swatch.label}
                      aria-pressed={active}
                    >
                      가
                    </button>
                  );
                })}
              </div>

              <div className="rbs-column__cards">
                {roomBeds.length === 0 ? (
                  <p className="rbs-column__empty">베드 없음</p>
                ) : (
                  roomBeds.map((bed, bedIndex) => {
                    const inDragColumn = dragView !== null && dragView.roomId === room.id;
                    const isDragging = inDragColumn && bedIndex === dragView!.dragIndex;
                    let transform: string | undefined;
                    if (inDragColumn) {
                      const { dragIndex, overIndex, slot, offsetY } = dragView!;
                      if (isDragging) {
                        transform = `translateY(${offsetY}px) scale(1.04)`;
                      } else if (dragIndex < overIndex && bedIndex > dragIndex && bedIndex <= overIndex) {
                        transform = `translateY(${-slot}px)`;
                      } else if (dragIndex > overIndex && bedIndex >= overIndex && bedIndex < dragIndex) {
                        transform = `translateY(${slot}px)`;
                      }
                    }
                    return (
                      <div
                        className={`rbs-card${isDragging ? " rbs-card--dragging" : ""}`}
                        key={bed.id}
                        style={transform ? { transform, transition: isDragging ? "none" : undefined } : undefined}
                      >
                        <span
                          className="rbs-card__handle"
                          onPointerDown={(event) => onBedPointerDown(event, room, roomBeds, bed)}
                          onPointerMove={onBedPointerMove}
                          onPointerUp={(event) => finishBedDrag(event, room, true)}
                          onPointerCancel={(event) => finishBedDrag(event, room, false)}
                          role="button"
                          tabIndex={0}
                          aria-label="드래그하여 순서 변경"
                          title="드래그하여 순서 변경"
                        >
                          ⠿
                        </span>
                        <form className="rbs-card__label" onSubmit={(event) => void renameBed(event, bed)}>
                          <input name="label" defaultValue={bed.label} aria-label="베드 라벨" required />
                          <button className="rbs-icon-btn" type="submit" disabled={pending !== null} title="라벨 저장">저장</button>
                        </form>
                        <button className="rbs-icon-btn rbs-icon-btn--danger" type="button" onClick={() => void deleteBed(bed)} disabled={pending !== null} title="베드 삭제" aria-label="베드 삭제">×</button>
                      </div>
                    );
                  })
                )}
              </div>

              <form className="rbs-column__add" onSubmit={(event) => void createBed(event, room)}>
                <input
                  value={bedLabels[room.id] ?? ""}
                  onChange={(event) => setBedLabels((current) => ({ ...current, [room.id]: event.target.value }))}
                  placeholder="새 베드 라벨"
                  aria-label="새 베드 라벨"
                  required
                />
                <button className="rbs-add-btn" type="submit" disabled={pending !== null}>+ 베드 추가</button>
              </form>
            </section>
          );
        })}

        <section className="rbs-column rbs-column--new">
          <form className="rbs-column__add" onSubmit={(event) => void createRoom(event)}>
            <input value={roomName} onChange={(event) => setRoomName(event.target.value)} placeholder="새 룸 이름" aria-label="새 룸 이름" required />
            <button className="rbs-add-btn rbs-add-btn--primary" type="submit" disabled={pending === "create-room"}>
              {pending === "create-room" ? "추가 중…" : "+ 룸 추가"}
            </button>
          </form>
        </section>
      </div>

      {message ? <Toast message={message} tone={messageTone} onClose={() => setMessage(null)} /> : null}
    </section>
  );
}
