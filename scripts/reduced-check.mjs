// prefers-reduced-motion: no loader, hero visible immediately, sphere drawn statically, token interaction still works.
import { chromium } from "file:///C:/Users/kh491/OneDrive/Desktop/landings/nova/node_modules/playwright/index.mjs";
const BASE = process.argv[2] || "http://localhost:3277";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
const p = await ctx.newPage();
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
await p.goto(`${BASE}/?debug=1`, { waitUntil: "domcontentloaded" });
await p.waitForTimeout(900);
console.log("loader present:", await p.evaluate(() => !!document.querySelector(".intro-loader") && getComputedStyle(document.querySelector(".intro-loader")).display !== "none"));
await p.screenshot({ path: "shots/intro/reduced-900ms.png", caret: "initial" });
await p.waitForTimeout(2500);
const info = await p.evaluate(() => { const e = window.__sphere; const n = e && e.nodes.find((x) => x.label === "AAPL"); return { running: e ? e.raf !== 0 : null, aapl: n && { x: n.sx, y: n.sy } }; });
console.log("engine", JSON.stringify(info));
const box = await p.evaluate(() => document.querySelector("canvas").getBoundingClientRect().toJSON());
if (info.aapl) { await p.mouse.click(box.x + info.aapl.x, box.y + info.aapl.y); await p.waitForTimeout(700); }
await p.screenshot({ path: "shots/intro/reduced-select.png", caret: "initial" });
console.log("card:", await p.evaluate(() => !!document.querySelector('[aria-label="AAPL evidence"]')));
console.log("errors:", errors.length ? errors : "none");
await b.close();
