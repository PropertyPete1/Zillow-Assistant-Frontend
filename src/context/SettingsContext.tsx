'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Api } from '@/lib/api';
import type { AppSettings, PropertyType } from '@/types';
import toast from 'react-hot-toast';

type Ctx = {
  settings: AppSettings | null;
  loading: boolean;
  error?: string;
  refresh: () => Promise<void>;
  update: (patch: Partial<AppSettings>) => Promise<void>;
  setPropertyType: (mode: PropertyType) => Promise<void>;
};

const SettingsContext = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setErr] = useState<string | undefined>();

  const refresh = async () => {
    setLoading(true);
    setErr(undefined);
    try {
      const data = await Api.getSettings();
      setSettings(data);
    } catch (e: any) {
      setErr(e.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const update = async (patch: Partial<AppSettings>) => {
    const next = await Api.saveSettings({ ...(settings || {}), ...patch });
    setSettings(next);
    return next;
  };

  const setPropertyType = async (mode: PropertyType) => {
    const prev = settings?.propertyType;
    // Optimistic UI
    setSettings(s => (s ? { ...s, propertyType: mode } : s));
    try {
      const next = await update({ propertyType: mode });
      toast.success(`Mode updated to ${next.propertyType?.toUpperCase?.() || mode.toUpperCase()}`);
      return true;
    } catch (e: any) {
      // Rollback
      setSettings(s => (s ? { ...s, propertyType: prev || 'rent' } : s));
      toast.error(e?.message || 'Failed to update mode');
      return false;
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, error, refresh, update, setPropertyType }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
};


