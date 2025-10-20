'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const ToastContext = createContext(null);

const DEFAULT_DURATION = 2600;
const VARIANT_STYLES = {
  success: 'border-green-200 bg-emerald-50 text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-100',
  error:   'border-red-200 bg-rose-50 text-rose-900 dark:bg-rose-900/20 dark:text-rose-100',
  info:    'border-slate-200 bg-white/80 text-slate-900 dark:bg-white/10 dark:text-slate-100',
  warning: 'border-amber-200 bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-100',
};

const VARIANT_ICON = {
  success: '✓',
  error:   '⚠︎',
  info:    'ℹ︎',
  warning: '!',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]); // { id, message, variant }
  const idRef = useRef(1);
  const timersRef = useRef(new Map()); // id -> timeout

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const handle = timersRef.current.get(id);
    if (handle) {
      clearTimeout(handle);
      timersRef.current.delete(id);
    }
  }, []);

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

    // fromPromise: show loading msg, then replace with success/error
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

      {typeof window !== 'undefined' &&
        createPortal(
          <div
            className="fixed bottom-4 right-4 z-50 space-y-2 pointer-events-none"
            aria-live="polite"
          >
            {toasts.map((t) => (
              <div
                key={t.id}
                role="status"
                className={`pointer-events-auto rounded-xl border px-4 py-2 text-sm shadow-md backdrop-blur flex items-center gap-3 ${VARIANT_STYLES[t.variant]}`}
              >
                <span aria-hidden="true" className="text-base">{VARIANT_ICON[t.variant] || 'ℹ︎'}</span>
                <span>{t.message}</span>
                <button
                  onClick={() => remove(t.id)}
                  aria-label="Dismiss notification"
                  className="ml-auto opacity-70 hover:opacity-100 transition"
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
