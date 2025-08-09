import React, { useEffect, useState } from 'react';
import { Shell } from '@/components/Shell';
import { useSettings } from '@/context/SettingsContext';
import { PropertyTypeToggle } from '@/components/PropertyTypeToggle';
import { Api } from '@/lib/api';
import toast from 'react-hot-toast';
import { ErrorNote } from '@/components/ErrorNote';

export default function DashboardPage() {
  const { settings, loading, update } = useSettings();
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    (async () => {
      try {
        const s = await Api.getScraperStatus();
        setStatus(s);
      } catch (e: any) {
        const msg: string = e?.message || 'Failed to load status';
        // If /status is not implemented, log once and fall back to a safe placeholder (no banner)
        if (msg.includes('404') || msg.includes('Not Found') || msg.includes('/api/scraper/status')) {
          // eslint-disable-next-line no-console
          console.info('[ZillowAssistant] Scraper status endpoint missing; showing placeholder.');
        } else {
          setError(msg);
          toast.error('Failed to load scraper status');
        }
      }
    })();
  }, []);
  return (
    <Shell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <PropertyTypeToggle />
      </div>

      <ErrorNote message={error} />
      {loading ? (
        <div>Loading settings…</div>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 rounded border border-white/10 bg-white/5">
            <div className="opacity-70 text-sm">Listing Type</div>
            <div className="text-xl">{settings?.propertyType?.toUpperCase()}</div>
          </div>
          <div className="p-4 rounded border border-white/10 bg-white/5">
            <div className="opacity-70 text-sm">Daily Limit</div>
            <div className="text-xl">{settings?.dailyMessageLimit ?? 0}</div>
          </div>
          <div className="p-4 rounded border border-white/10 bg-white/5">
            <div className="opacity-70 text-sm">Message Window</div>
            <div className="text-xl">
              {settings?.messageWindow?.[0]} – {settings?.messageWindow?.[1]}
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 p-4 rounded border border-white/10 bg-white/5">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Scraper Status</h2>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm opacity-80">
              <input type="checkbox" checked={!!(settings as any)?.autoMessages} onChange={async (e)=>{
                const prev = (settings as any)?.autoMessages;
                try { await update({ autoMessages: e.target.checked } as any); toast.success('Auto messages updated'); }
                catch(err:any){ toast.error(err.message||'Failed'); await update({ autoMessages: prev } as any); }
              }} />
              Auto Messages
            </label>
            <button
              id="rerun-scraper"
              className="px-3 py-2 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50"
              onClick={()=>{ location.assign('/scraper'); }}
            >
              Re-run Scraper
            </button>
          </div>
        </div>
        <p className="opacity-70 mt-2 text-sm">{status ? JSON.stringify(status) : '—'}</p>
      </div>
    </Shell>
  );
}


