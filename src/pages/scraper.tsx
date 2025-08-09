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
    setLoading(true); setError(undefined);
    try {
      const zipCodes = zip.split(',').map(z => z.trim()).filter(Boolean);
      const res = await Api.runScraper({ propertyType: settings?.propertyType || 'rent', zipCodes, filters: {
        alreadyRented: fAlready,
        noAgents: fAgents,
        duplicatePhotos: fDupPhotos,
      }});
      setListings(res.listings);
      setStoreListings(res.listings);
      toast.success(`Loaded ${res.listings.length} listings`);
    } catch (e: any) {
      setError(e.message || 'Scraper failed');
      toast.error(e.message || 'Scraper failed');
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


