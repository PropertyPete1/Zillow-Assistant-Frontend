import type { AppProps } from 'next/app';
import '@/styles/globals.css';
import { SettingsProvider } from '@/context/SettingsContext';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SettingsProvider>
      <Component {...pageProps} />
    </SettingsProvider>
  );
}


