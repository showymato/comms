import { chromium } from "file:///C:/Users/kh491/OneDrive/Desktop/landings/nova/node_modules/playwright/index.mjs";
const b = await chromium.launch();
const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })).newPage();
await page.goto(process.argv[2] + process.argv[3], { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
console.log(await page.evaluate(() => {
  const sc = [...document.querySelectorAll(".overflow-x-auto")].find((e) => e.textContent.startsWith("RequirementPolicy"));
  const r = (e) => { const b = e.getBoundingClientRect(); return `${Math.round(b.left)}→${Math.round(b.right)} w=${Math.round(b.width)}`; };
  let out = `scroller ${r(sc)} cw=${sc.clientWidth} sw=${sc.scrollWidth} ox=${getComputedStyle(sc).overflowX}\n`;
  let p = sc.parentElement; let n = 0;
  while (p && n++ < 6) { out += `${p.tagName.toLowerCase()}.${String(p.className).slice(0, 50)} ${r(p)} disp=${getComputedStyle(p).display} minw=${getComputedStyle(p).minWidth}\n`; p = p.parentElement; }
  return out;
}));
await b.close();
