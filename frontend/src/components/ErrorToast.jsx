import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AlertTriangle, X, WifiOff } from 'lucide-react';

// Listens for 'api-error-toast' custom events (dispatched from utils/api.js
// whenever a request fails with a network error or a 5xx server error) and
// shows a lightweight, non-blocking, auto-dismissing notification.
//
// This exists so a genuinely failed request is visibly distinguishable from
// one that's just slow — previously there was no feedback at all on failure,
// so a stuck "Loading..." spinner and a broken request looked identical.
const ErrorToast = () => {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const handler = (e) => {
      const id = idRef.current++;
      const isNetworkError = e.detail?.isNetworkError;
      const message = e.detail?.message || 'Something went wrong. Please try again.';
      setToasts((prev) => [...prev, { id, message, isNetworkError }]);
      setTimeout(() => dismiss(id), 6000);
    };
    window.addEventListener('api-error-toast', handler);
    return () => window.removeEventListener('api-error-toast', handler);
  }, [dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[300] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className="pointer-events-auto flex items-start gap-3 bg-surface border border-rose-500/30 rounded-2xl p-4 shadow-2xl animate-[fadeIn_0.2s_ease-out]"
        >
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 flex-shrink-0">
            {t.isNetworkError ? <WifiOff size={16} aria-hidden="true" /> : <AlertTriangle size={16} aria-hidden="true" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-textMain uppercase tracking-wider mb-0.5">
              {t.isNetworkError ? 'Connection Problem' : 'Request Failed'}
            </p>
            <p className="text-xs text-textMuted leading-relaxed">{t.message}</p>
          </div>
          <button
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss"
            className="text-textMuted hover:text-textMain flex-shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ErrorToast;
