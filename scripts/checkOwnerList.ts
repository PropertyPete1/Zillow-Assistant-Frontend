import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-extra";
import Stealth from "puppeteer-extra-plugin-stealth";

puppeteer.use(Stealth());

type Result = {
  zpid?: string;
  url: string;
  owner: boolean;
  ownerName?: string | null;
  note?: string;
};

function sleep(ms: number) {
  return new Promise(res => setTimeout(res, ms));
}

function extractZpid(u: string): string | undefined {
  const m = u.match(/\/(\d+)_zpid/);
  return m?.[1];
}

async function openViaDDG(page: any, targetUrl: string) {
  const zpid = extractZpid(targetUrl);
  const q = zpid
    ? `site:zillow.com/homedetails ${zpid}`
    : `site:zillow.com/homedetails ${targetUrl}`;

  await page.goto(`https://duckduckgo.com/?q=${encodeURIComponent(q)}`, {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });

  // click first Zillow homedetails result (robust selectors)
  const selectors = [
    'a.result__a[href*="zillow.com"][href*="/homedetails/"]',
    'a[data-testid="result-title-a"][href*="zillow.com"][href*="/homedetails/"]'
  ];

  let href: string | null = null;
  for (const sel of selectors) {
    try {
      await page.waitForSelector(sel, { timeout: 12000 });
      href = await page.$eval(sel, (a: any) => a.href as string);
      await Promise.all([
        page.waitForNavigation({ waitUntil: "networkidle2", timeout: 45000 }),
        page.click(sel),
      ]);
      break;
    } catch { /* try next selector */ }
  }
  if (!href) throw new Error("no ddg result link found");
  return href;
}

async function detectOwnerAndName(page: any): Promise<{ owner: boolean; ownerName?: string | null }> {
  await sleep(1200);

  // dismiss overlays best-effort
  const clicks = [
    '[data-testid="close"]',
    '[aria-label="Close"]',
    'button[aria-label*="Close"]',
    'button:has(svg[aria-label="Close"])',
    'button[aria-label="dismiss"]',
    '#onetrust-accept-btn-handler',
  ];
  for (const sel of clicks) {
    try {
      const el = await page.$(sel);
      if (el) await el.click().catch(() => {});
    } catch {}
  }

  // quick text sweep
  const bodyText = (await page.evaluate(() => document.body.innerText)).toLowerCase();
  const owner = bodyText.includes("listed by property owner");

  // try to pull owner name nearby (fallback heuristics)
  let ownerName: string | null = null;
  try {
    ownerName = await page.evaluate(() => {
      const candidates = Array.from(document.querySelectorAll("*"))
        .filter((el) => /owner|listed by property owner/i.test(el.textContent || ""))
        .slice(0, 10);

      for (const el of candidates) {
        const parent = el.parentElement;
        if (!parent) continue;
        const text = parent.textContent || "";
        const m = text.match(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})\b/);
        if (m && m[1] && m[1].length <= 40) return m[1];
      }
      return null;
    });
  } catch {}

  return { owner, ownerName: ownerName || null };
}

async function main() {
  // read URLs from stdin JSON
  const chunks: Buffer[] = [];
  for await (const c of process.stdin) chunks.push(c as Buffer);
  const input = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : [];
  const urls: string[] = (input || []).filter((u: string) => typeof u === "string");

  const filtered = urls
    .filter((u) => u.includes("/homedetails/")) // drop /b/building etc
    .slice(0, 40);

  if (!filtered.length) {
    console.error("No homedetails URLs provided.");
    process.exit(2);
  }

  const execPath = await chromium.executablePath();
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: execPath || undefined, // fallback to local Chrome
    args: [
      ...(chromium.args || []),
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage"
    ],
    defaultViewport: { width: 1280, height: 900 },
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36"
    );

    const out: Result[] = [];
    for (const url of filtered) {
      const zpid = extractZpid(url);
      const result: Result = { url, zpid, owner: false };

      try {
        const landed = await openViaDDG(page, url);
        if (zpid && !landed.includes(zpid)) {
          result.note = "landed different zpid";
        }

        const { owner, ownerName } = await detectOwnerAndName(page);
        result.owner = owner;
        result.ownerName = ownerName ?? undefined;

        // JSON fallback for owner detection
        try {
          const j = await page.evaluate(() => {
            const el = document.querySelector('#__NEXT_DATA__');
            if (!el?.textContent) return null;
            try { return JSON.parse(el.textContent); } catch { return null; }
          });
          if (j) {
            const txt = JSON.stringify(j).toLowerCase();
            if (!result.owner && /listed by property owner|frbo|for rent by owner/.test(txt)) {
              result.owner = true;
            }
            const nameMatch = txt.match(/"ownerName"\s*:\s*"([^"]{3,60})"/) || txt.match(/"contactName"\s*:\s*"([^"]{3,60})"/);
            if (!result.ownerName && nameMatch) result.ownerName = nameMatch[1];
          }
        } catch {}
      } catch (e: any) {
        result.note = `error: ${e?.message || e}`;
      }

      out.push(result);
      await sleep(1500 + Math.floor(Math.random() * 1000));
    }

    console.log(JSON.stringify(out, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-extra";
import Stealth from "puppeteer-extra-plugin-stealth";

puppeteer.use(Stealth());

type Result = {
  zpid?: string;
  url: string;
  owner: boolean;
  ownerName?: string | null;
  note?: string;
};

function sleep(ms: number) {
  return new Promise(res => setTimeout(res, ms));
}

function extractZpid(u: string): string | undefined {
  const m = u.match(/\/(\d+)_zpid/);
  return m?.[1];
}

async function openViaDDG(page: any, targetUrl: string) {
  const zpid = extractZpid(targetUrl);
  const q = zpid
    ? `site:zillow.com/homedetails ${zpid}`
    : `site:zillow.com/homedetails ${targetUrl}`;

  await page.goto(`https://duckduckgo.com/?q=${encodeURIComponent(q)}`, {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });

  // click first Zillow homedetails result
  const linkSel = 'a.result__a[href*="zillow.com"][href*="/homedetails/"]';
  await page.waitForSelector(linkSel, { timeout: 15000 });
  const href = await page.$eval(linkSel, (a: any) => a.href as string);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 45000 }),
    page.click(linkSel),
  ]);
  return href;
}

async function detectOwnerAndName(page: any): Promise<{ owner: boolean; ownerName?: string | null }> {
  await sleep(1200);

  // dismiss overlays best‑effort
  const clicks = [
    '[data-testid="close"]',
    '[aria-label="Close"]',
    'button[aria-label*="Close"]',
    'button:has(svg[aria-label="Close"])',
    'button[aria-label="dismiss"]',
    '#onetrust-accept-btn-handler',
  ];
  for (const sel of clicks) {
    try {
      const el = await page.$(sel);
      if (el) await el.click().catch(() => {});
    } catch {}
  }

  // quick text sweep
  const bodyText = (await page.evaluate(() => document.body.innerText)).toLowerCase();
  const owner = bodyText.includes("listed by property owner");

  // try to pull owner name nearby (fallback heuristics)
  let ownerName: string | null = null;
  try {
    ownerName = await page.evaluate(() => {
      // common card region near contact
      const candidates = Array.from(document.querySelectorAll("*"))
        .filter((el) => /owner|listed by property owner/i.test(el.textContent || ""))
        .slice(0, 10);

      // scan siblings for a name‑like string (simple heuristic)
      for (const el of candidates) {
        const parent = el.parentElement;
        if (!parent) continue;
        const text = parent.textContent || "";
        // crude name capture (Title Case words, 2–3 tokens)
        const m = text.match(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})\b/);
        if (m && m[1] && m[1].length <= 40) return m[1];
      }
      return null;
    });
  } catch {}

  return { owner, ownerName: ownerName || null };
}

async function main() {
  // read URLs from stdin JSON
  const chunks: Buffer[] = [];
  for await (const c of process.stdin) chunks.push(c as Buffer);
  const input = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : [];
  const urls: string[] = (input || []).filter((u: string) => typeof u === "string");

  const filtered = urls
    .filter((u) => u.includes("/homedetails/")) // drop /b/building etc
    .slice(0, 40);

  if (!filtered.length) {
    console.error("No homedetails URLs provided.");
    process.exit(2);
  }

  const execPath = await chromium.executablePath();
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: execPath,
    args: [...chromium.args, "--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    defaultViewport: { width: 1280, height: 900 },
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36"
    );

    const out: Result[] = [];
    for (const url of filtered) {
      const zpid = extractZpid(url);
      const result: Result = { url, zpid, owner: false };

      try {
        const landed = await openViaDDG(page, url);
        // verify we’re on the intended zpid if available
        if (zpid && !landed.includes(zpid)) {
          result.note = "landed different zpid";
        }

        const { owner, ownerName } = await detectOwnerAndName(page);
        result.owner = owner;
        result.ownerName = ownerName ?? undefined;
      } catch (e: any) {
        result.note = `error: ${e?.message || e}`;
      }

      out.push(result);
      // polite pacing
      await sleep(1500 + Math.floor(Math.random() * 1000));
    }

    console.log(JSON.stringify(out, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


