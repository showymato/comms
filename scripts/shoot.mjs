// Screenshot helper: node scripts/shoot.mjs <base> <out-prefix> <width>x<height> path1 path2 ...
import { chromium } from "file:///C:/Users/kh491/OneDrive/Desktop/landings/nova/node_modules/playwright/index.mjs";
const [base, prefix, size, ...paths] = process.argv.slice(2);
const [w, h] = size.split("x").map(Number);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: w, height: h } });
const p = await ctx.newPage();
const errors = [];
p.on("pageerror", (e) => errors.push("pageerror: " + e.message));
p.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text().slice(0, 300)));
for (let path of paths) {
  if (path === "home") path = "/";
  await p.goto(base + path, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(3500);
  const name = path.replace(/[^a-z0-9]+/gi, "_") || "home";
  await p.screenshot({ path: `shots/${prefix}${name}.png`, fullPage: process.env.FULL === "1" });
  console.log("shot", path);
}
console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "no console errors");
await b.close();
