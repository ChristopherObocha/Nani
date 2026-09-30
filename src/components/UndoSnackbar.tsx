import { useEffect } from "react";

export function UndoSnackbar({
  message,
  onUndo,
  onDismiss,
}: {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, 3000);
    return () => window.clearTimeout(timer);
  }, [onDismiss]);
  return (
    <div className="undo-snackbar">
      <div className="snackbar-body">
        <span role="status">{message}</span>
        <button type="button" onClick={onUndo}>
          Undo <span aria-hidden="true">↶</span>
        </button>
      </div>
      <span className="undo-progress" aria-hidden="true" />
    </div>
  );
}
