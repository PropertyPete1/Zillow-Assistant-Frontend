/*
  Smoke test for leads endpoints. Usage: ts-node scripts/smoke/leads_smoke.ts
*/
import fetch from 'node-fetch';

const BASE = process.env.BASE || 'https://zillow-assistant-backend.onrender.com';

async function main() {
  const fail = (step: string, err: any) => { console.error(`SMOKE FAIL @ ${step}:`, err?.message || err); process.exit(1); };

  try {
    // Health
    const h = await fetch(`${BASE}/api/leads/health`);
    const hj = await h.json();
    if (!hj.ok) throw new Error('health not ok');

    // Ingest 2 rows
    const rows = [
      { url: 'https://www.zillow.com/homedetails/SMOKE1', city: 'Austin', price: '$1000', status: 'queued' },
      { url: 'https://www.zillow.com/homedetails/SMOKE2', city: 'Austin', price: '$1200', status: 'queued' },
    ];
    const ing = await fetch(`${BASE}/api/leads/ingest`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows }) });
    const ingJ = await ing.json();
    if (!ing.ok || !ingJ.ok) throw new Error('ingest failed');

    // Next batch
    const nb = await fetch(`${BASE}/api/leads/next-batch?count=2`);
    const nbJ = await nb.json();
    if (!Array.isArray(nbJ) || nbJ.length < 1) throw new Error('next-batch empty');

    // Mark first as sent
    const first = nbJ[0];
    const mk = await fetch(`${BASE}/api/leads/mark`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: first.url, status: 'sent' }) });
    const mkJ = await mk.json();
    if (!mk.ok || !mkJ.ok) throw new Error('mark failed');

    // Next batch again
    const nb2 = await fetch(`${BASE}/api/leads/next-batch?count=2`);
    const nb2J = await nb2.json();
    if (!Array.isArray(nb2J)) throw new Error('next-batch 2 invalid');

    console.log('SMOKE OK');
  } catch (e: any) {
    fail('run', e);
  }
}

main();


