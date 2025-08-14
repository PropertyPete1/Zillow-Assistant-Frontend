import React, { useEffect, useMemo, useState } from 'react';
import { Shell } from '@/components/Shell';
import { assertEnv } from '@/lib/env';

type LeadRow = { url: string; city?: string; price?: string; notes?: string; status?: string };
type Metrics = { queued?: number; sentToday?: number; defaultCaps?: { perHour?: number; perDay?: number } } | null;

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="p-4 rounded border border-white/10 bg-white/5">
      <div className="opacity-70 text-sm">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

export default function FrboConsole() {
  const [apiBase, setApiBase] = useState<string>('');
  const [metrics, setMetrics] = useState<Metrics>(null);
  const [count, setCount] = useState<number>(10);
  const [nextBatch, setNextBatch] = useState<LeadRow[]>([]);
  const [sheetUrl, setSheetUrl] = useState<string>('');
  const [pasteUrls, setPasteUrls] = useState<string>('');
  const [pasteCity, setPasteCity] = useState<string>('');
  const [pastePrice, setPastePrice] = useState<string>('');
  const [busy, setBusy] = useState<string>('');

  useEffect(() => {
    try { setApiBase(assertEnv()); } catch { setApiBase(''); }
  }, []);

  useEffect(() => {
    if (!apiBase) return;
    let mounted = true;
    const load = async () => {
      try {
        const r = await fetch(`${apiBase}/api/leads/metrics`, { cache: 'no-store' });
        if (!r.ok) throw new Error(String(r.status));
        const m = (await r.json()) as Metrics;
        if (mounted) setMetrics(m || null);
      } catch {
        if (mounted) setMetrics(null);
      }
    };
    load();
    const id = setInterval(load, 10000);
    return () => { mounted = false; clearInterval(id); };
  }, [apiBase]);

  const queued = (metrics as any)?.queued ?? '—';
  const sentToday = (metrics as any)?.sentToday ?? '—';
  const perHour = (metrics as any)?.defaultCaps?.perHour ?? 25;
  const perDay = (metrics as any)?.defaultCaps?.perDay ?? 75;

  async function seed3() {
    if (!apiBase) { setBusy('API base not set'); return; }
    try {
      setBusy('Seeding…');
      const rows: LeadRow[] = [
        { url: 'https://www.zillow.com/homedetails/TEST1', city: 'Austin',       price: '$1,995', status: 'queued' },
        { url: 'https://www.zillow.com/homedetails/TEST2', city: 'Round Rock',   price: '$2,150', status: 'queued' },
        { url: 'https://www.zillow.com/homedetails/TEST3', city: 'Pflugerville', price: '$1,875', status: 'queued' },
      ];
      await fetch(`${apiBase}/api/leads/ingest`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows }) });
      setBusy('Seeded 3 test rows. ✅');
    } catch (e) { setBusy('Seed error.'); }
  }

  async function addPasted() {
    if (!apiBase) { setBusy('API base not set'); return; }
    try {
      const urls = Array.from(new Set((pasteUrls || '').split('\n').map(s => s.trim()).filter(Boolean)));
      if (!urls.length) { setBusy('Paste at least one URL'); return; }
      setBusy('Adding…');
      const rows: LeadRow[] = urls.map(url => ({ url, city: pasteCity || '', price: pastePrice || '', status: 'queued' }));
      await fetch(`${apiBase}/api/leads/ingest`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows }) });
      setBusy(`Added ${rows.length} to queue. ✅`);
      setPasteUrls('');
    } catch (e) { setBusy('Add error.'); }
  }

  async function pullFromSheet() {
    if (!apiBase) { setBusy('API base not set'); return; }
    try {
      if (!sheetUrl) { setBusy('Paste your Sheet Web App URL'); return; }
      setBusy('Pulling from Sheet…');
      const r = await fetch(`${sheetUrl}?count=${count}`);
      const rows = await r.json();
      if (!Array.isArray(rows) || !rows.length) { setBusy('No rows returned'); return; }
      await fetch(`${apiBase}/api/leads/ingest`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows }) });
      setBusy(`Pulled ${rows.length} row(s) and queued. ✅`);
    } catch (e) { setBusy('Sheet error.'); }
  }

  async function previewNextBatch() {
    if (!apiBase) { setBusy('API base not set'); return; }
    try {
      setBusy('Fetching next batch…');
      const r = await fetch(`${apiBase}/api/leads/next-batch?count=${count}`);
      const items = await r.json();
      setNextBatch(items || []);
      setBusy('');
    } catch (e) { setBusy('Preview error.'); }
  }

  const table = useMemo(() => (
    <div className="overflow-auto rounded border border-white/10">
      <table className="w-full text-sm">
        <thead className="bg-white/10">
          <tr>
            <th className="p-2 text-left">URL</th>
            <th className="p-2 text-left">City</th>
            <th className="p-2 text-left">Price</th>
            <th className="p-2 text-left">Notes</th>
          </tr>
        </thead>
        <tbody>
          {nextBatch.map((r, i) => (
            <tr key={i} className="border-t border-white/10">
              <td className="p-2 max-w-[520px] truncate"><a className="underline" href={r.url} target="_blank" rel="noreferrer">{r.url}</a></td>
              <td className="p-2">{r.city || ''}</td>
              <td className="p-2">{r.price || ''}</td>
              <td className="p-2">{(r as any).notes || ''}</td>
            </tr>
          ))}
          {nextBatch.length === 0 && (
            <tr><td colSpan={4} className="p-3 opacity-60">No items in preview. Click “Preview”.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  ), [nextBatch]);

  return (
    <Shell>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">FRBO Ops Console</h1>
      </div>

      {metrics && (
        <div className="grid gap-3 md:grid-cols-3 mb-4">
          <Stat label="Queued" value={queued} />
          <Stat label="Sent Today" value={sentToday} />
          <Stat label="Caps (hour/day)" value={`${perHour}/${perDay}`} />
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 mb-4">
        <div className="p-4 rounded border border-white/10 bg-white/5">
          <div className="font-semibold mb-2">Add to Queue (No Terminal)</div>
          <button onClick={seed3} className="px-3 py-2 rounded bg-cyan-600 hover:bg-cyan-500">Seed 3 Test</button>

          <div className="h-2" />
          <div className="font-semibold mb-1">Paste URLs → Add</div>
          <textarea value={pasteUrls} onChange={e=>setPasteUrls(e.target.value)} rows={5} className="w-full px-3 py-2 rounded bg-white/5 border border-white/10" placeholder={'https://www.zillow.com/homedetails/...\nhttps://www.zillow.com/homedetails/...'} />
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <label className="text-sm opacity-80">City</label>
            <input value={pasteCity} onChange={e=>setPasteCity(e.target.value)} className="px-3 py-2 rounded bg-white/5 border border-white/10" style={{ width: 160 }} />
            <label className="text-sm opacity-80">Price</label>
            <input value={pastePrice} onChange={e=>setPastePrice(e.target.value)} className="px-3 py-2 rounded bg-white/5 border border-white/10" style={{ width: 140 }} placeholder="$1,950" />
            <button onClick={addPasted} className="px-3 py-2 rounded bg-cyan-600 hover:bg-cyan-500">Add to Queue</button>
          </div>

          <div className="h-3" />
          <div className="font-semibold mb-1">Pull From Sheet</div>
          <input value={sheetUrl} onChange={e=>setSheetUrl(e.target.value)} className="w-full px-3 py-2 rounded bg-white/5 border border-white/10" placeholder="Paste your Apps Script Web App URL (…/exec)" />
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <label className="text-sm opacity-80">Count</label>
            <input type="number" value={count} onChange={e=>setCount(parseInt(e.target.value || '10', 10))} className="px-3 py-2 rounded bg-white/5 border border-white/10" style={{ width: 120 }} />
            <button onClick={pullFromSheet} className="px-3 py-2 rounded bg-cyan-600 hover:bg-cyan-500">Pull & Add</button>
          </div>
          <div className="mt-2 text-sm opacity-80">{busy}</div>
        </div>

        <div className="p-4 rounded border border-white/10 bg-white/5">
          <div className="font-semibold mb-2">Preview Next Batch</div>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-sm opacity-80">Count</label>
            <input type="number" value={count} onChange={e=>setCount(parseInt(e.target.value || '10', 10))} className="px-3 py-2 rounded bg-white/5 border border-white/10" style={{ width: 120 }} />
            <button onClick={previewNextBatch} className="px-3 py-2 rounded bg-cyan-600 hover:bg-cyan-500">Preview</button>
          </div>
          <div className="h-2" />
          {table}
        </div>
      </div>

      <div className="p-4 rounded border border-white/10 bg-white/5">
        <div className="font-semibold mb-2">How to use with the Extension</div>
        <ol className="list-decimal pl-6 space-y-1 text-sm opacity-90">
          <li>Load the “Zillow FRBO Helper (Private/Throttled)” extension and set Backend URL in its popup.</li>
          <li>Use this console to fill the queue: Seed, Paste URLs, or Pull From Sheet.</li>
          <li>On a Zillow page, click the top-right FRBO Helper tag → “Get & Open”.</li>
          <li>Messages type in; you click Send; mark Sent in the HUD.</li>
        </ol>
      </div>
    </Shell>
  );
}



