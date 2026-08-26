import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { X, AlertTriangle, CheckCircle2, AlertCircle, Info, Loader2 } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
//  Toasts
// ─────────────────────────────────────────────────────────────
const ToastContext = createContext(null);

const TOAST_STYLES = {
  success: { cls: 'bg-green-50 border-green-300 text-green-900', Icon: CheckCircle2 },
  error: { cls: 'bg-red-50 border-red-300 text-red-900', Icon: AlertCircle },
  info: { cls: 'bg-blue-50 border-blue-300 text-blue-900', Icon: Info },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (message, type = 'success', ms = 4500) => {
      idRef.current += 1;
      const id = idRef.current;
      setToasts((prev) => [...prev, { id, message, type }]);
      if (ms > 0) setTimeout(() => dismiss(id), ms);
      return id;
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ notify, dismiss }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[80] flex flex-col gap-2 w-[min(420px,calc(100vw-2rem))]">
        {toasts.map(({ id, message, type }) => {
          const { cls, Icon } = TOAST_STYLES[type] || TOAST_STYLES.info;
          return (
            <div
              key={id}
              role="status"
              className={`${cls} border-2 rounded-xl px-4 py-3 shadow-lg flex items-start gap-3 animate-in slide-in-from-bottom-2 fade-in`}
            >
              <Icon className="w-5 h-5 shrink-0 mt-0.5" />
              <span className="text-sm font-semibold leading-relaxed flex-1">{message}</span>
              <button
                onClick={() => dismiss(id)}
                className="opacity-50 hover:opacity-100 shrink-0"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
};

// ─────────────────────────────────────────────────────────────
//  Modal
// ─────────────────────────────────────────────────────────────
export function Modal({ open, title, onClose, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl' };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        className={`bg-white w-full ${widths[size]} rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden`}
        role="dialog"
        aria-modal="true"
      >
        <div className="bg-[#0F3D1E] text-white px-5 py-4 flex justify-between items-center shrink-0">
          <h2 className="text-lg font-bold tracking-wide">{title}</h2>
          <button onClick={onClose} className="text-white/70 hover:text-white" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">{children}</div>

        {footer && (
          <div className="border-t border-gray-100 p-4 flex flex-col-reverse sm:flex-row justify-end gap-3 bg-gray-50 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Confirm dialog
// ─────────────────────────────────────────────────────────────
export function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message,
  detail,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  busy = false,
  onConfirm,
  onCancel,
}) {
  const tones = {
    danger: 'bg-red-600 hover:bg-red-700',
    primary: 'bg-[#0F3D1E] hover:bg-green-900',
  };

  return (
    <Modal
      open={open}
      title={title}
      onClose={busy ? () => {} : onCancel}
      size="sm"
      footer={
        <>
          <button
            onClick={onCancel}
            disabled={busy}
            className="px-5 py-3 border-2 border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`px-5 py-3 rounded-xl font-bold text-white disabled:opacity-60 flex items-center justify-center gap-2 ${tones[tone]}`}
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex gap-4">
        <div
          className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center ${
            tone === 'danger' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
          }`}
        >
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <p className="text-gray-900 font-semibold leading-relaxed">{message}</p>
          {detail && <p className="text-sm text-gray-500 mt-2 leading-relaxed">{detail}</p>}
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
//  Form field
// ─────────────────────────────────────────────────────────────
export const fieldBase =
  'w-full border-2 rounded-lg p-3 font-medium focus:outline-none focus:ring-4 transition-all';
export const fieldOk = `${fieldBase} border-gray-200 focus:border-green-600 focus:ring-green-600/10`;
export const fieldBad = `${fieldBase} border-red-400 focus:border-red-500 focus:ring-red-500/10`;

export function Field({ label, error, hint, required, children, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-red-600 text-xs font-semibold mt-1 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </p>
      ) : (
        hint && <p className="text-gray-400 text-xs mt-1">{hint}</p>
      )}
    </div>
  );
}

/** Full-panel empty state. */
export function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="text-center py-16 px-6">
      {Icon && <Icon className="w-12 h-12 text-gray-300 mx-auto mb-4" />}
      <h3 className="text-lg font-bold text-gray-700">{title}</h3>
      {message && <p className="text-gray-500 mt-2 max-w-md mx-auto text-sm leading-relaxed">{message}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
