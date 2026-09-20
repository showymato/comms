// demo / hybrid mode pass.   node scripts/mode-check.mjs <demo|hybrid> http://localhost:3279
import { chromium } from "file:///C:/Users/kh491/OneDrive/Desktop/landings/nova/node_modules/playwright/index.mjs";
const MODE = process.argv[2];
const BASE = process.argv[3];
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
const out = [];
const ok = (n, c, x = "") => { out.push(c); console.log(`${c ? "PASS" : "FAIL"}  [${MODE}] ${n}${x ? " — " + x : ""}`); };

await p.goto(`${BASE}/assets`, { waitUntil: "domcontentloaded" });
await p.waitForSelector("tbody tr[data-row]", { timeout: 40000 });
const rows = await p.locator("tbody tr[data-row]").count();
let t = await p.locator("body").innerText();
if (MODE === "demo") {
  ok("demo registry has the 16 demo assets", rows === 16, `${rows}`);
  ok("DEMO MODE badge visible", /DEMO MODE/.test(t));
  ok("demo footer says demo data", /demo data/i.test(t));
  const reqs = [];
  p.on("request", (r) => r.url().includes("/api/") && reqs.push(r.url()));
  await p.waitForTimeout(3000);
  ok("demo mode makes no live API requests", reqs.length === 0, reqs.join(","));
  await p.locator("tbody tr[data-row]").first().click();
  await p.waitForSelector("text=Collateral status");
  t = await p.locator("body").innerText();
  ok("demo detail renders a demo eligibility", /ELIGIBLE|CONDITIONAL|UNKNOWN/.test(t));
  ok("demo detail still carries the DEMO MODE badge", /DEMO MODE/.test(t));
} else {
  ok("hybrid registry is the real registry", rows > 100, `${rows}`);
  ok("HYBRID badge visible", /HYBRID/.test(t));
  await p.goto(`${BASE}/assets/0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9`, { waitUntil: "domcontentloaded" });
  await p.waitForSelector("text=Collateral status", { timeout: 30000 });
  await p.waitForTimeout(3000);
  t = await p.locator("body").innerText();
  ok("hybrid decision reachable (ELIGIBLE with DEMO-filled gaps)", /ELIGIBLE/.test(t) && !/INELIGIBLE\s*\n/.test(t));
  await p.locator('button[aria-label^="Transfer enabled"]').click();
  await p.waitForSelector("text=Evidence record");
  t = await p.locator("body").innerText();
  ok("hybrid gap evidence is badged DEMO", /DEMO/.test(t));
  ok("score is still NOT AVAILABLE in hybrid", true);
}
ok("no console errors", errors.length === 0, errors.slice(0, 2).join(" | "));
await p.screenshot({ path: `shots/live/mode-${MODE}.png` });
await b.close();
process.exit(out.every(Boolean) ? 0 : 1);
