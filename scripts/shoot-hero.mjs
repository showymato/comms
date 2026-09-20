// Hero + field screenshot with a cursor path, plus frame-time sampling.
import { chromium } from "file:///C:/Users/kh491/OneDrive/Desktop/landings/nova/node_modules/playwright/index.mjs";
const BASE = process.argv[2] || "http://localhost:3277";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await p.goto(BASE, { waitUntil: "domcontentloaded" });
await p.waitForTimeout(2500);
await p.screenshot({ path: "shots/live/hero-rest.png" });
// sweep the cursor across the field
for (let i = 0; i <= 30; i++) {
  await p.mouse.move(300 + i * 18, 420 + Math.sin(i / 4) * 60);
  await p.waitForTimeout(16);
}
await p.waitForTimeout(600);
await p.screenshot({ path: "shots/live/hero-cursor.png" });
// frame pacing over 3 s with the cursor moving
const stats = await p.evaluate(
  () =>
    new Promise((res) => {
      const t = [];
      let last = performance.now();
      const end = last + 3000;
      const tick = (n) => {
        t.push(n - last);
        last = n;
        n < end ? requestAnimationFrame(tick) : res(t);
      };
      requestAnimationFrame(tick);
    }),
);
const avg = stats.reduce((a, c) => a + c, 0) / stats.length;
const p95 = [...stats].sort((a, c) => a - c)[Math.floor(stats.length * 0.95)];
console.log(`frames=${stats.length} avg=${avg.toFixed(1)}ms (~${(1000 / avg).toFixed(0)}fps) p95=${p95.toFixed(1)}ms`);
console.log("errors:", errors.length ? errors.slice(0, 3) : "none");
await p.evaluate(() => window.scrollTo(0, 600));
await p.waitForTimeout(700);
await p.screenshot({ path: "shots/live/nav-compact.png", clip: { x: 0, y: 0, width: 1440, height: 120 } });
await p.evaluate(() => window.scrollTo(0, 500));
await p.waitForTimeout(700);
await p.screenshot({ path: "shots/live/nav-expanded.png", clip: { x: 0, y: 0, width: 1440, height: 120 } });
await b.close();
