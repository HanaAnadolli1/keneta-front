// src/context/ToastContext.jsx
import React, { createContext, useCallback, useContext, useState } from "react";
import { createPortal } from "react-dom";

const ToastContext = createContext(null);
let _id = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    ({ type = "info", title, message, duration = 3000 }) => {
      const id = ++_id;
      setToasts((t) => [...t, { id, type, title, message, duration }]);
      if (duration > 0) {
        setTimeout(() => remove(id), duration);
      }
      return id;
    },
    [remove]
  );

  const api = {
    show: push,
    success: (msg, opts = {}) =>
      push({ type: "success", message: msg, ...opts }),
    error: (msg, opts = {}) => push({ type: "error", message: msg, ...opts }),
    info: (msg, opts = {}) => push({ type: "info", message: msg, ...opts }),
    warn: (msg, opts = {}) => push({ type: "warning", message: msg, ...opts }),
    remove,
  };

  return (
    <ToastContext.Provider value={api}>
      {children}

      {createPortal(
        <div className="fixed top-4 right-4 z-[1000] space-y-3 w-[92vw] max-w-sm">
          {toasts.map((t) => {
            const tone =
              t.type === "success"
                ? "bg-emerald-50 ring-emerald-200 text-emerald-900"
                : t.type === "error"
                ? "bg-rose-50 ring-rose-200 text-rose-900"
                : t.type === "warning"
                ? "bg-amber-50 ring-amber-200 text-amber-900"
                : "bg-sky-50 ring-sky-200 text-sky-900";

            const iconPath =
              t.type === "success"
                ? "M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293A1 1 0 106.293 10.707l2 2a1 1 0 001.414 0l4-4z"
                : t.type === "error"
                ? "M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                : t.type === "warning"
                ? "M9.401 1.173a1 1 0 011.198 0l8.4 6a1 1 0 010 1.654l-8.4 6a1 1 0 01-1.198 0l-8.4-6a1 1 0 010-1.654l8.4-6zM11 7H9v4h2V7zm0 6H9v2h2v-2z"
                : "M18 10A8 8 0 11.001 10 8 8 0 0118 10zm-8 3a1 1 0 100-2 1 1 0 000 2zm1-7H9v5h2V6z";

            return (
              <div
                key={t.id}
                className={`rounded-xl shadow ring-1 p-3 pr-10 relative ${tone}`}
                role="status"
                aria-live="polite"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5">
                    <svg
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-5 h-5"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d={iconPath}
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                  <div className="flex-1">
                    {t.title && <div className="font-semibold">{t.title}</div>}
                    <div className="text-sm leading-5">{t.message}</div>
                  </div>
                </div>
                <button
                  onClick={() => remove(t.id)}
                  className="absolute top-2.5 right-2.5 text-current/70 hover:text-current"
                  aria-label="Close notification"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}
