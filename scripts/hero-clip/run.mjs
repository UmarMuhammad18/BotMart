// Re-record the landing hero clip from the live 3D floor.
//   pnpm hero:clip
// Needs `pnpm dev` running on :3000 and Chrome installed (CHROME_PATH to override).
// Defaults reproduce the shipped clip: ThriftMerchant buys Headphones from BuyItBot.
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frames = path.join(os.tmpdir(), "botmart-hero-frames");
const out = path.resolve(here, "../../public/screens");

const agent = process.env.CLIP_AGENT || "ThriftMerchant";
const startText = process.env.CLIP_START || 'buy "Headphones"';
const endText = process.env.CLIP_END || "take it for £45";

const run = (file, args, env = {}) =>
  execFileSync(process.execPath, [path.join(here, file), ...args], {
    stdio: "inherit",
    env: { ...process.env, ...env },
  });

// Render at 1120px with 2x scene zoom + 2x HTML bubbles = a crisp 2x clip
run("record.mjs", [frames, agent, startText, endText, "26"], {
  CLIP_SIZE: "1120",
  CLIP_DPR: "1",
  CLIP_UI_ZOOM: "2",
});
// Trim (seconds into the recording), poster frame time
run("encode.mjs", [frames, out, "2.0", "15.4", "6.8"]);
