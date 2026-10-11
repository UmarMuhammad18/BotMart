import fs from "node:fs";
import { launch, openStage, follow, bubbles, SIZE, DPR } from "./clip-lib.mjs";

const [outDir, agent, startText, endText, zoom] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const browser = await launch();
const page = await openStage(browser, { zoomSteps: Number(zoom || 10) });
await follow(page, agent);

const cdp = await page.createCDPSession();
let frames = []; // {ts, data}
let state = "preroll"; // preroll -> rolling buffer, live -> keep, done
let stopAt = Infinity;
cdp.on("Page.screencastFrame", async (f) => {
  cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
  if (state === "done") return;
  const ts = f.metadata.timestamp;
  frames.push({ ts, data: f.data });
  if (state === "preroll") frames = frames.filter((x) => ts - x.ts <= 5.0);
  if (ts >= stopAt) state = "done";
});
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, everyNthFrame: 1, maxWidth: SIZE * DPR, maxHeight: SIZE * DPR });

const t0 = Date.now();
let sawEnd = false;
while (Date.now() - t0 < 240000 && state !== "done") {
  const b = await bubbles(page);
  if (state === "preroll" && b.some((x) => x.text.includes(startText))) {
    state = "live";
    console.log("start trigger at", ((Date.now() - t0) / 1000).toFixed(1), "s");
  }
  if (state === "live" && !sawEnd && b.some((x) => x.text.includes(endText))) {
    sawEnd = true;
    const last = frames[frames.length - 1]?.ts ?? 0;
    stopAt = last + 5.0;
    console.log("end trigger at", ((Date.now() - t0) / 1000).toFixed(1), "s");
  }
  await new Promise((r) => setTimeout(r, 120));
}
await cdp.send("Page.stopScreencast");
const base = frames[0].ts;
const meta = frames.map((f, i) => {
  const name = `f${String(i).padStart(5, "0")}.jpg`;
  fs.writeFileSync(`${outDir}/${name}`, Buffer.from(f.data, "base64"));
  return { name, t: +(f.ts - base).toFixed(4) };
});
fs.writeFileSync(`${outDir}/frames.json`, JSON.stringify(meta));
const dur = meta.at(-1).t;
console.log("frames", meta.length, "duration", dur.toFixed(2), "s", "avg fps", (meta.length / dur).toFixed(1));
await browser.close();
