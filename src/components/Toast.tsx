import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle, AlertTriangle, XCircle, Info, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000); // 4 seconds duration
  }, [removeToast]);

  const success = useCallback((message: string) => toast(message, "success"), [toast]);
  const error = useCallback((message: string) => toast(message, "error"), [toast]);
  const warning = useCallback((message: string) => toast(message, "warning"), [toast]);
  const info = useCallback((message: string) => toast(message, "info"), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}
      {/* Toast Render stack */}
      <div className="fixed top-24 right-4 z-50 flex flex-col gap-3 w-full max-w-sm pointer-events-none md:right-6">
        <AnimatePresence>
          {toasts.map((t) => {
            const colors = {
              success: "border-brand-success/70 bg-brand-surface/90 shadow-brand-success/10 text-white",
              error: "border-brand-danger/70 bg-brand-surface/90 shadow-brand-danger/10 text-white",
              warning: "border-brand-warning/70 bg-brand-surface/90 shadow-brand-warning/10 text-white",
              info: "border-brand-accent/70 bg-brand-surface/90 shadow-brand-accent/10 text-white",
            };

            const glows = {
              success: "rgba(0, 200, 83, 0.4)",
              error: "rgba(255, 59, 59, 0.4)",
              warning: "rgba(255, 215, 0, 0.4)",
              info: "rgba(105, 240, 174, 0.4)",
            };

            const icons = {
              success: <CheckCircle className="text-brand-success h-5 w-5 shrink-0" />,
              error: <XCircle className="text-brand-danger h-5 w-5 shrink-0" />,
              warning: <AlertTriangle className="text-brand-warning h-5 w-5 shrink-0" />,
              info: <Info className="text-brand-accent h-5 w-5 shrink-0" />,
            };

            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 100, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 80, scale: 0.9, transition: { duration: 0.15 } }}
                className={`pointer-events-auto border backdrop-blur-md rounded-xl p-4 flex gap-3 shadow-lg ${colors[t.type]}`}
                style={{
                  boxShadow: `0 0 15px ${glows[t.type]}`,
                }}
              >
                {icons[t.type]}
                <div className="flex-1 text-sm font-medium pr-1 select-none">
                  {t.message}
                </div>
                <button
                  onClick={() => removeToast(t.id)}
                  className="text-brand-text-secondary hover:text-white transition-colors duration-150 rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
