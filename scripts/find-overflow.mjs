// Lists elements that extend past the viewport's right edge.
//   node scripts/find-overflow.mjs http://localhost:3277 /policies [width]
import { chromium } from "file:///C:/Users/kh491/OneDrive/Desktop/landings/nova/node_modules/playwright/index.mjs";

const [base, path, w] = [process.argv[2], process.argv[3], Number(process.argv[4] || 390)];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: w, height: 844 }, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
await page.goto(base + path, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
const rows = await page.evaluate((VW) => {
  const vw = VW;
  const out = [];
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.right <= vw + 1) continue;
    // skip anything clipped by a scroll/overflow-hidden ancestor
    let p = el.parentElement, clipped = false;
    while (p && p !== document.body) {
      const o = getComputedStyle(p);
      if (/(auto|scroll|hidden|clip)/.test(o.overflowX)) { const pr = p.getBoundingClientRect(); if (pr.right <= vw + 1) { clipped = true; break; } }
      p = p.parentElement;
    }
    if (clipped) continue;
    out.push({ tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 90), right: Math.round(r.right), w: Math.round(r.width), text: (el.textContent || "").trim().slice(0, 30) });
  }
  return out.slice(0, 14);
}, Number(process.argv[5] || w));
console.table(rows);
await browser.close();
