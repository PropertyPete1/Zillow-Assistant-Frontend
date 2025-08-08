import type { AppProps } from 'next/app';
import '@/styles/globals.css';
import { SettingsProvider } from '@/context/SettingsContext';
import { ToastProvider } from '@/components/Toast';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ToastProvider>
      <SettingsProvider>
        <Component {...pageProps} />
      </SettingsProvider>
    </ToastProvider>
  );
}


