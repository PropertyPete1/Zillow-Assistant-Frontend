import type { AppSettings, Listing, MessageResult, LogRow, ScraperFilters } from '@/types';
import { assertEnv } from '@/lib/env';
import toast from 'react-hot-toast';

const BASE = (() => {
  try { return assertEnv(); } catch (e: any) {
    if (typeof window !== 'undefined') toast.error(e.message || 'API URL not configured');
    return '' as any;
  }
})();

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    let detail = '';
    try { detail = await res.text(); } catch {}
    let parsed: any; try { parsed = detail ? JSON.parse(detail) : null; } catch {}
    const message = parsed?.message || parsed?.error || detail || res.statusText;
    const err = new Error(`API ${res.status} ${path}: ${message}`);
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.info('[ZillowAssistant]', { action: 'api-error', endpoint: path, status: res.status, message });
      if (message?.includes('Failed to fetch') || res.status === 403 || res.status === 405) {
        toast.error(`Network error calling ${path}. Check NEXT_PUBLIC_API_URL and CORS on backend.`);
      }
    }
    throw err;
  }
  const json = await res.json();
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.info('[ZillowAssistant]', { action: 'api', endpoint: path, payload: init?.body ? JSON.parse(String(init.body)) : undefined, response: json });
  }
  return json as T;
}

export const Api = {
  // Settings
  getSettings: () => api<AppSettings>('/api/settings'),
  saveSettings: (payload: Partial<AppSettings>) =>
    api<AppSettings>('/api/settings', { method: 'POST', body: JSON.stringify(payload) }),

  // Scraper
  runScraper: (payload: { propertyType: 'rent' | 'sale' | 'both'; zipCodes: string[]; filters?: ScraperFilters }) =>
    api<{ listings: Listing[] }>('/api/scraper/run', { method: 'POST', body: JSON.stringify(payload) }),
  getScraperStatus: () => api<any>('/api/scraper/status'),

  // Messaging
  sendMessage: (listing: Listing) =>
    api<MessageResult>('/api/message/send', { method: 'POST', body: JSON.stringify({ listing }) }),
  regenerateMessage: (listing: Listing) =>
    api<{ message: string }>('/api/message/regenerate', { method: 'POST', body: JSON.stringify({ listing }) }),

  sendBatch: (payload: { propertyType: 'rent' | 'sale' | 'both'; maxMessages?: number }) =>
    api<MessageResult[]>('/api/message/send-batch', { method: 'POST', body: JSON.stringify(payload) }),

  // Logs
  getLogs: () => api<LogRow[]>('/api/logs'),
  exportLogsToSheets: () => api<{ ok: true }>('/api/logs/export-to-sheets', { method: 'POST' }),

  // Test & Analytics
  testMessage: (payload: { listing?: Listing }) => api<any>('/api/message/test', { method: 'POST', body: JSON.stringify(payload) }),
  previewMessage: (payload: { listing: Listing }) => api<{ message: string }>('/api/message/preview', { method: 'POST', body: JSON.stringify(payload) }),
  getAnalytics: () => api<any>('/api/analytics'),
};

