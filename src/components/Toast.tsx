interface ToastProps {
  message: string;
  tone: "info" | "success" | "error";
  onClose: () => void;
}

export function Toast({ message, tone, onClose }: ToastProps) {
  return (
    <div className={`toast toast--${tone}`} role="status">
      <span>{message}</span>
      <button type="button" onClick={onClose} aria-label="알림 닫기">
        닫기
      </button>
    </div>
  );
}
