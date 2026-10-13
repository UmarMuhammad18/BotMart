"use client";

import type { SkyPhase, Weather } from "@/lib/world/options";
import type { Cue } from "@/lib/world/director";

/**
 * The village's sound, synthesised with Web Audio (no files to download):
 * a soft market murmur and breeze, birdsong by day, crickets at night, rain
 * when it rains, plus one-shots for footsteps, a coin chime on deals, a
 * dull "no deal" and a gavel for court rulings. Off by default; only starts
 * after the viewer turns it on (browsers require a gesture anyway).
 */
export class VillageSound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private murmur: GainNode | null = null;
  private rain: GainNode | null = null;
  private timers: number[] = [];
  private phase: SkyPhase = "day";
  private weather: Weather = "clear";

  get running() {
    return this.ctx?.state === "running";
  }

  async start() {
    if (!this.ctx) this.build();
    await this.ctx!.resume();
    this.fade(this.master!, 0.9, 1.2);
    this.schedule();
  }

  stop() {
    for (const t of this.timers) window.clearTimeout(t);
    this.timers = [];
    if (!this.ctx || !this.master) return;
    this.fade(this.master, 0, 0.4);
    const ctx = this.ctx;
    window.setTimeout(() => void ctx.suspend(), 500);
  }

  dispose() {
    this.stop();
    void this.ctx?.close();
    this.ctx = null;
  }

  setScene(phase: SkyPhase, weather: Weather) {
    this.phase = phase;
    this.weather = weather;
    if (!this.ctx || !this.murmur || !this.rain) return;
    this.fade(this.murmur, phase === "night" ? 0.05 : 0.14, 2);
    this.fade(this.rain, weather === "rain" ? 0.32 : 0, 2);
  }

  cue(c: Cue) {
    if (!this.running) return;
    if (c === "deal") this.chime();
    else if (c === "walk") this.thud(160, 0.18);
    else if (c === "gavel") this.gavel();
    else if (c === "step") this.steps(5);
  }

  // ── graph ─────────────────────────────────────────────

  private build() {
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);

    // Murmur + breeze: brown noise through a gentle band-pass that drifts
    const noise = this.noiseBuffer(4, "brown");
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 420;
    band.Q.value = 0.7;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 160;
    lfo.connect(lfoGain).connect(band.frequency);
    this.murmur = ctx.createGain();
    this.murmur.gain.value = 0;
    src.connect(band).connect(this.murmur).connect(this.master);
    src.start();
    lfo.start();

    // Rain: white noise, high-passed, with a little low rumble
    const rainSrc = ctx.createBufferSource();
    rainSrc.buffer = this.noiseBuffer(3, "white");
    rainSrc.loop = true;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 900;
    this.rain = ctx.createGain();
    this.rain.gain.value = 0;
    rainSrc.connect(hp).connect(this.rain).connect(this.master);
    rainSrc.start();

    this.setScene(this.phase, this.weather);
  }

  private noiseBuffer(seconds: number, kind: "white" | "brown") {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === "white") data[i] = w * 0.5;
      else {
        last = (last + 0.02 * w) / 1.02;
        data[i] = last * 3.5;
      }
    }
    return buf;
  }

  private fade(g: GainNode, to: number, seconds: number) {
    const ctx = this.ctx!;
    g.gain.cancelScheduledValues(ctx.currentTime);
    g.gain.setTargetAtTime(to, ctx.currentTime, seconds / 3);
  }

  // ── ambience loop ─────────────────────────────────────

  private schedule() {
    for (const t of this.timers) window.clearTimeout(t);
    this.timers = [];
    const loop = () => {
      if (!this.running) return;
      if (this.weather !== "rain") {
        if (this.phase === "night") this.crickets();
        else this.bird();
      }
      this.timers.push(window.setTimeout(loop, 1800 + Math.random() * 3800));
    };
    this.timers.push(window.setTimeout(loop, 600));
  }

  private tone(freq: number, at: number, dur: number, gain: number, type: OscillatorType = "sine", glideTo?: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, at);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, at + dur);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(gain, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(this.master!);
    o.start(at);
    o.stop(at + dur + 0.05);
  }

  private bird() {
    const t = this.ctx!.currentTime;
    const base = 2200 + Math.random() * 1600;
    const notes = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < notes; i++) {
      const f = base * (0.9 + Math.random() * 0.25);
      this.tone(f, t + i * 0.11, 0.09, 0.035, "sine", f * (1.15 + Math.random() * 0.3));
    }
  }

  private crickets() {
    const t = this.ctx!.currentTime;
    for (let i = 0; i < 6; i++) this.tone(4300, t + i * 0.06, 0.035, 0.018, "triangle");
  }

  private chime() {
    const t = this.ctx!.currentTime;
    [1046.5, 1318.5, 1568].forEach((f, i) => this.tone(f, t + i * 0.09, 0.9, 0.09, "sine"));
    this.tone(2093, t + 0.27, 0.6, 0.03, "sine");
  }

  private thud(freq: number, gain: number, at?: number) {
    const t = at ?? this.ctx!.currentTime;
    this.tone(freq, t, 0.25, gain, "sine", freq * 0.5);
  }

  private gavel() {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const at = t + i * 0.32;
      this.thud(220, 0.32, at);
      // The wooden click on top
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer(0.05, "white");
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1800;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.5, at);
      g.gain.exponentialRampToValueAtTime(0.001, at + 0.05);
      src.connect(bp).connect(g).connect(this.master!);
      src.start(at);
    }
  }

  private steps(n: number) {
    const t = this.ctx!.currentTime;
    for (let i = 0; i < n; i++) this.thud(95 + Math.random() * 20, 0.06, t + i * 0.34 + Math.random() * 0.04);
  }
}
