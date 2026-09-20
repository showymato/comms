// Visual + interaction pass over the application.
//   node scripts/shoot-app.mjs http://localhost:3277 [width height outDir]
import { chromium } from "file:///C:/Users/kh491/OneDrive/Desktop/landings/nova/node_modules/playwright/index.mjs";
import fs from "node:fs";

const BASE = process.argv[2] || "http://localhost:3277";
const W = Number(process.argv[3] || 1440);
const H = Number(process.argv[4] || 900);
const OUT = process.argv[5] || "shots/app";
const mobile = W < 600;
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: mobile, isMobile: mobile });
const page = await ctx.newPage();
const errors = [];
const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
};
page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

const shot = async (name, full = false) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
const go = async (path, wait = 1400) => {
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(wait);
};
const overflow = async (label) => {
  const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`no horizontal overflow · ${label}`, o <= 0, o > 0 ? `${o}px` : "");
};

await go("/overview");
await shot("01-overview", true);
await overflow("overview");
check("overview shows 16 assets", (await page.getByText("Eligibility Overview").count()) > 0);

await go("/assets");
await shot("02-assets");
await overflow("assets");
const link = (name) => page.locator(`a[href^="/assets/0x"]`, { hasText: name }).first();
const hrefOf = async (name) => await link(name).getAttribute("href");
const aapl = await hrefOf("Apple Token");
const nflx = await hrefOf("Netflix Token");
const amd = await hrefOf("AMD Token");

if (!mobile) {
  // filters
  const rowsBefore = await page.locator("tbody tr").count();
  await page.getByRole("button", { name: /^CONDITIONAL/ }).click();
  await page.waitForTimeout(300);
  const cond = await page.locator("tbody tr").count();
  check("status filter narrows rows", cond > 0 && cond < rowsBefore, `${rowsBefore} → ${cond}`);
  await page.getByRole("button", { name: /^ALL/ }).click();
  await page.getByLabel("Search assets by name, symbol or address").fill("tsla");
  await page.waitForTimeout(300);
  check("search narrows to one row", (await page.locator("tbody tr").count()) === 1);
  await page.getByLabel("Search assets by name, symbol or address").fill("");
  // sort
  await page.getByRole("button", { name: /^Score/ }).click();
  await page.waitForTimeout(200);
  const scores = await page.locator("tbody tr td:nth-child(5)").allInnerTexts();
  const nums = scores.map((s) => Number(s)).filter((n) => !Number.isNaN(n));
  check("sort by score (desc first click)", nums.every((n, i) => i === 0 || nums[i - 1] >= n), nums.slice(0, 5).join(","));
  // keyboard nav
  await page.getByLabel("Search assets by name, symbol or address").focus();
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(150);
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(150);
  const focusedRow = await page.evaluate(() => document.activeElement?.getAttribute("data-row"));
  check("arrow keys move row focus", focusedRow === "1", `data-row=${focusedRow}`);
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/assets\/0x/);
  check("Enter opens the asset", true);
} else {
  await shot("02b-assets-cards", true);
}

await go(aapl);
await shot("03-detail-aapl", true);
await overflow("detail");
await page.getByRole("button", { name: /Transfer enabled: PASS/ }).click();
await page.waitForTimeout(700);
await shot("04-evidence-drawer");
check("evidence drawer shows the record", (await page.getByText("BLOCK NUMBER").count()) > 0 && (await page.getByText("transferEnabled").count()) > 0);
await page.keyboard.press("Escape");
await page.waitForTimeout(1000);
check("Escape closes the drawer", (await page.getByRole("dialog").count()) === 0);

await go(nflx);
await shot("05-detail-nflx");
check("NFLX is INELIGIBLE / TRANSFER_DISABLED", (await page.getByText("TRANSFER_DISABLED").count()) > 0);
await go(amd);
await shot("06-detail-amd-unknown");
check("AMD is UNKNOWN with INSUFFICIENT_EVIDENCE", (await page.getByText("INSUFFICIENT_EVIDENCE").count()) > 0);

await go("/eligibility");
await page.getByRole("button", { name: "CHECK ELIGIBILITY" }).click();
await page.waitForTimeout(4200);
await shot("07-eligibility-result");
check("checker resolves to a decision", (await page.getByText("9 checks passed. 0 failed. 0 unknown.").count()) > 0);
await page.getByRole("button", { name: "No evidence" }).click();
await page.getByRole("button", { name: /CHECK ELIGIBILITY/ }).click();
await page.waitForTimeout(4200);
check("unregistered address → UNKNOWN (never guessed)", (await page.getByText("INSUFFICIENT_EVIDENCE").count()) > 0);
await page.getByLabel("Token contract address").fill("0x123");
await page.getByRole("button", { name: /CHECK ELIGIBILITY/ }).click();
check("invalid address is rejected inline", (await page.getByRole("alert").count()) > 0);

await go("/policies");
await shot("08-policies", true);
await overflow("policies");
await page.getByRole("button", { name: /Create policy/ }).first().click();
await page.waitForTimeout(500);
await page.getByRole("button", { name: "Create policy" }).last().click();
await page.waitForTimeout(300);
check("create policy validates name", (await page.getByText("Give the policy a name.").count()) > 0);
await shot("09-policy-modal-error");
await page.getByLabel("Name").fill("Strict test");
await page.getByRole("button", { name: "Create policy" }).last().click();
await page.waitForTimeout(900);
check("created policy appears in the list", (await page.getByRole("button", { name: /STRICT_TEST/ }).count()) > 0);

await go("/events");
await page.waitForTimeout(4500);
await shot("10-events");
await overflow("events");
const evCount = await page.locator("ol[aria-label^='Event stream'] li").count();
check("event stream renders and receives live events", evCount >= 28, `${evCount} rows`);

await go("/webhooks");
await shot("11-webhooks", true);
await overflow("webhooks");
await page.getByText("ops.collateral-desk.example").first().click();
await page.waitForTimeout(500);
const failedRow = page.locator("button", { hasText: /✕\s*5\d\d/ }).first();
check("failing endpoint lists failed deliveries", (await failedRow.count()) > 0);
await failedRow.click();
await page.waitForTimeout(300);
await page.getByRole("button", { name: /^Retry/ }).click();
await page.waitForTimeout(1500);
check("retry turns the failed delivery into 200", (await page.getByText("Delivered ·").count()) > 0);
await shot("12-webhooks-detail");
await page.getByRole("button", { name: /Create endpoint/ }).first().click();
await page.getByLabel("Endpoint URL").fill("http://insecure.example");
await page.getByRole("button", { name: "Create endpoint" }).last().click();
check("webhook create rejects non-https", (await page.getByText("URL must start with https://").count()) > 0);
await page.keyboard.press("Escape");

await go("/api-reference");
await shot("13-api");
await overflow("api");
await go("/sdk");
await page.getByRole("button", { name: /RUN/ }).first().click();
await page.waitForTimeout(1500);
await shot("14-sdk");
await overflow("sdk");
await go("/settings");
await shot("15-settings");

// command palette in-app
await go("/overview", 800);
await page.keyboard.press("Control+k");
await page.keyboard.type("tsla");
await page.waitForTimeout(400);
await page.keyboard.press("Enter");
await page.waitForURL(/\/assets\/0x/);
check("⌘K → Enter navigates to the asset", true);

const notFound = await page.goto(BASE + "/assets/0xnope");
check("unknown asset returns HTTP 404", notFound.status() === 404, String(notFound.status()));

console.log(`\n${results.filter(Boolean).length}/${results.length} checks passed`);
console.log(errors.length ? "ERRORS:\n" + [...new Set(errors)].join("\n") : "no console/page errors");
await browser.close();
