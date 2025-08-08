export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

const getBaseUrl = (): string => {
  const envUrl = import.meta.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL;
  return (envUrl as string) || 'http://localhost:3001';
};

export async function apiFetch<TResponse = any>(
  path: string,
  options: {
    method?: HttpMethod;
    body?: unknown;
    headers?: Record<string, string>;
    signal?: AbortSignal;
  } = {}
): Promise<TResponse> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const { method = 'GET', body, headers = {}, signal } = options;

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // non-JSON response
    data = text as any;
  }

  if (!res.ok) {
    const message = (data && (data.error?.message || data.message || data.error)) || `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data as TResponse;
}

export const api = {
  // Settings
  getSettings: () => apiFetch('/api/settings'),
  saveSettings: (payload: any) => apiFetch('/api/settings', { method: 'POST', body: payload }),
  setPropertyType: (propertyType: string) => apiFetch('/api/settings', { method: 'POST', body: { propertyType } }),

  // Scraper
  runScraper: async (payload: { propertyType: string; zipCodes?: string[]; filters?: Record<string, boolean> }) => {
    try {
      return await apiFetch('/api/scraper/run', { method: 'POST', body: payload });
    } catch (err: any) {
      // Fallback for backends that use /search instead of /run
      return await apiFetch('/api/scraper/search', { method: 'POST', body: payload });
    }
  },
  getScraperStatus: () => apiFetch('/api/scraper/status'),
  getListings: () => apiFetch('/api/scraper/listings'),

  // Messages
  listMessages: () => apiFetch('/api/messages'),
  sendMessage: (payload: any) => apiFetch('/api/messages/send', { method: 'POST', body: payload }),
  regenerateMessage: (payload: any) => apiFetch('/api/messages/regenerate', { method: 'POST', body: payload }),
  sendBatch: (payload: { propertyType: string; maxMessages: number }) =>
    apiFetch('/api/messages/send-batch', { method: 'POST', body: payload }),

  // Logs
  getLogs: () => apiFetch('/api/logs'),
  exportLogsToSheets: () => apiFetch('/api/logs/export-to-sheets', { method: 'POST' }),
};
