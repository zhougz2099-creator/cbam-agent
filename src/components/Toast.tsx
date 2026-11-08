import { useEffect } from 'react';
import type { ToastState } from '../types';

interface ToastProps {
  toast: ToastState;
  onDismiss: () => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, toast.duration);
    return () => window.clearTimeout(timer);
    // A new toast id restarts the countdown.
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div
      key={toast.id}
      className={`toast toast--${toast.tone}`}
      role="status"
      aria-live="polite"
    >
      <span className="toast__message">{toast.message}</span>
      {toast.action ? (
        <button
          type="button"
          className="toast__action"
          onClick={() => {
            toast.action?.run();
            onDismiss();
          }}
        >
          {toast.action.label}
        </button>
      ) : null}
      <span
        className="toast__progress"
        style={{ animationDuration: `${toast.duration}ms` }}
        aria-hidden="true"
      />
    </div>
  );
}
