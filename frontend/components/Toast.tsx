"use client";

import { createContext, useContext, useState, useCallback } from "react";

type ToastType = "success" | "error" | "info";

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

const ToastContext = createContext<{
    showToast: (message: string, type?: ToastType) => void;
}>({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

let _id = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = "info") => {
        const id = ++_id;
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
    }, []);

    const colors: Record<ToastType, string> = {
        success: "bg-green-500/90 border-green-400",
        error: "bg-red-500/90 border-red-400",
        info: "bg-slate-700/90 border-slate-500",
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-[100] space-y-2">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`px-4 py-2.5 rounded-xl border text-sm text-white shadow-lg backdrop-blur-sm animate-[slideIn_0.3s_ease] ${colors[t.type]}`}
                    >
                        {t.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
