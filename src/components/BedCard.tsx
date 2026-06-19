import type { CSSProperties, FormEvent, KeyboardEvent } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { StickyNote } from "lucide-react";
import { BedFlags } from "./BedFlags";
import {
  elapsedMinutes,
  formatStatusTimeline,
  nextBedStatus,
  progressPercent,
  statusLabel,
  warningLevel,
} from "../lib/time";
import type { Bed, BedFlagsInput, BedMemoInput, BedStatus } from "../types";

interface BedCardProps {
  bed: Bed;
  now: number;
  onSetStatus: (bed: Bed, status: BedStatus) => Promise<void>;
  onSetFlags: (bed: Bed, input: BedFlagsInput) => Promise<void>;
  onSetFollowUp: (bed: Bed, isFollowUp: boolean) => Promise<void>;
  onSetMemo: (bed: Bed, input: BedMemoInput) => Promise<void>;
}

export function BedCard({ bed, now, onSetStatus, onSetFlags, onSetFollowUp, onSetMemo }: BedCardProps) {
  const memoTitleId = useId();
  const memoInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [isMemoOpen, setIsMemoOpen] = useState(false);
  const [isEditingMemo, setIsEditingMemo] = useState(false);
  const [draftMemo, setDraftMemo] = useState("");
  const [confirmDeleteMemo, setConfirmDeleteMemo] = useState(false);
  const minutes = elapsedMinutes(bed.status_started_at, now);
  const level = bed.status === "empty" ? 0 : warningLevel(minutes);
  const progressStyle = { "--progress": `${progressPercent(minutes, bed.status)}%` } as CSSProperties;
  const isFollowUpHighlighted = bed.status === "waiting" && bed.is_follow_up;
  const timelineRows = formatStatusTimeline(bed, now);
  const className = [
    "bed-card",
    `bed-card--${bed.status}`,
    `bed-card--warning-${level}`,
    isFollowUpHighlighted ? "bed-card--followup" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const rotateStatus = () => {
    void onSetStatus(bed, nextBedStatus(bed.status));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    rotateStatus();
  };

  useEffect(() => {
    if (!isMemoOpen || !isEditingMemo) return;
    memoInputRef.current?.focus();
  }, [isEditingMemo, isMemoOpen]);

  useEffect(() => {
    if (!isMemoOpen) return undefined;

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") closeMemoDialog();
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isMemoOpen]);

  const openMemoDialog = () => {
    setDraftMemo(bed.memo ?? "");
    setIsEditingMemo(!bed.memo);
    setConfirmDeleteMemo(false);
    setIsMemoOpen(true);
  };

  const closeMemoDialog = () => {
    setIsMemoOpen(false);
    setConfirmDeleteMemo(false);
    setIsEditingMemo(false);
  };

  const saveMemo = async () => {
    const memo = draftMemo.trim();
    if (!memo) return;
    await onSetMemo(bed, { memo });
    closeMemoDialog();
  };

  const deleteMemo = async () => {
    await onSetMemo(bed, { memo: "" });
    closeMemoDialog();
  };

  const handleMemoSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void saveMemo();
  };

  const toggleFollowUp = () => {
    void onSetFollowUp(bed, !bed.is_follow_up);
  };

  const handleControlKeyDown = (event: KeyboardEvent<HTMLButtonElement>, action: () => void) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    action();
  };

  return (
    <article
      className={className}
      role="button"
      tabIndex={0}
      aria-label={`${bed.label} ${statusLabel(bed.status)}`}
      onClick={rotateStatus}
      onKeyDown={handleKeyDown}
    >
      <div className="bed-card__header">
        <div>
          <span className="bed-number">{bed.label}</span>
          <strong>{statusLabel(bed.status)}</strong>
        </div>
      </div>

      <div className="bed-detail">
        {timelineRows.length > 0 ? timelineRows.map((row) => <small key={row}>{row}</small>) : <small> </small>}
      </div>

      <div className="progress-track" style={progressStyle} aria-hidden="true" />

      {bed.memo ? <p className="memo-preview">{bed.memo}</p> : <p className="memo-preview memo-preview--empty">{statusLabel(bed.status)}</p>}

      <div className="bed-card__controls" onClick={(event) => event.stopPropagation()}>
        <BedFlags bed={bed} onSetFlags={onSetFlags} />
        <button
          className={`flag-chip flag-chip--followup${bed.is_follow_up ? " flag-chip--active" : ""}`}
          type="button"
          onClick={toggleFollowUp}
          onKeyDown={(event) => handleControlKeyDown(event, toggleFollowUp)}
          aria-pressed={bed.is_follow_up}
          title="F/U"
        >
          F/U
        </button>
        <button
          className={`flag-chip flag-chip--memo${bed.memo ? " flag-chip--active" : ""}`}
          type="button"
          onClick={openMemoDialog}
          onKeyDown={(event) => handleControlKeyDown(event, openMemoDialog)}
          title="메모"
        >
          <StickyNote size={14} aria-hidden="true" />
          <span>메모</span>
        </button>
      </div>

      {isMemoOpen
        ? createPortal(
            <div
              className="memo-dialog-backdrop"
              role="presentation"
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
          <section
            className="memo-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={memoTitleId}
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div className="memo-dialog__header">
              <div>
                <span>{bed.label}</span>
                <h3 id={memoTitleId}>메모</h3>
              </div>
              <button
                className="memo-dialog__close"
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  closeMemoDialog();
                }}
                aria-label="메모 닫기"
              >
                ×
              </button>
            </div>

            {isEditingMemo ? (
              <form className="memo-dialog__body" onSubmit={handleMemoSubmit}>
                <textarea
                  ref={memoInputRef}
                  value={draftMemo}
                  onChange={(event) => {
                    setDraftMemo(event.target.value);
                    setConfirmDeleteMemo(false);
                  }}
                  rows={4}
                  maxLength={120}
                  placeholder="메모를 입력하세요"
                />
                <div className="memo-dialog__meta">{draftMemo.trim().length}/120</div>
                {confirmDeleteMemo ? (
                  <div className="memo-dialog__warning" role="alert">
                    <strong>메모를 삭제할까요?</strong>
                    <span>삭제 후에는 현재 메모 내용이 비워집니다.</span>
                  </div>
                ) : null}
                <div className="memo-dialog__actions">
                  {bed.memo ? (
                    <button
                      className="memo-dialog__button memo-dialog__button--danger"
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setConfirmDeleteMemo(true);
                      }}
                    >
                      메모 삭제
                    </button>
                  ) : null}
                  <button
                    className="memo-dialog__button"
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      closeMemoDialog();
                    }}
                  >
                    취소
                  </button>
                  <button
                    className="memo-dialog__button memo-dialog__button--primary"
                    type="button"
                    disabled={!draftMemo.trim()}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      void saveMemo();
                    }}
                  >
                    저장
                  </button>
                </div>
                {confirmDeleteMemo ? (
                  <div className="memo-dialog__actions memo-dialog__actions--confirm">
                    <button
                      className="memo-dialog__button"
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setConfirmDeleteMemo(false);
                      }}
                    >
                      유지
                    </button>
                    <button
                      className="memo-dialog__button memo-dialog__button--danger-fill"
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void deleteMemo();
                      }}
                    >
                      삭제
                    </button>
                  </div>
                ) : null}
              </form>
            ) : (
              <div className="memo-dialog__body">
                <p className="memo-dialog__preview">{bed.memo}</p>
                {confirmDeleteMemo ? (
                  <div className="memo-dialog__warning" role="alert">
                    <strong>메모를 삭제할까요?</strong>
                    <span>삭제 후에는 현재 메모 내용이 비워집니다.</span>
                  </div>
                ) : null}
                <div className="memo-dialog__actions">
                  <button
                    className="memo-dialog__button memo-dialog__button--danger"
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setConfirmDeleteMemo(true);
                    }}
                  >
                    메모 삭제
                  </button>
                  <button
                    className="memo-dialog__button"
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setIsEditingMemo(true);
                    }}
                  >
                    수정
                  </button>
                  <button
                    className="memo-dialog__button memo-dialog__button--primary"
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      closeMemoDialog();
                    }}
                  >
                    닫기
                  </button>
                </div>
                {confirmDeleteMemo ? (
                  <div className="memo-dialog__actions memo-dialog__actions--confirm">
                    <button
                      className="memo-dialog__button"
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setConfirmDeleteMemo(false);
                      }}
                    >
                      유지
                    </button>
                    <button
                      className="memo-dialog__button memo-dialog__button--danger-fill"
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void deleteMemo();
                      }}
                    >
                      삭제
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </section>
        </div>,
            document.body,
          )
        : null}
    </article>
  );
}
