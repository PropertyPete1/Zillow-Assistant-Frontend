'use client';
import React, { useEffect, useState } from 'react';
import { Shell } from '@/components/Shell';
import { Api } from '@/lib/api';
import type { LogRow } from '@/types';

export default function LogsPage() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await Api.getLogs();
      setRows(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const exportSheets = async () => {
    await Api.exportLogsToSheets();
    alert('Exported to Google Sheets');
  };

  return (
    <Shell>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Logs</h1>
        <button onClick={exportSheets} className="px-3 py-2 rounded bg-cyan-600 hover:bg-cyan-500">Export to Sheets</button>
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
                <th className="p-2 text-left">Time</th>
                <th className="p-2 text-left">Flags</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-white/10">
                  <td className="p-2">{r.address}</td>
                  <td className="p-2">{r.ownerName}</td>
                  <td className="p-2 text-center">{r.type.toUpperCase()}</td>
                  <td className="p-2 text-center">{r.status}</td>
                  <td className="p-2">{new Date(r.timestamp).toLocaleString()}</td>
                  <td className="p-2">{r.redFlags || ''}</td>
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


