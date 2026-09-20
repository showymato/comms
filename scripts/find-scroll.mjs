import { chromium } from "file:///C:/Users/kh491/OneDrive/Desktop/landings/nova/node_modules/playwright/index.mjs";
const [base, path] = [process.argv[2], process.argv[3]];
const b = await chromium.launch();
const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })).newPage();
await page.goto(base + path, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
console.log(await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll("*")) {
    if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) out.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} sw=${el.scrollWidth} cw=${el.clientWidth} ox=${getComputedStyle(el).overflowX}`);
  }
  return out.slice(0, 15).join("\n") + `\nvv=${window.innerWidth} doc=${document.documentElement.scrollWidth}`;
}));
await b.close();
