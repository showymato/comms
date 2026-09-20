// Scroll tour: node scripts/tour.mjs <url> <prefix> <WxH> <stepPx> <maxShots>
import { chromium } from "file:///C:/Users/kh491/OneDrive/Desktop/landings/nova/node_modules/playwright/index.mjs";
const [url, prefix, size, step, max] = process.argv.slice(2);
const [w, h] = size.split("x").map(Number);
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })).newPage();
const errors = [];
p.on("pageerror", (e) => errors.push("pageerror: " + e.message.slice(0, 300)));
p.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text().slice(0, 300)));
await p.goto(url, { waitUntil: "domcontentloaded" });
await p.waitForTimeout(3000);
const total = await p.evaluate(() => document.documentElement.scrollHeight);
console.log("height", total);
let n = 0;
for (let y = 0; y < total && n < Number(max); y += Number(step), n++) {
  await p.evaluate((yy) => window.scrollTo(0, yy), y);
  await p.waitForTimeout(900);
  await p.screenshot({ path: `shots/${prefix}${String(n).padStart(2, "0")}.png` });
}
console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "no console errors", n, "shots");
await b.close();
