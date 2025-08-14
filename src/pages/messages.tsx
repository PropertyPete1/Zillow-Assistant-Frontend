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
  const [sendingOne, setSendingOne] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, MessageResult>>({});
  const storeListings = useListingsStore(s => s.listings);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (storeListings.length) setListings(storeListings);
  }, [storeListings]);

  const sendOne = async (l: Listing) => {
    setSendingOne(m => ({ ...m, [l.address]: true }));
    // Optimistic UI
    setResults(r => ({ ...r, [l.address]: { address: l.address, status: 'sent' } }));
    try {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.info('[ZillowAssistant] message/send request', { endpoint: '/api/message/send', payload: { listing: l } });
      }
      const res = await Api.sendMessage(l);
      setResults(r => ({ ...r, [l.address]: res }));
      if (process.env.NODE_ENV !== 'production') {
        const preview = JSON.stringify(res).slice(0, 200);
        // eslint-disable-next-line no-console
        console.info('[ZillowAssistant] message/send response', { preview });
      }
      toast.success(`Sent to ${l.address}`);
    } catch (e: any) {
      setResults(r => ({ ...r, [l.address]: { address: l.address, status: 'failed', reason: e.message } }));
      toast.error(e.message || 'Send failed');
    } finally {
      setSendingOne(m => ({ ...m, [l.address]: false }));
    }
  };

  const sendAll = async () => {
    if (!settings) return;
    // Optional front-end guard: enforce message window
    const windowOk = (() => {
      const [start, end] = (settings.messageWindow || []) as any;
      if (!start || !end) return true;
      const now = new Date();
      const [sh, sm] = String(start).split(':').map((n: string) => parseInt(n, 10));
      const [eh, em] = String(end).split(':').map((n: string) => parseInt(n, 10));
      const startMin = sh * 60 + (sm || 0);
      const endMin = eh * 60 + (em || 0);
      const nowMin = now.getHours() * 60 + now.getMinutes();
      return nowMin >= startMin && nowMin <= endMin;
    })();
    if (!windowOk) {
      const msg = `Outside allowed time window (${settings.messageWindow?.[0]}–${settings.messageWindow?.[1]})`;
      setError(msg);
      toast.error(msg);
      return;
    }
    if ((settings.dailyMessageLimit ?? 0) <= 0) {
      const msg = 'Daily limit reached.';
      setError(msg);
      toast.error(msg);
      return;
    }
    setSending(true);
    try {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.info('[ZillowAssistant] message/send-batch request', {
          endpoint: '/api/message/send-batch',
          payload: { propertyType: settings.propertyType, maxMessages: settings.dailyMessageLimit },
        });
      }
      const res = await Api.sendBatch({
        propertyType: settings.propertyType,
        maxMessages: settings.dailyMessageLimit,
      });
      const map: Record<string, MessageResult> = {};
      res.forEach(r => (map[r.address] = r));
      setResults(map);
      if (process.env.NODE_ENV !== 'production') {
        const preview = JSON.stringify(res).slice(0, 200);
        // eslint-disable-next-line no-console
        console.info('[ZillowAssistant] message/send-batch response', { preview });
      }
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
          className="px-3 py-2 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50"
          onClick={sendAll}
          disabled={sending || !settings || (settings.dailyMessageLimit ?? 0) <= 0}
          title={(settings?.dailyMessageLimit ?? 0) <= 0 ? 'Daily limit reached' : undefined}
        >
          {sending ? 'Sending…' : (settings?.dailyMessageLimit ?? 0) <= 0 ? 'Daily limit reached' : 'Send All Messages'}
        </button>
        <a href="/frbo" className="px-3 py-2 rounded bg-white/10 hover:bg-white/20">Go to FRBO Console</a>
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
                  <button
                    className="px-3 py-2 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50"
                    onClick={() => sendOne(l)}
                    disabled={!!sendingOne[l.address] || sending}
                  >
                    {!!sendingOne[l.address] ? 'Sending…' : 'Send Message'}
                  </button>
                  <button className="px-3 py-2 rounded bg-white/10 hover:bg-white/20" onClick={async ()=>{
                    try {
                      if (process.env.NODE_ENV !== 'production') {
                        // eslint-disable-next-line no-console
                        console.info('[ZillowAssistant] message/regenerate request', { endpoint: '/api/message/regenerate', payload: { listing: l } });
                      }
                      const r = await Api.regenerateMessage(l);
                      toast.success('Message regenerated');
                      if (process.env.NODE_ENV !== 'production') {
                        const preview = JSON.stringify(r).slice(0, 200);
                        // eslint-disable-next-line no-console
                        console.info('[ZillowAssistant] message/regenerate response', { preview });
                      }
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
          {!listings.length && (
            <div className="opacity-80">
              No listings loaded. <a className="underline text-cyan-400" href="/frbo">Go to FRBO Console</a>.
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}


