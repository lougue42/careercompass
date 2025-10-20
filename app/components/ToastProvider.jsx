'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const ToastContext = createContext(null);

const DEFAULT_DURATION = 3500; // readable but snappy

// Higher-contrast styles with subtle colored shadows
const VARIANT_STYLES = {
  success: 'bg-emerald-600 text-white border-emerald-700 shadow-lg shadow-emerald-800/30',
  error:   'bg-rose-600 text-white border-rose-700 shadow-lg shadow-rose-800/30',
  info:    'bg-slate-900 text-slate-50 border-slate-700 shadow-lg shadow-black/40',
  warning: 'bg-amber-500 text-white border-amber-600 shadow-lg shadow-amber-800/30',
};

const VARIANT_ICON = {
  success: '✓',
  error:   '⚠︎',
  info:    'ℹ︎',
  warning: '!',
};

export function ToastProvider({ children }) {
  // each toast: { id, message, variant }
  const [toasts, setToasts] = useState([]);
  const [leaving, setLeaving] = useState(new Set()); // ids currently animating out
  const idRef = useRef(1);
  const timersRef = useRef(new Map()); // id -> timeout for auto-dismiss

  const actuallyRemove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    setLeaving((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    const handle = timersRef.current.get(id);
    if (handle) {
      clearTimeout(handle);
      timersRef.current.delete(id);
    }
  }, []);

  const remove = useCallback((id) => {
    // trigger exit animation, then remove after 160ms
    setLeaving((prev) => new Set(prev).add(id));
    setTimeout(() => actuallyRemove(id), 160);
  }, [actuallyRemove]);

  const push = useCallback((message, { variant = 'info', duration = DEFAULT_DURATION } = {}) => {
    const id = idRef.current++;
    setToasts((prev) => [...prev, { id, message, variant }]);
    const handle = setTimeout(() => remove(id), duration);
    timersRef.current.set(id, handle);
    return id;
  }, [remove]);

  const api = useRef();
  if (!api.current) {
    const base = (msg, opts) => push(msg, opts);
    base.success = (msg, opts) => push(msg, { ...opts, variant: 'success' });
    base.error   = (msg, opts) => push(msg, { ...opts, variant: 'error' });
    base.info    = (msg, opts) => push(msg, { ...opts, variant: 'info' });
    base.warning = (msg, opts) => push(msg, { ...opts, variant: 'warning' });
    base.dismiss = (id) => remove(id);

    // Show a loading toast, then replace with success/error based on the promise result
    base.fromPromise = async (promise, { loading = 'Working…', success = 'Done', error = 'Something went wrong' } = {}) => {
      const loadingId = push(loading, { variant: 'info', duration: 8000 });
      try {
        const result = await promise;
        remove(loadingId);
        push(typeof success === 'function' ? success(result) : success, { variant: 'success' });
        return result;
      } catch (e) {
        remove(loadingId);
        push(typeof error === 'function' ? error(e) : error, { variant: 'error', duration: 4000 });
        throw e;
      }
    };

    api.current = base;
  }

  useEffect(() => {
    return () => {
      timersRef.current.forEach((h) => clearTimeout(h));
      timersRef.current.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast: api.current }}>
      {children}

      {/* Global keyframes for enter/exit animations */}
      <style jsx global>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        @keyframes toast-out {
          to   { opacity: 0; transform: translateY(8px) scale(0.98); }
        }
        .toast-enter { animation: toast-in 160ms ease-out both; }
        .toast-leave { animation: toast-out 160ms ease-in both; }
      `}</style>

      {typeof window !== 'undefined' &&
        createPortal(
          <div
            className="fixed bottom-6 right-6 z-50 space-y-3 pointer-events-none"
            aria-live="polite"
          >
            {toasts.map((t) => (
              <div
                key={t.id}
                role="status"
                className={`pointer-events-auto rounded-lg border px-4 py-3 text-[15px] leading-snug font-semibold tracking-tight flex items-center gap-3 ${VARIANT_STYLES[t.variant]} ${leaving.has(t.id) ? 'toast-leave' : 'toast-enter'}`}
              >
                <span aria-hidden="true" className="text-base opacity-90">{VARIANT_ICON[t.variant] || 'ℹ︎'}</span>
                <span>{t.message}</span>
                <button
                  onClick={() => remove(t.id)}
                  aria-label="Dismiss notification"
                  className="ml-auto opacity-80 hover:opacity-100 transition"
                >
                  ×
                </button>
              </div>
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx.toast;
}
