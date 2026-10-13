import type { WorldBeat } from "@/lib/types";
import { courtSpot } from "@/lib/world/districts";

/**
 * WorldDirector turns the agent decision log into staged scenes for the 3D
 * floor. The backend settles a negotiation in milliseconds; the director
 * replays it at a readable pace:
 *
 *   approach → buyer + seller walk to the stall
 *   talk     → each offer / counter shows as a speech bubble
 *   outro    → deal burst (accept) or walk-away (reject), then both go home
 *
 * Court rulings get their own scene: both parties walk to the court steps,
 * make their case, and the verdict appears over the buyer.
 *
 * Pure TypeScript with an explicit clock (`tick(dtMs)`), so it is renderer
 * agnostic and unit-testable. The scene reads it every frame; React
 * re-renders only on discrete changes (`subscribe` / `version`).
 */

export type BubbleTone = "offer" | "counter" | "accept" | "reject" | "info";

export type Bubble = {
  key: string;
  agentId: string;
  text: string;
  tone: BubbleTone;
  price: number | null;
};

export type Burst = {
  id: string;
  x: number;
  z: number;
  label: string;
  tone: "deal" | "walk";
  bornAt: number;
};

export type StageLink = {
  buyerId: string;
  stallId: string;
  price: number | null;
  /** Buyers on this stall right now (talking + queued); >1 is an auction. */
  bidders: number;
};

export type FeedLine = {
  id: string;
  at: string;
  text: string;
  tone: BubbleTone;
};

export type Placement = { x: number; z: number; faceX: number; faceZ: number };

export type DirectorMode = "live" | "replay";

export type StageLookup = {
  /** Stalls are keyed by listing id. */
  stall: (id: string) => { x: number; z: number; title: string } | undefined;
  agentName: (id: string) => string;
};

type Phase = "pending" | "approach" | "talk" | "outro";

type Scene = {
  negotiationId: string;
  buyerId: string;
  sellerId: string;
  stallId: string;
  beats: WorldBeat[];
  cursor: number;
  phase: Phase;
  phaseEndsAt: number;
  /** Sim time the scene last received or showed a beat (live timeout). */
  lastActivityAt: number;
  live: boolean;
  bubble: Bubble | null;
  price: number | null;
};

type Ambient = { bubble: Bubble; endsAt: number };

type CourtPhase = "pending" | "walk" | "hearing" | "verdict";

type CourtCase = {
  id: string;
  buyerId: string;
  sellerId: string;
  text: string;
  phase: CourtPhase;
  phaseEndsAt: number;
  bubble: Bubble | null;
};

/** Sounds and other one-off effects the page can react to. */
export type Cue = "step" | "deal" | "walk" | "gavel";

const APPROACH_MS = 2600;
const BEAT_MS = 2300;
const OUTRO_MS = 2600;
const AMBIENT_MS = 2800;
const BURST_MS = 3200;
/** Live negotiation with no new beat for this long is closed out. */
const LIVE_IDLE_MS = 30000;
const MAX_CONCURRENT = 3;
const COURT_WALK_MS = 4200;
const COURT_HEARING_MS = 2600;
const COURT_VERDICT_MS = 5200;
const FEED_MAX = 40;

const TERMINAL = new Set(["accept", "reject", "escalated"]);
const NEG_TYPES = new Set(["offer", "counter", "accept", "reject", "message"]);

function money(n: number | null | undefined) {
  return n == null ? "" : `£${Math.round(n)}`;
}

function toneFor(type: string): BubbleTone {
  if (type === "offer" || type === "counter" || type === "accept" || type === "reject")
    return type;
  return "info";
}

export class WorldDirector {
  mode: DirectorMode = "live";
  speed = 1;
  /** Bumped on every discrete change; React subscribes to this. */
  version = 0;

  /** Robots write their rendered positions here (camera follow, links). */
  readonly livePos = new Map<string, { x: number; z: number }>();

  private sim = 0;
  private scenes: Scene[] = [];
  private ambient = new Map<string, Ambient>();
  private courts: CourtCase[] = [];
  private bursts: Burst[] = [];
  private feedLines: FeedLine[] = [];
  private seen = new Set<string>();
  private listeners = new Set<() => void>();
  private replayTotal = 0;
  private replayDone = 0;
  /** Live beats held back while a replay is playing. */
  private buffered: WorldBeat[] = [];

  constructor(
    private stage: StageLookup,
    private hooks: { onLiveSceneEnd?: () => void; onCue?: (cue: Cue) => void } = {}
  ) {}

  setOnCue(fn: (cue: Cue) => void) {
    this.hooks.onCue = fn;
  }

  private cue(c: Cue) {
    try {
      this.hooks.onCue?.(c);
    } catch {
      // effects must never break staging
    }
  }

  setStage(stage: StageLookup) {
    this.stage = stage;
  }

  setOnLiveSceneEnd(fn: () => void) {
    this.hooks.onLiveSceneEnd = fn;
  }

  // ── subscriptions ────────────────────────────────────────

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  getVersion = () => this.version;

  private changed() {
    this.version++;
    for (const fn of this.listeners) fn();
  }

  // ── input ────────────────────────────────────────────────

  /** Live beats from polling / realtime. Duplicates are ignored. */
  pushLive(beats: WorldBeat[]) {
    const fresh = beats.filter((b) => !this.seen.has(b.id));
    if (fresh.length === 0) return;
    for (const b of fresh) this.seen.add(b.id);

    if (this.mode === "replay") {
      this.buffered.push(...fresh);
      this.changed();
      return;
    }
    for (const b of fresh) this.ingest(b, true);
    this.changed();
  }

  /**
   * Replay historic beats (oldest first). Keeps the last `maxScenes`
   * negotiations so a busy hour still plays in a couple of minutes.
   */
  startReplay(beats: WorldBeat[], maxScenes = 14) {
    for (const b of beats) this.seen.add(b.id);

    const negOrder: string[] = [];
    for (const b of beats) {
      if (b.negotiation_id && !negOrder.includes(b.negotiation_id)) {
        negOrder.push(b.negotiation_id);
      }
    }
    const keep = new Set(negOrder.slice(-maxScenes));

    this.reset();
    this.mode = "replay";
    // Replay stages negotiations only; ambient beats would all fire at once
    for (const b of beats) {
      if (b.negotiation_id && keep.has(b.negotiation_id)) this.ingest(b, false);
    }
    this.replayTotal = this.scenes.length;
    this.replayDone = 0;
    if (this.replayTotal === 0) this.mode = "live";
    this.changed();
  }

  /** Leave replay; anything that happened meanwhile plays live. */
  goLive() {
    const pending = this.buffered;
    this.reset();
    this.mode = "live";
    for (const b of pending) this.ingest(b, true);
    this.changed();
  }

  setSpeed(speed: number) {
    this.speed = speed;
    this.changed();
  }

  private reset() {
    this.scenes = [];
    this.courts = [];
    this.ambient.clear();
    this.bursts = [];
    this.buffered = [];
    this.replayTotal = 0;
    this.replayDone = 0;
  }

  private ingest(beat: WorldBeat, live: boolean) {
    const isNeg =
      beat.negotiation_id &&
      beat.buyer_id &&
      beat.seller_id &&
      beat.listing_id &&
      // Legacy self-trades can't be staged (one robot, two spots)
      beat.buyer_id !== beat.seller_id;

    if (isNeg && NEG_TYPES.has(beat.type)) {
      // Append to an unfinished scene for this negotiation, or open one
      let scene = this.scenes.find(
        (s) => s.negotiationId === beat.negotiation_id && s.phase !== "outro"
      );
      if (!scene) {
        if (!this.stage.stall(beat.listing_id!)) {
          this.log(beat, live);
          return;
        }
        scene = {
          negotiationId: beat.negotiation_id!,
          buyerId: beat.buyer_id!,
          sellerId: beat.seller_id!,
          stallId: beat.listing_id!,
          beats: [],
          cursor: 0,
          phase: "pending",
          phaseEndsAt: 0,
          lastActivityAt: this.sim,
          live,
          bubble: null,
          price: null,
        };
        this.scenes.push(scene);
      }
      scene.beats.push(beat);
      scene.lastActivityAt = this.sim;
      return;
    }

    // A court ruling between two agents: stage it at the court hall
    if (beat.type === "court" && beat.buyer_id && beat.seller_id && beat.buyer_id !== beat.seller_id) {
      this.log(beat, live);
      this.courts.push({
        id: beat.id,
        buyerId: beat.buyer_id,
        sellerId: beat.seller_id,
        text: beat.message ? `⚖ ${beat.message.length > 84 ? beat.message.slice(0, 82) + "…" : beat.message}` : "⚖ Verdict in",
        phase: "pending",
        phaseEndsAt: 0,
        bubble: null,
      });
      return;
    }

    // Ambient beat (match, repricing…): short bubble + feed line
    this.log(beat, live);
    const text = this.ambientText(beat);
    if (text && !this.isBusy(beat.agent_id)) {
      this.ambient.set(beat.agent_id, {
        bubble: {
          key: beat.id,
          agentId: beat.agent_id,
          text,
          tone: "info",
          price: beat.price,
        },
        endsAt: this.sim + AMBIENT_MS,
      });
    }
  }

  // ── clock ────────────────────────────────────────────────

  tick(dtMs: number) {
    // Clamp so a backgrounded tab doesn't fast-forward through everything,
    // but loosely enough that low-fps devices still play in real time
    this.sim += Math.min(dtMs, 250) * this.speed;
    let dirty = false;

    for (const [id, a] of this.ambient) {
      if (this.sim >= a.endsAt) {
        this.ambient.delete(id);
        dirty = true;
      }
    }

    const before = this.bursts.length;
    this.bursts = this.bursts.filter((b) => this.sim - b.bornAt < BURST_MS);
    if (this.bursts.length !== before) dirty = true;

    for (const scene of [...this.scenes]) {
      if (this.advance(scene)) dirty = true;
    }
    if (this.advanceCourt()) dirty = true;

    if (this.mode === "replay" && this.scenes.length === 0 && this.replayTotal > 0) {
      // Replay finished → drop into live with whatever arrived meanwhile
      this.goLive();
      return;
    }

    if (dirty) this.changed();
  }

  /** Returns true if anything visible changed. */
  private advance(scene: Scene): boolean {
    const t = this.sim;

    if (scene.phase === "pending") {
      const active = this.scenes.filter((s) => s.phase !== "pending").length;
      if (active >= MAX_CONCURRENT) return false;
      if (this.isBusy(scene.buyerId, scene) || this.isBusy(scene.sellerId, scene))
        return false;
      scene.phase = "approach";
      scene.phaseEndsAt = t + APPROACH_MS;
      this.cue("step");
      this.ambient.delete(scene.buyerId);
      this.ambient.delete(scene.sellerId);
      return true;
    }

    if (t < scene.phaseEndsAt) return false;

    if (scene.phase === "approach" || scene.phase === "talk") {
      if (scene.cursor < scene.beats.length) {
        const beat = scene.beats[scene.cursor++];
        scene.phase = "talk";
        scene.phaseEndsAt = t + BEAT_MS;
        scene.lastActivityAt = t;
        if (beat.price != null) scene.price = beat.price;
        scene.bubble = {
          key: beat.id,
          agentId: beat.agent_id,
          text: this.beatText(beat),
          tone: toneFor(beat.type),
          price: beat.price,
        };
        this.log(beat, scene.live);
        return true;
      }

      const last = scene.beats[scene.beats.length - 1];
      const finished =
        (last && TERMINAL.has(last.type)) ||
        !scene.live ||
        t - scene.lastActivityAt > LIVE_IDLE_MS;
      if (!finished) return false; // live: wait for the next beat

      const stall = this.stage.stall(scene.stallId);
      if (stall && last) {
        const deal = last.type === "accept";
        this.bursts.push({
          id: `${scene.negotiationId}-${last.id}`,
          x: stall.x,
          z: stall.z,
          label: deal ? `DEAL ${money(last.price ?? scene.price)}` : "No deal",
          tone: deal ? "deal" : "walk",
          bornAt: t,
        });
        this.cue(deal ? "deal" : "walk");
      }
      scene.phase = "outro";
      scene.phaseEndsAt = t + OUTRO_MS;
      return true;
    }

    // outro finished
    this.scenes = this.scenes.filter((s) => s !== scene);
    if (this.mode === "replay") this.replayDone++;
    if (scene.live) this.hooks.onLiveSceneEnd?.();
    return true;
  }

  private isBusy(agentId: string, except?: Scene) {
    return (
      this.scenes.some(
        (s) =>
          s !== except &&
          s.phase !== "pending" &&
          (s.buyerId === agentId || s.sellerId === agentId)
      ) ||
      this.courts.some((c) => c.phase !== "pending" && (c.buyerId === agentId || c.sellerId === agentId))
    );
  }

  /** One courthouse: cases are heard one at a time, in order. */
  private advanceCourt(): boolean {
    const c = this.courts[0];
    if (!c) return false;
    const t = this.sim;
    if (c.phase === "pending") {
      const busy = (id: string) =>
        this.scenes.some((s) => s.phase !== "pending" && (s.buyerId === id || s.sellerId === id));
      if (busy(c.buyerId) || busy(c.sellerId)) return false;
      c.phase = "walk";
      c.phaseEndsAt = t + COURT_WALK_MS;
      this.ambient.delete(c.buyerId);
      this.ambient.delete(c.sellerId);
      this.cue("step");
      return true;
    }
    if (t < c.phaseEndsAt) return false;
    if (c.phase === "walk") {
      c.phase = "hearing";
      c.phaseEndsAt = t + COURT_HEARING_MS;
      c.bubble = { key: `${c.id}:case`, agentId: c.sellerId, text: "Your honour, the price was fair.", tone: "info", price: null };
      return true;
    }
    if (c.phase === "hearing") {
      c.phase = "verdict";
      c.phaseEndsAt = t + COURT_VERDICT_MS;
      c.bubble = { key: `${c.id}:verdict`, agentId: c.buyerId, text: c.text, tone: "info", price: null };
      this.cue("gavel");
      return true;
    }
    this.courts.shift();
    return true;
  }

  private courtCaseFor(agentId: string) {
    const c = this.courts[0];
    return c && c.phase !== "pending" && (c.buyerId === agentId || c.sellerId === agentId) ? c : null;
  }

  // ── output ───────────────────────────────────────────────

  /** Where an agent should stand, or null to roam freely near home. */
  placementFor(agentId: string): Placement | null {
    const court = this.courtCaseFor(agentId);
    if (court) return courtSpot(court.buyerId === agentId ? -1 : 1);
    for (const s of this.scenes) {
      if (s.phase === "pending") continue;
      const isBuyer = s.buyerId === agentId;
      if (!isBuyer && s.sellerId !== agentId) continue;
      const stall = this.stage.stall(s.stallId);
      if (!stall) return null;
      // Walk-away: buyer leaves early on a rejected deal
      const last = s.beats[s.beats.length - 1];
      if (s.phase === "outro" && isBuyer && last?.type === "reject") return null;
      // Buyer in front-right of the stall, seller front-left, facing each other
      const side = isBuyer ? 1 : -1;
      const x = stall.x + side * 0.95;
      const z = stall.z + 1.6;
      return { x, z, faceX: stall.x - side * 0.95, faceZ: z };
    }
    return this.queueSpot(agentId);
  }

  /**
   * Bidders waiting on a stall that is already mid-negotiation (an auction)
   * line up behind the buyer's spot instead of idling at home.
   */
  private queueSpot(agentId: string): Placement | null {
    const scene = this.scenes.find((s) => s.phase === "pending" && s.buyerId === agentId);
    if (!scene || this.isBusy(agentId)) return null;
    const live = this.scenes.some((s) => s.stallId === scene.stallId && s.phase !== "pending");
    if (!live) return null;
    const stall = this.stage.stall(scene.stallId);
    if (!stall) return null;
    const queue = this.scenes.filter((s) => s.stallId === scene.stallId && s.phase === "pending");
    const k = queue.indexOf(scene);
    const x = stall.x + 0.95 + 0.25 * (k % 2);
    const z = stall.z + 1.6 + 1.05 * (k + 1);
    return { x, z, faceX: stall.x, faceZ: stall.z };
  }

  private biddersOn(stallId: string) {
    return new Set(this.scenes.filter((s) => s.stallId === stallId).map((s) => s.buyerId)).size;
  }

  bubbleFor(agentId: string): Bubble | null {
    const court = this.courtCaseFor(agentId);
    if (court?.bubble?.agentId === agentId) return court.bubble;
    for (const s of this.scenes) {
      if (s.bubble?.agentId === agentId && s.phase !== "pending") return s.bubble;
    }
    return this.ambient.get(agentId)?.bubble ?? null;
  }

  /** Every visible bubble, at most one per agent (scene beats win). */
  get bubbles(): Bubble[] {
    const out: Bubble[] = [];
    const seen = new Set<string>();
    const court = this.courts[0];
    if (court?.bubble && court.phase !== "pending") {
      seen.add(court.bubble.agentId);
      out.push(court.bubble);
    }
    for (const s of this.scenes) {
      if (s.phase === "pending" || !s.bubble || seen.has(s.bubble.agentId)) continue;
      seen.add(s.bubble.agentId);
      out.push(s.bubble);
    }
    for (const a of this.ambient.values()) {
      if (seen.has(a.bubble.agentId)) continue;
      seen.add(a.bubble.agentId);
      out.push(a.bubble);
    }
    return out;
  }

  nameOf(agentId: string) {
    return this.stage.agentName(agentId);
  }

  get activeBursts(): readonly Burst[] {
    return this.bursts;
  }

  get links(): StageLink[] {
    return this.scenes
      .filter((s) => s.phase === "talk")
      .map((s) => ({
        buyerId: s.buyerId,
        stallId: s.stallId,
        price: s.price,
        bidders: this.biddersOn(s.stallId),
      }));
  }

  get feed(): readonly FeedLine[] {
    return this.feedLines;
  }

  get now() {
    return this.sim;
  }

  get progress() {
    if (this.mode !== "replay" || this.replayTotal === 0) return null;
    return { done: this.replayDone, total: this.replayTotal };
  }

  get bufferedCount() {
    return this.buffered.length;
  }

  /** Short line for the "now playing" ticker. */
  get nowPlaying(): string | null {
    const s = this.scenes.find((x) => x.phase !== "pending");
    const court = this.courts[0];
    if (!s && court && court.phase !== "pending") {
      return `Court · ${this.stage.agentName(court.buyerId)} v ${this.stage.agentName(court.sellerId)}`;
    }
    if (!s) return null;
    const stall = this.stage.stall(s.stallId);
    const prices = s.beats
      .slice(0, s.cursor)
      .map((b) => (b.type === "accept" ? `deal ${money(b.price)}` : money(b.price)))
      .filter(Boolean);
    return `${this.stage.agentName(s.buyerId)} ↔ ${this.stage.agentName(s.sellerId)} · ${
      stall?.title ?? "listing"
    }${prices.length ? " · " + prices.join(" → ") : ""}`;
  }

  // ── text ─────────────────────────────────────────────────

  private beatText(b: WorldBeat) {
    if (b.message) return b.message.length > 90 ? b.message.slice(0, 88) + "…" : b.message;
    if (b.type === "accept") return `Deal at ${money(b.price)}`;
    if (b.type === "reject") return "I'll pass.";
    return money(b.price) || "…";
  }

  private ambientText(b: WorldBeat): string | null {
    switch (b.type) {
      case "match":
        return "Scanning listings…";
      case "price_adjust":
        return `Price drop → ${money(b.price)}`;
      case "relist":
        return `Restocked at ${money(b.price)}`;
      case "court":
        return "⚖ Verdict in";
      default:
        return null;
    }
  }

  private log(b: WorldBeat, live: boolean) {
    const who = this.stage.agentName(b.agent_id);
    const stall = b.listing_id ? this.stage.stall(b.listing_id) : undefined;
    const what = stall ? ` for ${stall.title}` : "";
    let text: string;
    switch (b.type) {
      case "offer":
        text = `${who} offered ${money(b.price)}${what}`;
        break;
      case "counter":
        text = `${who} countered ${money(b.price)}${what}`;
        break;
      case "accept":
        text = `${who} closed the deal at ${money(b.price)}${what}`;
        break;
      case "reject":
        text = `${who} walked away${what}`;
        break;
      case "match":
        text = `${who} scanned the market`;
        break;
      case "price_adjust":
        text = `${who} cut a price to ${money(b.price)}`;
        break;
      case "relist":
        text = `${who} restocked${what}`;
        break;
      case "court":
        text = `Court ruled: ${b.message.slice(0, 70)}`;
        break;
      default:
        text = `${who}: ${b.message.slice(0, 70)}`;
    }
    this.feedLines = [
      { id: `${b.id}-${live ? "l" : "r"}`, at: b.at, text, tone: toneFor(b.type) },
      ...this.feedLines.filter((f) => !f.id.startsWith(b.id)),
    ].slice(0, FEED_MAX);
  }
}
