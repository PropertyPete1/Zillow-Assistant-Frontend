'use client';
import React, { useEffect, useState } from 'react';
import { Shell } from '@/components/Shell';
import { Api } from '@/lib/api';
import type { LogRow } from '@/types';
import toast from 'react-hot-toast';
import { ErrorNote } from '@/components/ErrorNote';
import { useSettings } from '@/context/SettingsContext';

export default function LogsPage() {
  const { settings } = useSettings();
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [query, setQuery] = useState('');
  const [exporting, setExporting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await Api.getLogs();
      const arr = Array.isArray(data) ? data : [];
      // newest first by timestamp/dateSent
      arr.sort((a: any, b: any) => new Date(b.timestamp || b.dateSent || 0).getTime() - new Date(a.timestamp || a.dateSent || 0).getTime());
      setRows(arr as any);
    } catch (e:any) {
      setError(e.message || 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const exportSheets = async () => {
    if (!settings?.googleSheetUrl) {
      toast.error('No Google Sheet URL in settings.');
      return;
    }
    const filtered = rows.filter(r => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      const status = (r as any).status || '';
      return (
        r.address.toLowerCase().includes(q) ||
        (r.ownerName || '').toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) ||
        String(status).toLowerCase().includes(q)
      );
    });
    setExporting(true);
    try {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.info('[ZillowAssistant] logs/export request', { url: settings.googleSheetUrl, count: filtered.length });
      }
      const res = await Api.exportLogsToSheets({ googleSheetUrl: settings.googleSheetUrl, logs: filtered });
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.info('[ZillowAssistant] logs/export response', res);
      }
      toast.success(`Exported ${filtered.length} logs to Google Sheets`);
    } catch (e: any) {
      const msg = e.message || 'Export failed';
      toast.error(msg);
      setError(msg);
    } finally {
      setExporting(false);
    }
  };

  const filteredRows = rows.filter(r => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    const status = (r as any).status || '';
    return (
      r.address.toLowerCase().includes(q) ||
      (r.ownerName || '').toLowerCase().includes(q) ||
      r.type.toLowerCase().includes(q) ||
      String(status).toLowerCase().includes(q)
    );
  });

  const formatDate = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return `${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getDate().toString().padStart(2,'0')} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  };

  return (
    <Shell>
      <ErrorNote message={error} />
      <div className="flex items-center justify-between mb-4 gap-2">
        <h1 className="text-2xl font-semibold">Logs</h1>
        <div className="flex-1" />
        <input
          className="px-3 py-2 rounded bg-white/5 border border-white/10 w-64"
          placeholder="Search address, owner, type, status"
          value={query}
          onChange={e=>setQuery(e.target.value)}
        />
        <button onClick={exportSheets} disabled={exporting} className="px-3 py-2 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50">
          {exporting ? 'Exporting…' : 'Export to Sheets'}
        </button>
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : (
        <div className="overflow-auto rounded border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/10">
              <tr>
                <th className="p-2 text-left">Address</th>
                <th className="p-2 text-left">Owner</th>
                <th className="p-2">Type</th>
                <th className="p-2">Status</th>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">Response</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r, i) => (
                <tr key={i} className="border-t border-white/10">
                  <td className="p-2">{r.address}</td>
                  <td className="p-2">{r.ownerName}</td>
                  <td className="p-2 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${r.type === 'rent' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                      {r.type === 'rent' ? 'RENT' : 'SALE'}
                    </span>
                  </td>
                  <td className="p-2 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${((r as any).status) === 'sent' ? 'bg-green-500/20 text-green-400' : ((r as any).status) === 'skipped' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                      {String((r as any).status || '')}
                    </span>
                  </td>
                  <td className="p-2">{formatDate((r as any).timestamp || (r as any).dateSent)}</td>
                  <td className="p-2">{(r as any).response || (r as any).redFlags || ''}</td>
                </tr>
              ))}
              {!rows.length && <tr><td className="p-3 opacity-60" colSpan={6}>No logs yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}


