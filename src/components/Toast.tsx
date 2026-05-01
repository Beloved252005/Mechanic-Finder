"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";

type ToastType = "success" | "error" | "info";

interface Toast {
    id: string;
    message: string;
    type: ToastType;
    createdAt: number;
}

interface ToastContextType {
    toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used within ToastProvider");
    return ctx;
}

const TOAST_DURATION = 4000;
const MAX_TOASTS = 3;

const ICONS: Record<ToastType, string> = {
    success: "✓",
    error: "✕",
    info: "ℹ",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        const timer = timersRef.current.get(id);
        if (timer) {
            clearTimeout(timer);
            timersRef.current.delete(id);
        }
    }, []);

    const toast = useCallback(
        (message: string, type: ToastType = "info") => {
            const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            const newToast: Toast = { id, message, type, createdAt: Date.now() };

            setToasts((prev) => {
                const next = [...prev, newToast];
                // Keep only the latest MAX_TOASTS
                if (next.length > MAX_TOASTS) {
                    const removed = next.shift()!;
                    const timer = timersRef.current.get(removed.id);
                    if (timer) {
                        clearTimeout(timer);
                        timersRef.current.delete(removed.id);
                    }
                }
                return next;
            });

            const timer = setTimeout(() => removeToast(id), TOAST_DURATION);
            timersRef.current.set(id, timer);
        },
        [removeToast]
    );

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            timersRef.current.forEach((timer) => clearTimeout(timer));
        };
    }, []);

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <div className="toast-container" role="status" aria-live="polite">
                {toasts.map((t) => (
                    <ToastItem key={t.id} toast={t} onDismiss={removeToast} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
    const [exiting, setExiting] = useState(false);

    const handleDismiss = () => {
        setExiting(true);
        setTimeout(() => onDismiss(toast.id), 250);
    };

    // Auto-trigger exit animation before removal
    useEffect(() => {
        const timeout = setTimeout(() => setExiting(true), TOAST_DURATION - 300);
        return () => clearTimeout(timeout);
    }, []);

    return (
        <div
            className={`toast toast-${toast.type} ${exiting ? "toast-exit" : ""}`}
            onClick={handleDismiss}
            role="alert"
        >
            <span className="toast-icon">{ICONS[toast.type]}</span>
            <span className="toast-message">{toast.message}</span>
            <button className="toast-close" onClick={handleDismiss} aria-label="Dismiss">
                ×
            </button>
            <div className="toast-progress">
                <div className="toast-progress-bar" style={{ animationDuration: `${TOAST_DURATION}ms` }} />
            </div>
        </div>
    );
}
