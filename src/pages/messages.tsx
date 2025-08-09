'use client';
import React, { useEffect, useState } from 'react';
import { Shell } from '@/components/Shell';
import { useSettings } from '@/context/SettingsContext';
import { PropertyTypeToggle } from '@/components/PropertyTypeToggle';
import { Api } from '@/lib/api';
import type { Listing, MessageResult } from '@/types';
import { useListingsStore } from '@/store/listings';
import toast from 'react-hot-toast';
import { ErrorNote } from '@/components/ErrorNote';

export default function MessagesPage() {
  const { settings } = useSettings();
  const [listings, setListings] = useState<Listing[]>([]);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<Record<string, MessageResult>>({});
  const storeListings = useListingsStore(s => s.listings);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (storeListings.length) setListings(storeListings);
  }, [storeListings]);

  const sendOne = async (l: Listing) => {
    setResults(r => ({ ...r, [l.address]: { address: l.address, status: 'sent' } })); // optimistic
    try {
      const res = await Api.sendMessage(l);
      setResults(r => ({ ...r, [l.address]: res }));
      toast.success(`Sent: ${l.address}`);
    } catch (e: any) {
      setResults(r => ({ ...r, [l.address]: { address: l.address, status: 'failed', reason: e.message } }));
      toast.error(e.message || 'Send failed');
    }
  };

  const sendAll = async () => {
    if (!settings) return;
    setSending(true);
    try {
      const res = await Api.sendBatch({
        propertyType: settings.propertyType,
        maxMessages: settings.dailyMessageLimit,
      });
      const map: Record<string, MessageResult> = {};
      res.forEach(r => (map[r.address] = r));
      setResults(map);
      toast.success('Batch complete');
    } catch (e: any) {
      toast.error(e.message || 'Batch failed');
      setError(e.message || 'Batch failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <Shell>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Messages</h1>
        <PropertyTypeToggle />
      </div>

      <ErrorNote message={error} />
      <div className="flex items-center gap-2 mb-4">
        <button
          className="px-3 py-2 rounded bg-cyan-600 hover:bg-cyan-500"
          onClick={sendAll}
          disabled={sending || !settings}
        >
          {sending ? 'Sending…' : 'Send All Messages'}
        </button>
        <a href="/scraper" className="px-3 py-2 rounded bg-white/10 hover:bg-white/20">Go to Scraper</a>
      </div>

      <div className="rounded border border-white/10 p-3">
        <div className="opacity-70 mb-2 text-sm">
          Listings will appear here after scraping. Click “Send Message” to send individually, or use “Send All Messages”.
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {listings.map((l, i) => {
            const r = results[l.address];
            return (
              <div key={i} className="p-3 rounded border border-white/10 bg-white/5">
                <div className="text-sm opacity-70">{l.type.toUpperCase()}</div>
                <div className="font-medium">{l.address}</div>
                <div className="opacity-80 text-sm">{l.ownerName}</div>
                <div className="opacity-60 text-sm mb-2">{l.price} • {l.bedrooms} bd</div>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-2 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50" onClick={() => sendOne(l)}>
                    Send Message
                  </button>
                  <button className="px-3 py-2 rounded bg-white/10 hover:bg-white/20" onClick={async ()=>{
                    try {
                      const r = await Api.regenerateMessage(l);
                      toast.success('Message regenerated');
                    } catch(e:any){ toast.error(e.message||'Regenerate failed'); }
                  }}>Regenerate</button>
                  <a className="px-3 py-2 rounded bg-white/10 hover:bg-white/20" href={l.link} target="_blank">Open Listing</a>
                </div>
                {r && (
                  <div className={`mt-2 text-sm ${r.status === 'sent' ? 'text-green-400' : 'text-red-400'}`}>
                    {r.status === 'sent' ? `✅ Sent` : `❌ ${r.reason || 'Failed'}`}
                    {r.test && <span className="ml-2 opacity-70">[Test Mode]</span>}
                    {r.previewMessage && <pre className="mt-1 whitespace-pre-wrap opacity-80">{r.previewMessage}</pre>}
                  </div>
                )}
              </div>
            );
          })}
          {!listings.length && <div className="opacity-60">No listings loaded. Scrape first.</div>}
        </div>
      </div>
    </Shell>
  );
}


