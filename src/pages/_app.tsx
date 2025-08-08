import type { AppProps } from 'next/app';
import '@/styles/globals.css';
import { SettingsProvider } from '@/context/SettingsContext';
import { Toaster } from 'react-hot-toast';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SettingsProvider>
      <Toaster position="top-right" />
      <Component {...pageProps} />
    </SettingsProvider>
  );
}


