export function assertEnv(): string {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base || !String(base).trim()) {
    const msg = 'NEXT_PUBLIC_API_URL is not set. Set it in .env.local or your hosting provider env.';
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.error('[ZillowAssistant] ENV ERROR:', msg);
    }
    throw new Error(msg);
  }
  return base as string;
}


