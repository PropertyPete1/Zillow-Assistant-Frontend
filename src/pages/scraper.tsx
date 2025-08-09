'use client';
import React, { useState } from 'react';
import { Shell } from '@/components/Shell';
import { useSettings } from '@/context/SettingsContext';
import { PropertyTypeToggle } from '@/components/PropertyTypeToggle';
import { Api } from '@/lib/api';
import type { Listing } from '@/types';
import toast from 'react-hot-toast';
import { useListingsStore } from '@/store/listings';
import { ErrorNote } from '@/components/ErrorNote';

export default function ScraperPage() {
  const { settings } = useSettings();
  const [zip, setZip] = useState('');
  const [loading, setLoading] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [fAlready, setFAlready] = useState(true);
  const [fAgents, setFAgents] = useState(true);
  const [fDupPhotos, setFDupPhotos] = useState(true);
  const setStoreListings = useListingsStore(s => s.setListings);

  const run = async () => {
    if (!zip.trim()) return setError('Enter at least one zip code (comma separated allowed).');
    setError(undefined);
    const minBedrooms = (settings as any)?.minBedrooms ?? undefined;
    const maxPrice = (settings as any)?.maxPrice ?? undefined;
    setLoading(true);
    try {
      const zipCodes = zip.split(',').map(z => z.trim()).filter(Boolean);
      const payload = { propertyType: settings?.propertyType || 'rent', zipCodes, filters: {
        skipAlreadyRented: fAlready,
        skipNoAgents: fAgents,
        skipDuplicatePhotos: fDupPhotos,
        minBedrooms,
        maxPrice,
      }} as any;
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.info('[ZillowAssistant] scraper/run request', JSON.parse(JSON.stringify(payload, null, 2)));
      }
      const res = await Api.runScraper(payload as any);
      const rows = Array.isArray((res as any)?.listings) ? (res as any).listings : [];
      setListings(rows);
      setStoreListings(rows);
      toast.success(`Loaded ${rows.length} listings`);
      if (process.env.NODE_ENV !== 'production') {
        const preview = JSON.stringify(res).slice(0, 200);
        // eslint-disable-next-line no-console
        console.info('[ZillowAssistant] scraper/run response', { preview });
      }
      if (!rows.length) setError('No listings returned from scraper.');
    } catch (e: any) {
      const msg = e.message || 'Scraper failed';
      setError(msg);
      toast.error(msg);
    } finally { setLoading(false); }
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
          className="px-3 py-2 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50"
          disabled={loading || !zip.trim()}
        >
          {loading ? 'Scraping…' : 'Start Zillow Search'}
        </button>
      </div>

      <ErrorNote message={error} />
      <div className="flex items-center gap-6 mb-4">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={fAlready} onChange={e=>setFAlready(e.target.checked)} />
          <span className="text-sm opacity-80">Skip "Already Rented"</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={fAgents} onChange={e=>setFAgents(e.target.checked)} />
          <span className="text-sm opacity-80">Skip "No Agents"</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={fDupPhotos} onChange={e=>setFDupPhotos(e.target.checked)} />
          <span className="text-sm opacity-80">Skip duplicate photos</span>
        </label>
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


