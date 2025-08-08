import React from 'react';
import { Shell } from '@/components/Shell';
import { useSettings } from '@/context/SettingsContext';
import { PropertyTypeToggle } from '@/components/PropertyTypeToggle';

export default function DashboardPage() {
  const { settings, loading } = useSettings();
  return (
    <Shell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <PropertyTypeToggle />
      </div>

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
          <button
            id="rerun-scraper"
            className="px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500"
            onClick={() => location.assign('/scraper')}
          >
            Re-run Scraper
          </button>
        </div>
        <p className="opacity-70 mt-2 text-sm">View scraper and run new searches from the Scraper page.</p>
      </div>
    </Shell>
  );
}


