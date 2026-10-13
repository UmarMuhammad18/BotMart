/**
 * Viewer settings for the village, plus the pure rules behind them (tested):
 * which sky to draw, and which graphics tier a device gets.
 */
export type SkyMode = "theme" | "realtime" | "day" | "dusk" | "night";
export type SkyPhase = "day" | "dusk" | "night";
export type Weather = "clear" | "rain" | "mist";
export type QualityTier = "high" | "medium" | "low";
export type QualitySetting = QualityTier | "auto";

export type WorldSettings = {
  sky: SkyMode;
  weather: Weather;
  quality: QualitySetting;
  sound: boolean;
};

export const DEFAULT_SETTINGS: WorldSettings = { sky: "theme", weather: "clear", quality: "auto", sound: false };

/** What the scene needs to know beyond the snapshot. */
export type WorldOptions = {
  phase: SkyPhase;
  weather: Weather;
  tier: QualityTier;
  /** A just-created agent whose cottage should rise into place. */
  welcomeId: string | null;
};

/**
 * The sky to draw. "theme" follows light/dark mode; "realtime" follows the
 * viewer's clock: dawn and dusk get the golden-hour sky.
 */
export function resolveSky(mode: SkyMode, theme: "light" | "dark", now: Date = new Date()): SkyPhase {
  if (mode === "day" || mode === "dusk" || mode === "night") return mode;
  if (mode === "theme") return theme === "dark" ? "night" : "day";
  const h = now.getHours() + now.getMinutes() / 60;
  if (h >= 21 || h < 5.5) return "night";
  if (h < 7.5 || h >= 18.5) return "dusk";
  return "day";
}

export type DeviceInfo = {
  cores?: number;
  memoryGb?: number;
  width: number;
  mobile: boolean;
  gpu?: string;
  reducedMotion?: boolean;
};

/**
 * A graphics tier from what the browser tells us. Phones and low-memory or
 * software-rendered devices get the light tier; mid-range laptops and
 * tablets the medium one.
 */
export function detectTier(d: DeviceInfo): QualityTier {
  const gpu = (d.gpu || "").toLowerCase();
  if (/swiftshader|llvmpipe|software|basic render/.test(gpu)) return "low";
  if ((d.memoryGb ?? 8) <= 2 || (d.cores ?? 8) <= 2) return "low";
  if (d.mobile || d.width < 768) {
    // Recent flagship phones cope with the middle tier
    return /apple gpu|adreno \(tm\) (7[3-9]\d|8\d\d)|mali-g7[1-9]/.test(gpu) ? "medium" : "low";
  }
  if ((d.memoryGb ?? 8) <= 4 || (d.cores ?? 8) <= 4 || /intel.*(hd|uhd) graphics/.test(gpu)) return "medium";
  return "high";
}

/** What each tier turns on. */
export const TIER = {
  high: { smoothPasses: 2, grass: 30000, ao: true, shadowMap: 4096, dpr: [1, 1.75] as [number, number], pointLights: true, terrain: 320 },
  medium: { smoothPasses: 2, grass: 14000, ao: false, shadowMap: 2048, dpr: [1, 1.4] as [number, number], pointLights: true, terrain: 240 },
  low: { smoothPasses: 1, grass: 5000, ao: false, shadowMap: 1024, dpr: [1, 1] as [number, number], pointLights: false, terrain: 160 },
} satisfies Record<QualityTier, unknown>;

/** Read the device in the browser (best effort). */
export function readDevice(): DeviceInfo {
  const nav = navigator as Navigator & { deviceMemory?: number; userAgentData?: { mobile?: boolean } };
  let gpu: string | undefined;
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    if (gl && ext) gpu = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL));
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    // no WebGL details
  }
  return {
    cores: nav.hardwareConcurrency,
    memoryGb: nav.deviceMemory,
    width: window.innerWidth,
    mobile: nav.userAgentData?.mobile ?? /Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent),
    gpu,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  };
}

const KEY = "botmart-world-settings";

export function loadSettings(): WorldSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const v = JSON.parse(raw) as Partial<WorldSettings>;
    return {
      sky: (["theme", "realtime", "day", "dusk", "night"] as const).includes(v.sky as SkyMode) ? (v.sky as SkyMode) : "theme",
      weather: (["clear", "rain", "mist"] as const).includes(v.weather as Weather) ? (v.weather as Weather) : "clear",
      quality: (["auto", "high", "medium", "low"] as const).includes(v.quality as QualitySetting) ? (v.quality as QualitySetting) : "auto",
      sound: v.sound === true,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: WorldSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // storage blocked
  }
}
