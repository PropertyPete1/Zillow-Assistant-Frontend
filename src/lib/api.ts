import type { AppSettings, Listing, MessageResult, LogRow } from '@/types';

const BASE = process.env.NEXT_PUBLIC_API_URL as string;

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const Api = {
  // Settings
  getSettings: () => api<AppSettings>('/api/settings'),
  saveSettings: (payload: Partial<AppSettings>) =>
    api<AppSettings>('/api/settings', { method: 'POST', body: JSON.stringify(payload) }),

  // Scraper
  runScraper: (payload: { propertyType: 'rent' | 'sale' | 'both'; zipCodes: string[] }) =>
    api<{ listings: Listing[] }>('/api/scraper/run', { method: 'POST', body: JSON.stringify(payload) }),

  // Messaging
  sendMessage: (listing: Listing) =>
    api<MessageResult>('/api/message/send', { method: 'POST', body: JSON.stringify({ listing }) }),

  sendBatch: (payload: { propertyType: 'rent' | 'sale' | 'both'; maxMessages?: number }) =>
    api<MessageResult[]>('/api/message/send-batch', { method: 'POST', body: JSON.stringify(payload) }),

  // Logs
  getLogs: () => api<LogRow[]>('/api/logs'),
  exportLogsToSheets: () => api<{ ok: true }>('/api/logs/export-to-sheets', { method: 'POST' }),
};

