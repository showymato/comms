// Live-data pass: real registry/price/chain in the UI, plus failure injection.
//   node scripts/live-check.mjs http://localhost:3277 [outDir]
import { chromium } from "file:///C:/Users/kh491/OneDrive/Desktop/landings/nova/node_modules/playwright/index.mjs";
import fs from "node:fs";

const BASE = process.argv[2] || "http://localhost:3277";
const OUT = process.argv[3] || "shots/live";
fs.mkdirSync(OUT, { recursive: true });
const AAPL = "0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9";

const browser = await chromium.launch();
const results = [];
const ok = (name, cond, extra = "") => {
  results.push({ name, pass: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`);
};

async function fresh(opts = {}, width = 1440, height = 900) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  if (opts.block) await page.route(opts.block, (r) => r.abort());
  return { ctx, page, errors };
}

/* ── 1. asset registry ── */
{
  const { ctx, page, errors } = await fresh();
  await page.goto(`${BASE}/assets`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("tbody tr[data-row]", { timeout: 30000 });
  const rows = await page.locator("tbody tr[data-row]").count();
  ok("registry renders real rows", rows > 100, `${rows} rows`);
  const text = await page.locator("body").innerText();
  ok("registry shows AAPL and no DEMO tag", /AAPL/.test(text) && !/DEMO MODE/.test(text));
  ok("registry says LIVE", /LIVE/.test(text));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/assets.png` });
  ok("no console errors on /assets", errors.length === 0, errors.slice(0, 3).join(" | "));
  await ctx.close();
}

/* ── 2. asset detail (price + contract + evidence) ── */
{
  const { ctx, page, errors } = await fresh();
  await page.goto(`${BASE}/assets/${AAPL}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=Live price", { timeout: 30000 });
  await page.waitForSelector("text=Contract inspection");
  await page.waitForFunction(() => /paused\(\)[\s\S]{0,80}FALSE/i.test(document.body.innerText), null, { timeout: 30000 });
  const t = await page.locator("body").innerText();
  ok("detail shows a live USD price", /\$\d{2,4}\.\d{2}/.test(t));
  ok("detail labels price RAW UNDERLYING", /RAW UNDERLYING/.test(t));
  ok("detail shows onchain paused() = FALSE", /paused\(\)[\s\S]{0,80}FALSE/i.test(t));
  ok("detail shows a real block number", /\d{2},\d{3},\d{3}/.test(t));
  ok("eligibility is UNKNOWN (not faked)", /UNKNOWN/.test(t) && !/ELIGIBLE\s*\n?\s*\d checks passed/.test(t));
  ok("score is NOT AVAILABLE", /NOT AVAILABLE/.test(t));
  ok("Blockscout failure is stated, not hidden", /explorer unavailable|NOT VERIFIED|VERIFIED/i.test(t));
  await page.screenshot({ path: `${OUT}/detail.png`, fullPage: true });
  // evidence drawer for an UNKNOWN check
  await page.locator('button[aria-label^="Oracle healthy"]').click();
  await page.waitForSelector("text=REASON:");
  const drawer = await page.locator("body").innerText();
  ok("UNKNOWN evidence explains why", /REASON: No onchain oracle/.test(drawer));
  ok("confidence not invented", /NOT REPORTED/.test(drawer));
  await page.screenshot({ path: `${OUT}/evidence-unknown.png` });
  await page.keyboard.press("Escape");
  await page.locator('button[aria-label^="Token paused"]').click();
  await page.waitForSelector("text=Robinhood Chain");
  const d2 = await page.locator("body").innerText();
  ok("onchain evidence shows network + contract + block", /Robinhood Chain/.test(d2) && new RegExp(AAPL, "i").test(d2));
  await page.screenshot({ path: `${OUT}/evidence-onchain.png` });
  ok("no console errors on detail", errors.length === 0, errors.slice(0, 3).join(" | "));
  await ctx.close();
}

/* ── 3. overview / corporate actions / settings / eligibility / landing ── */
{
  const { ctx, page, errors } = await fresh();
  await page.goto(`${BASE}/overview`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=Eligibility coverage", { timeout: 30000 });
  await page.waitForTimeout(2500);
  const t = await page.locator("body").innerText();
  ok("overview reports coverage honestly", /\d+ \/ 19\d/.test(t));
  ok("overview has no fake hourly chart", !/last 24 hours/.test(t));
  await page.screenshot({ path: `${OUT}/overview.png` });

  await page.goto(`${BASE}/corporate-actions`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=CASH DIVIDEND", { timeout: 30000 });
  await page.locator("ul li button[aria-expanded]").first().click();
  await page.waitForSelector("text=API details (unmodified)");
  ok("corporate action opens with full record", true);
  await page.screenshot({ path: `${OUT}/corporate.png` });

  await page.goto(`${BASE}/settings`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=Robinhood Stock Token API", { timeout: 30000 });
  await page.waitForTimeout(2500);
  const s = await page.locator("body").innerText();
  ok("settings: keys not configured show NOT CONFIGURED", /NOT CONFIGURED/.test(s));
  ok("settings: no key material shown", !/apikey|sk_|••••••••[A-Za-z0-9]{4}/i.test(s));
  await page.screenshot({ path: `${OUT}/settings.png`, fullPage: true });

  await page.goto(`${BASE}/eligibility`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /CHECK ELIGIBILITY/ }).click();
  await page.waitForSelector("text=Collateral status, text=UNKNOWN", { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(7000);
  const e = await page.locator("body").innerText();
  ok("eligibility check resolves to UNKNOWN on live evidence", /UNKNOWN/.test(e));
  await page.screenshot({ path: `${OUT}/eligibility.png` });

  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);
  const l = await page.locator("body").innerText();
  ok("landing hero has live strip", /RH CHAIN[\s\S]{0,40}\d{2},\d{3},\d{3}/.test(l));
  ok("landing footer does not claim simulated-only", !/All assets, addresses and figures in this demo are simulated/.test(l));
  await page.screenshot({ path: `${OUT}/landing.png` });
  ok("no console errors across pages", errors.length === 0, errors.slice(0, 3).join(" | "));
  await ctx.close();
}

/* ── 4. failure injection: price API down ── */
{
  const { ctx, page } = await fresh({ block: /\/api\/prices/ });
  await page.goto(`${BASE}/assets/${AAPL}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=PRICE UNKNOWN", { timeout: 40000 });
  const t = await page.locator("body").innerText();
  ok("price API down → PRICE UNKNOWN, page still works", /PRICE UNKNOWN/.test(t) && /Collateral status/i.test(t));
  await page.screenshot({ path: `${OUT}/price-down.png` });
  await ctx.close();
}

/* ── 5. failure injection: everything down ── */
{
  const { ctx, page } = await fresh({ block: /\/api\/(assets|prices|chain|corporate)/ });
  await page.goto(`${BASE}/assets`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=LIVE DATA DEGRADED", { timeout: 40000 });
  ok("registry down → LIVE DATA DEGRADED with Retry", (await page.locator("text=Retry").count()) > 0);
  await page.screenshot({ path: `${OUT}/all-down.png` });
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);
  const l = await page.locator("body").innerText();
  ok("landing never claims SYSTEM OPERATIONAL when data is down", !/SYSTEM OPERATIONAL/.test(l));
  await ctx.close();
}

/* ── 6. mobile ── */
{
  const { ctx, page, errors } = await fresh({}, 390, 844);
  await page.goto(`${BASE}/assets/${AAPL}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=Live price", { timeout: 30000 });
  await page.waitForTimeout(2500);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok("mobile detail: no horizontal overflow", overflow <= 1, `overflow ${overflow}px`);
  await page.screenshot({ path: `${OUT}/mobile-detail.png` });
  await page.goto(`${BASE}/assets`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("ul[aria-label='Assets'] li", { timeout: 30000 });
  const o2 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok("mobile registry: no horizontal overflow", o2 <= 1, `overflow ${o2}px`);
  ok("mobile no console errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
