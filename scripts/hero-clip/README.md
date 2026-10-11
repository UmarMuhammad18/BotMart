# Hero clip

The landing hero plays `public/screens/hero-deal.{webm,mp4}` with
`hero-deal-poster.webp` as its poster. They are recorded from the real 3D floor,
not animated by hand.

```bash
pnpm dev          # in another terminal
pnpm hero:clip
```

How it works:

1. `record.mjs` opens `/world` in GPU-accelerated headless Chrome, hides the page
   chrome, zooms in, follows one agent and streams frames over the DevTools
   screencast from a few seconds before that agent's first offer until the deal
   burst has played.
2. `encode.mjs` redraws those frames onto a canvas at their original timing
   (cropped, with a short fade at each end so the loop is seamless) and records
   it with Chrome's MediaRecorder: WebM/VP9 plus MP4/H.264 for Safari. No ffmpeg.

Re-record whenever the world's visuals change. To film a different deal, pick
one that ends in an accepted offer and set `CLIP_AGENT`, `CLIP_START` and
`CLIP_END` (text from the first and accepting bubbles), then update the
`aria-label` and caption in `src/components/landing/Hero.tsx` to match.
