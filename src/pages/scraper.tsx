'use client';
import React, { useState } from 'react';
import { Shell } from '@/components/Shell';
import { useSettings } from '@/context/SettingsContext';
import { PropertyTypeToggle } from '@/components/PropertyTypeToggle';
import { Api } from '@/lib/api';
import type { Listing } from '@/types';

export default function ScraperPage() {
  const { settings } = useSettings();
  const [zip, setZip] = useState('');
  const [loading, setLoading] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState<string | undefined>();

  const run = async () => {
    if (!zip.trim()) return setError('Enter at least one zip code (comma separated allowed).');
    setLoading(true); setError(undefined);
    try {
      const zipCodes = zip.split(',').map(z => z.trim()).filter(Boolean);
      const res = await Api.runScraper({ propertyType: settings?.propertyType || 'rent', zipCodes });
      setListings(res.listings);
    } catch (e: any) {
      setError(e.message || 'Scraper failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Scraper</h1>
        <PropertyTypeToggle />
      </div>

      <div className="grid gap-3 md:grid-cols-3 mb-4">
        <input
          className="px-3 py-2 rounded bg-white/5 border border-white/10"
          placeholder="Zip codes, e.g. 78704, 78745"
          value={zip}
          onChange={e => setZip(e.target.value)}
        />
        <button
          onClick={run}
          className="px-3 py-2 rounded bg-cyan-600 hover:bg-cyan-500"
          disabled={loading}
        >
          {loading ? 'Scraping…' : 'Start Zillow Search'}
        </button>
      </div>

      {error && <div className="text-red-400 mb-3">{error}</div>}

      <div className="overflow-auto rounded border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/10">
            <tr>
              <th className="p-2 text-left">Address</th>
              <th className="p-2 text-left">Price</th>
              <th className="p-2">Beds</th>
              <th className="p-2">Type</th>
              <th className="p-2 text-left">Owner</th>
              <th className="p-2 text-left">Notes</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {listings.map((l, i) => (
              <tr key={i} className="border-t border-white/10">
                <td className="p-2">{l.address}</td>
                <td className="p-2">{l.price}</td>
                <td className="p-2 text-center">{l.bedrooms}</td>
                <td className="p-2 text-center">{l.type.toUpperCase()}</td>
                <td className="p-2">{l.ownerName}</td>
                <td className="p-2">{l.redFlagReason || ''}</td>
                <td className="p-2 text-right">
                  <a className="px-3 py-1 rounded bg-white/10 hover:bg-white/20" href="/messages">Message</a>
                </td>
              </tr>
            ))}
            {!listings.length && (
              <tr><td className="p-3 opacity-60" colSpan={7}>No listings yet — run a search.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}


