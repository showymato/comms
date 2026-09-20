// Opens the RainbowKit connect modal and reports what it offers.
import { chromium } from "file:///C:/Users/kh491/OneDrive/Desktop/landings/nova/node_modules/playwright/index.mjs";
const base = process.argv[2] || "http://localhost:3277";
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
p.on("pageerror", (e) => errors.push(e.message.slice(0, 200)));
await p.goto(base + "/", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(3000);
await p.getByRole("button", { name: /connect wallet/i }).first().click();
await p.waitForTimeout(1200);
await p.screenshot({ path: "shots/wallet-modal.png" });
const text = await p.locator("[data-rk]").innerText().catch(() => "(no modal)");
console.log(text.replace(/\n+/g, " | ").slice(0, 400));
console.log(errors.length ? "ERRORS " + errors.join("\n") : "no page errors");
await b.close();
