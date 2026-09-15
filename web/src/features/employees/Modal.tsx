import type { ReactNode } from 'react';

interface ModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly children: ReactNode;
}

export function Modal({ open, onClose, children }: ModalProps) {
  if (!open) return null;

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: 8,
          padding: 24,
          minWidth: 320,
          maxWidth: '90vw',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
