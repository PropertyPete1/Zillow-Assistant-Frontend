'use client';
import React, { useEffect, useState } from 'react';
import { Shell } from '@/components/Shell';
import { useSettings } from '@/context/SettingsContext';
import { useToast } from '@/components/Toast';

export default function SettingsPage() {
  const { settings, loading, update } = useSettings();
  const [form, setForm] = useState(settings || null);

  useEffect(() => { if (settings) setForm(settings); }, [settings]);

  const set = (k: any, v: any) => setForm((f: any) => ({ ...(f || {}), [k]: v }));

  const { push } = useToast();

  const save = async () => {
    if (!form) return;
    try {
      await update(form);
      push('success', 'Settings saved');
    } catch (e: any) {
      push('error', e.message || 'Failed to save settings');
    }
  };

  if (loading || !form) return <Shell><div>Loading settings…</div></Shell>;

  return (
    <Shell>
      <h1 className="text-2xl font-semibold mb-4">Settings</h1>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="p-4 rounded border border-white/10 bg-white/5">
          <div className="opacity-70 text-sm mb-2">Listing Type (Default)</div>
          <div className="flex gap-2 mb-4">
            {(['rent','sale','both'] as const).map(v => (
              <button key={v}
                className={`px-3 py-1 rounded border ${form.propertyType===v?'bg-cyan-500/20 border-cyan-400':'border-white/20 hover:border-white/40'}`}
                onClick={()=>set('propertyType', v)}
              >
                {v==='rent'?'🏠 Rent':v==='sale'?'🏡 Sale':'🔁 Both'}
              </button>
            ))}
          </div>

          <label className="block text-sm opacity-80 mb-1">Zip Codes (comma separated)</label>
          <input className="w-full px-3 py-2 rounded bg-white/5 border border-white/10 mb-3"
            value={form.zipCodes?.join(', ') || ''} onChange={e=>set('zipCodes', e.target.value.split(',').map((z:string)=>z.trim()).filter(Boolean))} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm opacity-80 mb-1">Min Bedrooms</label>
              <input type="number" className="w-full px-3 py-2 rounded bg-white/5 border border-white/10"
                value={form.minBedrooms ?? 0} onChange={e=>set('minBedrooms', Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-sm opacity-80 mb-1">Max Price</label>
              <input type="number" className="w-full px-3 py-2 rounded bg-white/5 border border-white/10"
                value={form.maxPrice ?? 0} onChange={e=>set('maxPrice', Number(e.target.value))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-sm opacity-80 mb-1">Daily Message Limit</label>
              <input type="number" className="w-full px-3 py-2 rounded bg-white/5 border border-white/10"
                value={form.dailyMessageLimit ?? 0} onChange={e=>set('dailyMessageLimit', Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-sm opacity-80 mb-1">Message Window (HH:mm – HH:mm)</label>
              <div className="flex gap-2">
                <input className="w-full px-3 py-2 rounded bg-white/5 border border-white/10"
                  value={form.messageWindow?.[0] || ''} onChange={e=>set('messageWindow', [e.target.value, form.messageWindow?.[1] || ''])} />
                <input className="w-full px-3 py-2 rounded bg-white/5 border border-white/10"
                  value={form.messageWindow?.[1] || ''} onChange={e=>set('messageWindow', [form.messageWindow?.[0] || '', e.target.value])} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-3">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!form.redFlagDetection} onChange={e=>set('redFlagDetection', e.target.checked)} />
              <span>Auto-detect Red Flags</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!form.testMode} onChange={e=>set('testMode', e.target.checked)} />
              <span>Test Mode</span>
            </label>
          </div>

          <label className="block text-sm opacity-80 mt-3 mb-1">Google Sheet URL</label>
          <input className="w-full px-3 py-2 rounded bg-white/5 border border-white/10"
            value={form.googleSheetUrl || ''} onChange={e=>set('googleSheetUrl', e.target.value)} />
        </div>

        <div className="p-4 rounded border border-white/10 bg-white/5">
          <div className="opacity-70 text-sm mb-2">Zillow Login (optional)</div>
          <input className="w-full px-3 py-2 rounded bg-white/5 border border-white/10 mb-2" placeholder="Email"
            value={form.zillowLogin?.email || ''} onChange={e=>set('zillowLogin', { ...(form.zillowLogin||{}), email: e.target.value })} />
          <input className="w-full px-3 py-2 rounded bg-white/5 border border-white/10" placeholder="Password"
            type="password" value={form.zillowLogin?.password || ''} onChange={e=>set('zillowLogin', { ...(form.zillowLogin||{}), password: e.target.value })} />
        </div>
      </div>

      <div className="mt-4">
        <button onClick={save} className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500">Save Settings</button>
      </div>
    </Shell>
  );
}


