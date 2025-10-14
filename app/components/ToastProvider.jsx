'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]); // { id, message }
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

  // toast("Saved") or toast("Saved", { duration: 2500 })
  const toast = useCallback((message, opts = {}) => {
    const id = idRef.current++;
    const duration = typeof opts.duration === 'number' ? opts.duration : 2200;
    setToasts((prev) => [...prev, { id, message }]);
    const handle = setTimeout(() => remove(id), duration);
    timersRef.current.set(id, handle);
  }, [remove]);

  // clear pending timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((h) => clearTimeout(h));
      timersRef.current.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
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
                className="pointer-events-auto rounded-xl border bg-white/80 backdrop-blur px-4 py-2 text-sm shadow-md dark:bg-white/10 dark:text-slate-100 flex items-center gap-3"
              >
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
