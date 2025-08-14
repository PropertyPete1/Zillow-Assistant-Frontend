/**
 * Stealth Zillow Scraper via DuckDuckGo
 * 1. Search DuckDuckGo for Zillow listings
 * 2. Pick the first Zillow URL
 * 3. Extract property data from __NEXT_DATA__
 * 4. Output results to console
 * 5. Auto-delete temp file
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const city = process.env.ZILLOW_CITY || 'Austin, TX';
const searchQuery = `site:zillow.com "${city}" for rent by owner`;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempFile = path.join(__dirname, 'zillowRaw.html');

(async () => {
  console.log(`🔍 Searching DuckDuckGo for: ${searchQuery}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Step 1: Search DuckDuckGo
  await page.goto(`https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}`, {
    waitUntil: 'networkidle2',
    timeout: 0,
  });

  // Step 2: Grab first Zillow link
  const firstLink = await page.evaluate(() => {
    const a1 = document.querySelector("a.result__a[href*='zillow.com']") as HTMLAnchorElement | null;
    if (a1 && a1.href) return a1.href;
    const a2 = document.querySelector("a[data-testid='result-title-a'][href*='zillow.com']") as HTMLAnchorElement | null;
    if (a2 && a2.href) return a2.href;
    const a3 = document.querySelector('#links a[href*="zillow.com"]') as HTMLAnchorElement | null;
    return a3 ? a3.href : null;
  });

  if (!firstLink) {
    console.error('❌ No Zillow links found in DuckDuckGo results.');
    await browser.close();
    return;
  }

  console.log(`➡ Visiting Zillow link: ${firstLink}`);

  // Step 3: Visit Zillow page
  await page.goto(firstLink, { waitUntil: 'networkidle2', timeout: 0 });

  const html = await page.content();
  fs.writeFileSync(tempFile, html);
  console.log(`📄 HTML saved temporarily: ${tempFile}`);

  // Step 4: Extract __NEXT_DATA__ JSON
  const jsonData = await page.evaluate(() => {
    const script = document.querySelector('#__NEXT_DATA__');
    return script ? script.textContent : null;
  });

  if (!jsonData) {
    console.error('❌ No __NEXT_DATA__ found — Zillow may have changed structure.');
  } else {
    try {
      const parsed = JSON.parse(jsonData as string);
      const homes =
        parsed?.props?.pageProps?.searchPageState?.cat1?.searchResults?.listResults || [];
      console.log(`✅ Found ${homes.length} homes:`);
      homes.forEach((h: any, i: number) => {
        const url = h.detailUrl ? `https://www.zillow.com${h.detailUrl}` : 'No URL';
        console.log(`${i + 1}. ${h.address} — ${h.price} — ${url}`);
      });
    } catch (err) {
      console.error('❌ Failed to parse __NEXT_DATA__ JSON:', err);
    }
  }

  await browser.close();

  // Step 5: Cleanup
  try { fs.unlinkSync(tempFile); } catch {}
  console.log('🗑 Temp file deleted. Done!');
})();


