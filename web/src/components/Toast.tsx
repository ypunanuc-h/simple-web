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
      className={
        toast.type === 'success'
          ? 'fixed bottom-6 right-6 z-[200] rounded-md bg-brand px-5 py-3 text-sm text-white shadow-lg'
          : 'fixed bottom-6 right-6 z-[200] rounded-md bg-red-600 px-5 py-3 text-sm text-white shadow-lg'
      }
    >
      {toast.message}
    </div>
  );
}
