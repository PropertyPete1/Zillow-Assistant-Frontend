"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { Shell } from '@/components/Shell';
import { ErrorNote } from '@/components/ErrorNote';
import { assertEnv } from '@/lib/env';

type LeadRow = {
  url: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  price?: string;
  status?: string; // queued | sent | skipped | ...
  last_action_at?: string;
  timestamp?: string;
  notes?: string;
};

export default function LogsPage() {
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<'all'|'queued'|'sent'|'skipped'>('all');
  const [limit, setLimit] = useState(50);
  const [query, setQuery] = useState('');

  const backend = useMemo(() => {
    try { return assertEnv(); } catch { return ''; }
  }, []);
  const adminKey = process.env.NEXT_PUBLIC_ADMIN_READ_KEY || '';

  const load = async () => {
    if (!backend || !adminKey) { setError('Admin key or backend not configured'); return; }
    setLoading(true);
    setError(undefined);
    try {
      const u = new URL(`${backend}/api/leads/peek`);
      u.searchParams.set('key', adminKey);
      u.searchParams.set('limit', String(limit));
      if (statusFilter !== 'all') u.searchParams.set('status', statusFilter);
      const r = await fetch(u.toString(), { cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = await r.json();
      setRows(Array.isArray(json) ? json : []);
    } catch (e:any) {
      setError(e.message || 'Failed to load logs');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter, limit]);

  const filtered = rows.filter(r => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      (r.address || '').toLowerCase().includes(q) ||
      (r.city || '').toLowerCase().includes(q) ||
      (r.url || '').toLowerCase().includes(q) ||
      (r.status || '').toLowerCase().includes(q)
    );
  });

  const fmt = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return `${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getDate().toString().padStart(2,'0')} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  };

  return (
    <Shell>
      <ErrorNote message={error} />
      <div className="flex items-center justify-between mb-4 gap-2">
        <h1 className="text-2xl font-semibold">Logs</h1>
        <div className="flex items-center gap-2">
          <select className="px-3 py-2 rounded bg-white/5 border border-white/10" value={statusFilter} onChange={e=>setStatusFilter(e.target.value as any)}>
            <option value="all">All</option>
            <option value="queued">Queued</option>
            <option value="sent">Sent</option>
            <option value="skipped">Skipped</option>
          </select>
          <input type="number" className="px-3 py-2 rounded bg-white/5 border border-white/10 w-24" value={limit} onChange={e=>setLimit(Math.max(1, Math.min(200, parseInt(e.target.value||'50',10))))} />
          <input className="px-3 py-2 rounded bg-white/5 border border-white/10 w-64" placeholder="Search url, address, city, status" value={query} onChange={e=>setQuery(e.target.value)} />
          <button onClick={load} className="px-3 py-2 rounded bg-cyan-600 hover:bg-cyan-500">Refresh</button>
        </div>
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : (
        <div className="overflow-auto rounded border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/10">
              <tr>
                <th className="p-2 text-left">URL</th>
                <th className="p-2 text-left">City</th>
                <th className="p-2 text-left">Price</th>
                <th className="p-2 text-center">Status</th>
                <th className="p-2 text-left">Last Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={i} className="border-t border-white/10">
                  <td className="p-2 max-w-[520px] truncate"><a className="underline" href={r.url} target="_blank" rel="noreferrer">{r.url}</a></td>
                  <td className="p-2">{r.city || ''}</td>
                  <td className="p-2">{r.price || ''}</td>
                  <td className="p-2 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${r.status === 'sent' ? 'bg-green-500/20 text-green-400' : r.status === 'skipped' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      {r.status || ''}
                    </span>
                  </td>
                  <td className="p-2">{fmt(r.last_action_at || r.timestamp)}</td>
                </tr>
              ))}
              {!rows.length && <tr><td className="p-3 opacity-60" colSpan={5}>No data yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}


