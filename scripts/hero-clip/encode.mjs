// Encode recorded JPEG frames into a looping hero clip (WebM VP9 + MP4 H.264)
// using Chrome's own MediaRecorder: frames are redrawn onto a canvas at their
// original timestamps (cropped, faded at both ends) while the canvas stream
// is recorded. No ffmpeg needed.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { launch } from "./clip-lib.mjs";

const [framesDir, outDir, startS, endS, posterS] = process.argv.slice(2);
const crop = { x: 130, y: 110, w: 900, h: 900 };
const FADE = 0.35;
const meta = JSON.parse(fs.readFileSync(path.join(framesDir, "frames.json"), "utf8"));

const server = http.createServer((req, res) => {
  const f = path.join(framesDir, path.basename(req.url));
  if (!fs.existsSync(f)) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": "image/jpeg", "Access-Control-Allow-Origin": "*" });
  fs.createReadStream(f).pipe(res);
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await launch();
const page = await browser.newPage();
await page.goto(base + "none"); // same-origin page for fetches

async function encode(mime, bitrate) {
  return page.evaluate(
    async ({ meta, base, crop, start, end, mime, bitrate, FADE }) => {
      const frames = meta.filter((m) => m.t >= start && m.t <= end);
      // Pre-decode all frames so playback timing is exact
      const bitmaps = await Promise.all(
        frames.map(async (m) => createImageBitmap(await (await fetch(base + m.name)).blob()))
      );
      const canvas = Object.assign(document.createElement("canvas"), { width: crop.w, height: crop.h });
      const ctx = canvas.getContext("2d");
      const dur = end - start;
      const draw = (i, t) => {
        ctx.drawImage(bitmaps[i], crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);
        const a = Math.max(0, 1 - Math.min(t, dur - t) / FADE); // fade to page bg at both ends
        if (a > 0) {
          ctx.fillStyle = `rgba(5,5,7,${a})`;
          ctx.fillRect(0, 0, crop.w, crop.h);
        }
      };
      draw(0, 0);
      const stream = canvas.captureStream(30);
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bitrate });
      const chunks = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      const done = new Promise((r) => (rec.onstop = r));
      rec.start(250);
      const t0 = performance.now();
      await new Promise((resolve) => {
        const tick = () => {
          const t = (performance.now() - t0) / 1000;
          if (t >= dur) return resolve();
          let i = 0;
          while (i + 1 < frames.length && frames[i + 1].t - start <= t) i++;
          draw(i, t);
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      draw(frames.length - 1, dur);
      await new Promise((r) => setTimeout(r, 150));
      rec.stop();
      await done;
      const blob = new Blob(chunks, { type: mime });
      const buf = new Uint8Array(await blob.arrayBuffer());
      let s = "";
      for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      return btoa(s);
    },
    { meta, base, crop, start: +startS, end: +endS, mime, bitrate, FADE }
  );
}

async function poster(at) {
  return page.evaluate(
    async ({ meta, base, crop, at }) => {
      const m = meta.reduce((a, b) => (Math.abs(b.t - at) < Math.abs(a.t - at) ? b : a));
      const bmp = await createImageBitmap(await (await fetch(base + m.name)).blob());
      const c = Object.assign(document.createElement("canvas"), { width: crop.w, height: crop.h });
      c.getContext("2d").drawImage(bmp, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);
      const blob = await new Promise((r) => c.toBlob(r, "image/webp", 0.86));
      const buf = new Uint8Array(await blob.arrayBuffer());
      let s = "";
      for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      return btoa(s);
    },
    { meta, base, crop, at }
  );
}

fs.mkdirSync(outDir, { recursive: true });
for (const [file, mime, rate] of [
  ["hero-deal.webm", "video/webm;codecs=vp9", 1_900_000],
  ["hero-deal.mp4", "video/mp4;codecs=avc1", 1_300_000],
]) {
  const b64 = await encode(mime, rate);
  fs.writeFileSync(path.join(outDir, file), Buffer.from(b64, "base64"));
  console.log(file, (fs.statSync(path.join(outDir, file)).size / 1024).toFixed(0), "KB");
}
fs.writeFileSync(path.join(outDir, "hero-deal-poster.webp"), Buffer.from(await poster(+posterS), "base64"));
console.log("poster", (fs.statSync(path.join(outDir, "hero-deal-poster.webp")).size / 1024).toFixed(0), "KB");
await browser.close();
server.close();
