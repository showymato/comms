import { chromium } from "file:///C:/Users/kh491/OneDrive/Desktop/landings/nova/node_modules/playwright/index.mjs";
const BASE = process.argv[2] || "http://localhost:3277";
async function measure(label, prep) {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await p.goto(BASE, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(2500);
  if (prep) await p.evaluate(prep);
  await p.mouse.move(700, 400);
  const t = await p.evaluate(() => new Promise((res) => { const a = []; let last = performance.now(); const end = last + 3000; const tick = (n) => { a.push(n - last); last = n; n < end ? requestAnimationFrame(tick) : res(a); }; requestAnimationFrame(tick); }));
  const avg = t.reduce((x, y) => x + y, 0) / t.length;
  console.log(`${label}: ${t.length} frames, avg ${avg.toFixed(1)}ms (~${(1000 / avg).toFixed(0)}fps)`);
  await b.close();
}
await measure("with field   ", null);
await measure("field removed", () => document.querySelectorAll("canvas").forEach((c) => c.remove()));
