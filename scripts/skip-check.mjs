// The loader must never stand between a visitor and the page: a key press skips it; the wallet button and nav stay real.
import { chromium } from "file:///C:/Users/kh491/OneDrive/Desktop/landings/nova/node_modules/playwright/index.mjs";
const BASE = process.argv[2] || "http://localhost:3277";
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await p.goto(BASE, { waitUntil: "domcontentloaded" });
await p.waitForSelector(".intro-loader");
await p.waitForTimeout(350);
await p.keyboard.press("Space");
await p.waitForTimeout(700);
console.log("loader gone after key skip:", await p.evaluate(() => !document.querySelector(".intro-loader")));
console.log("h1 visible:", await p.evaluate(() => getComputedStyle(document.querySelector("h1 span span") ?? document.querySelector("h1")).opacity));
// client-side navigation back to / must not replay the loader
await p.click('a[href="/developers"]');
await p.waitForTimeout(800);
await p.click('a[aria-label="COMMS home"]');
await p.waitForTimeout(600);
console.log("no replay on SPA return:", await p.evaluate(() => !document.querySelector(".intro-loader")));
await b.close();
