'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';

type Toast = { id: number; type: 'success' | 'error' | 'info'; message: string };
type ToastCtx = { push: (type: Toast['type'], message: string) => void };

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = (type: Toast['type'], message: string) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, type, message }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  };

  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="fixed top-3 right-3 z-50 space-y-2">
        {toasts.map(t => (
          <div key={t.id} className={`px-3 py-2 rounded text-sm shadow ${
            t.type==='success' ? 'bg-green-600' : t.type==='error' ? 'bg-red-600' : 'bg-slate-700'
          }`}>
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};


