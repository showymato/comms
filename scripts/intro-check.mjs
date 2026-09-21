// Loader → hero sequence: timed frames, then the first-hover "wake", then hover/click on a token.
// usage: node scripts/intro-check.mjs [base] [WxH]   (MSYS_NO_PATHCONV=1 not needed — no path args)
import { chromium } from "file:///C:/Users/kh491/OneDrive/Desktop/landings/nova/node_modules/playwright/index.mjs";
const BASE = process.argv[2] || "http://localhost:3277";
const [W, H] = (process.argv[3] || "1440x900").split("x").map(Number);
const tag = `${W}x${H}`;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: W < 700, isMobile: W < 700 });
const p = await ctx.newPage();
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
const t0 = Date.now();
await p.goto(BASE, { waitUntil: "commit" });
for (const ms of (process.env.FRAMES || "120,380,700,1000,1300,1600,2000,3200").split(",").map(Number)) {
  const wait = ms - (Date.now() - t0);
  if (wait > 0) await p.waitForTimeout(wait);
  await p.screenshot({ path: `shots/intro/${tag}-t${String(ms).padStart(4, "0")}.png`, caret: "initial" });
}
const phase = await p.evaluate(() => ({
  loader: !!document.querySelector(".intro-loader"),
  navLogoOpacity: getComputedStyle(document.querySelector("[data-nav-logo]")).opacity,
  h1: document.querySelector("h1")?.getBoundingClientRect().toJSON(),
}));
console.log("after 3.2s:", JSON.stringify(phase));
if (W >= 700) {
  const stage = await p.evaluate(() => document.querySelector("canvas")?.getBoundingClientRect().toJSON());
  await p.mouse.move(stage.x + stage.width * 0.5, stage.y + stage.height * 0.5, { steps: 12 });
  await p.waitForTimeout(500);
  await p.screenshot({ path: `shots/intro/${tag}-wake.png` });
  await p.waitForTimeout(1600);
  await p.screenshot({ path: `shots/intro/${tag}-settled.png` });
}
console.log("errors:", errors.length ? errors.slice(0, 4) : "none");
await b.close();
