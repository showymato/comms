import { chromium } from "file:///C:/Users/kh491/OneDrive/Desktop/landings/nova/node_modules/playwright/index.mjs";
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await p.goto(process.argv[2], { waitUntil: "domcontentloaded" });
await p.waitForTimeout(6000);
const r = await p.evaluate(() => {
  const W = window.innerWidth; const out = [];
  document.querySelectorAll("body *").forEach((el) => { const r = el.getBoundingClientRect(); if (r.right > W + 0.5 && r.width > 0) out.push(el.tagName + "." + String(el.className).slice(0, 70) + " right=" + Math.round(r.right) + " w=" + Math.round(r.width)); });
  return { sw: document.documentElement.scrollWidth, W, out: out.slice(0, 12) };
});
console.log(JSON.stringify(r, null, 1));
await b.close();
