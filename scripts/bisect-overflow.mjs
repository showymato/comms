import { chromium } from "file:///C:/Users/kh491/OneDrive/Desktop/landings/nova/node_modules/playwright/index.mjs";
const [base, path] = [process.argv[2], process.argv[3]];
const b = await chromium.launch();
const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })).newPage();
await page.goto(base + path, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
console.log(await page.evaluate(() => {
  const root = document.querySelector("main .space-y-4");
  const base = document.documentElement.scrollWidth;
  const hits = [];
  for (const el of root.querySelectorAll("*")) {
    const prev = el.style.display;
    el.style.display = "none";
    if (document.documentElement.scrollWidth < base) hits.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 80)} :: ${(el.textContent || "").trim().slice(0, 30)}`);
    el.style.display = prev;
  }
  return `base=${base}\n` + hits.slice(0, 8).join("\n");
}));
await b.close();
