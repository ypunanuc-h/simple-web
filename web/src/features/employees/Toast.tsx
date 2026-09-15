import { useEffect } from 'react';

export interface ToastState {
  readonly type: 'success' | 'error';
  readonly message: string;
}

interface ToastProps {
  readonly toast: ToastState | null;
  readonly onDismiss: () => void;
}

const AUTO_DISMISS_MS = 4000;

export function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    if (toast === null) return;
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (toast === null) return null;

  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        padding: '12px 20px',
        borderRadius: 6,
        color: 'white',
        background: toast.type === 'success' ? '#2e7d32' : '#c62828',
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.25)',
        zIndex: 200,
      }}
    >
      {toast.message}
    </div>
  );
}
