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
      try { const s = await Api.getScraperStatus(); setStatus(s); }
      catch (e:any) { setError(e.message || 'Failed to load status'); }
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
                try { await update({ autoMessages: e.target.checked } as any); toast.success('Auto messages updated'); } catch(err:any){ toast.error(err.message||'Failed'); }
              }} />
              Auto Messages
            </label>
            <button
              id="rerun-scraper"
              className="px-3 py-2 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50"
              onClick={async ()=>{
                try {
                  await Api.runScraper({ propertyType: settings?.propertyType || 'rent', zipCodes: (settings as any)?.zipCodes || [] });
                  toast.success('Scraper re-run started');
                } catch(e:any){ toast.error(e.message||'Failed to start scraper'); }
              }}
            >
              Re-run Scraper
            </button>
          </div>
        </div>
        <p className="opacity-70 mt-2 text-sm">{status ? JSON.stringify(status) : 'Status loading…'}</p>
      </div>
    </Shell>
  );
}


