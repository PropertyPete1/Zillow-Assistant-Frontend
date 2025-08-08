'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

const nav = [
  { href: '/', label: '🏠 Dashboard' },
  { href: '/scraper', label: '🔍 Scraper' },
  { href: '/messages', label: '📨 Messages' },
  { href: '/logs', label: '🗂️ Logs' },
  { href: '/settings', label: '⚙️ Settings' },
  { href: '/test', label: '🧪 Test Mode' },
  { href: '/analytics', label: '📊 Analytics' },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="min-h-screen bg-[#050910] text-white flex">
      <aside className="w-64 hidden md:block bg-black/40 border-r border-white/10">
        <div className="p-4 text-lg font-semibold">Zillow Assistant</div>
        <nav className="grid gap-1 px-2">
          {nav.map(n => (
            <Link
              key={n.href}
              href={n.href}
              className={`px-3 py-2 rounded hover:bg-white/10 transition ${
                path === n.href ? 'bg-white/10 ring-1 ring-white/20' : ''
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}


