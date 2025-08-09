'use client';
import React, { useState } from 'react';
import { useSettings } from '@/context/SettingsContext';
import type { PropertyType } from '@/types';

export function PropertyTypeToggle() {
  const { settings, setPropertyType } = useSettings();
  const [busy, setBusy] = useState(false);
  const active = settings?.propertyType || 'rent';
  const btn = (val: PropertyType, label: string) => (
    <button
      key={val}
      onClick={async () => { if (busy || active === val) return; setBusy(true); await setPropertyType(val); setBusy(false); }}
      disabled={busy}
      className={`px-3 py-1 rounded-full border text-sm mr-2 mb-2 disabled:opacity-50 ${
        active === val ? 'bg-cyan-500/20 border-cyan-400' : 'border-white/20 hover:border-white/40'
      }`}
    >
      {busy && active !== val ? '…' : label}
    </button>
  );
  return (
    <div className="flex flex-wrap items-center">
      <span className="mr-2 opacity-70">Mode:</span>
      {btn('rent', '🏠 Rent')}
      {btn('sale', '🏡 Sale')}
      {btn('both', '🔁 Both')}
    </div>
  );
}


