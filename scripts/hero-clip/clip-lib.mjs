import puppeteer from "puppeteer-core";

export const SIZE = Number(process.env.CLIP_SIZE || 560);
export const DPR = Number(process.env.CLIP_DPR || 2);

export async function launch() {
  return puppeteer.launch({
    executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
    protocolTimeout: 600000,
    args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist", `--window-size=${SIZE},${SIZE}`],
  });
}

/** Open /world full-bleed: hide page chrome, HUD and dev indicator. */
export async function openStage(browser, { speed = "1×", zoomSteps = 6 } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width: SIZE, height: SIZE, deviceScaleFactor: DPR });
  await page.goto("http://localhost:3000/world", { waitUntil: "load", timeout: 240000 });
  await page.waitForFunction(() => [...document.querySelectorAll("button")].some((x) => x.textContent?.trim() === "1×"), { timeout: 240000 });
  await page.addStyleTag({
    content: `
      header, aside, nextjs-portal, [data-nextjs-toast], h1, main > div > div:first-child { display: none !important; }
      .rounded-2xl:has(> div > div > canvas), .rounded-2xl:has(canvas) {
        position: fixed !important; inset: 0 !important; width: 100vw !important; height: 100vh !important;
        min-height: 0 !important; border: 0 !important; border-radius: 0 !important; z-index: 50 !important;
      }
      .pointer-events-none.absolute.inset-0.z-10 { display: none !important; } /* playback HUD */
      body::before, .orb { display: none !important; }
      /* Render HTML bubbles at the clip's display density */
      .world-bubble { zoom: ${Number(process.env.CLIP_UI_ZOOM || 1)}; }
    `,
  });
  await page.evaluate((s) => [...document.querySelectorAll("button")].find((x) => x.textContent?.trim() === s)?.click(), speed);
  await new Promise((r) => setTimeout(r, 1500));
  // Zoom in (orthographic zoom via OrbitControls wheel) while controls are enabled
  const box = await (await page.$("canvas")).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (let i = 0; i < zoomSteps; i++) {
    await page.mouse.wheel({ deltaY: -120 });
    await new Promise((r) => setTimeout(r, 60));
  }
  return page;
}

/** Select an agent from the (hidden) sidebar list and switch to follow cam. */
export async function follow(page, name) {
  await page.evaluate((n) => {
    const btn = [...document.querySelectorAll("button")].find((b) => (b.textContent || "").trim().startsWith(n));
    btn?.click();
  }, name);
  // Let React commit the selection before switching camera mode
  await new Promise((r) => setTimeout(r, 400));
  await page.evaluate(() => {
    [...document.querySelectorAll("button")].find((b) => (b.textContent || "").trim() === "Follow")?.click();
  });
}

export async function bubbles(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll("[data-agent]")]
      .filter((e) => getComputedStyle(e).opacity !== "0")
      .map((e) => ({ text: e.textContent || "", tone: e.querySelector(".world-bubble")?.className.match(/border-(\w+)-400/)?.[1] || "" }))
  );
}
