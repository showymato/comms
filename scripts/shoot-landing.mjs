// Visual + error pass over the landing page.
//   node scripts/shoot-landing.mjs http://localhost:3277 [width height outDir]
import { chromium } from "file:///C:/Users/kh491/OneDrive/Desktop/landings/nova/node_modules/playwright/index.mjs";
import fs from "node:fs";

const BASE = process.argv[2] || "http://localhost:3277";
const W = Number(process.argv[3] || 1440);
const H = Number(process.argv[4] || 900);
const OUT = process.argv[5] || "shots/landing";
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(2200);
await page.screenshot({ path: `${OUT}/01-hero.png` });

// hover engine node
const node = page.getByRole("button", { name: /Asset State/i }).first();
if (await node.count()) {
  await node.hover();
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/02-hero-hover.png` });
}

const jump = async (sel, name, offset = 0, wait = 900) => {
  await page.evaluate(([s, o]) => {
    const el = document.querySelector(s);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + o, behavior: 'instant' });
  }, [sel, offset]);
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${OUT}/${name}.png` });
};

await page.evaluate(() => window.scrollTo({ top: 450, behavior: 'instant' }));
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/03-hero-scrolled.png` });

await jump("#conditional", "04-matrix", 80);
const vh = H;
for (const [i, f] of [0.05, 0.3, 0.5, 0.7, 0.92].entries()) {
  await jump("#engine", `05-story-${i}`, f * (5.6 * vh - vh), 900);
}
await jump("#check", "06-check-idle", 0);
await page.getByRole("button", { name: /CHECK ELIGIBILITY/ }).click();
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/07-check-running.png` });
await page.waitForTimeout(3200);
await page.screenshot({ path: `${OUT}/08-check-result.png` });
await jump("#evidence", "09-evidence", 60);
await jump("#realtime", "10-realtime", 60, 6200);
await jump("#policy", "11-policy", 60);
await jump("#developers", "12-dev", 60);
await page.getByRole("button", { name: /RUN/ }).first().click();
await page.waitForTimeout(1800);
await page.screenshot({ path: `${OUT}/13-dev-run.png` });
await jump("#architecture", "14-arch", 80, 1200);
await jump("#protocols", "15-protocols", 80);
await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/16-final.png` });

// command palette
await page.keyboard.press("Control+k");
await page.waitForTimeout(500);
await page.keyboard.type("aapl");
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/17-palette.png` });

const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
console.log("horizontal overflow px:", overflow);
console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "no console/page errors");
await browser.close();
