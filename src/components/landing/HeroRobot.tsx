"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Stylized chrome agent — tilts toward the cursor (3D CSS, no Three.js).
 * Represents autonomous buyer/seller agents on BotMart.
 */
export function HeroRobot() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [gaze, setGaze] = useState({ x: 0, y: 0 });
  const raf = useRef<number | null>(null);

  const onMove = useCallback((e: MouseEvent | PointerEvent) => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const el = wrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const nx = (e.clientX - cx) / (rect.width / 2);
      const ny = (e.clientY - cy) / (rect.height / 2);
      const clampedX = Math.max(-1, Math.min(1, nx));
      const clampedY = Math.max(-1, Math.min(1, ny));
      // rotateY follows horizontal, rotateX follows vertical (inverted)
      setTilt({
        x: clampedY * -12,
        y: clampedX * 18,
      });
      setGaze({
        x: clampedX * 4,
        y: clampedY * 3,
      });
    });
  }, []);

  const onLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
    setGaze({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [onMove, onLeave]);

  return (
    <div
      ref={wrapRef}
      className="hero-robot-stage relative w-full max-w-[320px] sm:max-w-[380px] mx-auto aspect-[3/4] flex items-center justify-center"
      style={{ perspective: "900px" }}
      aria-hidden
    >
      {/* Soft ground glow */}
      <div className="absolute bottom-[8%] left-1/2 -translate-x-1/2 w-[70%] h-8 rounded-full bg-emerald-500/20 blur-2xl" />

      <div
        className="hero-robot relative w-[70%] h-[85%] transition-transform duration-200 ease-out"
        style={{
          transformStyle: "preserve-3d",
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        }}
      >
        {/* Helmet / head */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[58%] h-[32%] rounded-[40%_40%_32%_32%] hero-chrome"
          style={{ transform: "translateZ(24px)" }}
        >
          {/* Visor */}
          <div
            className="absolute left-[12%] right-[12%] top-[38%] h-[28%] rounded-full bg-gradient-to-b from-cyan-300/90 via-emerald-400/80 to-cyan-600/50 border border-white/20 shadow-[0_0_24px_rgba(16,185,129,0.45)]"
            style={{ transform: "translateZ(8px)" }}
          >
            {/* Eyes that track cursor slightly */}
            <div
              className="absolute top-1/2 left-1/2 flex gap-3 -translate-x-1/2 -translate-y-1/2 transition-transform duration-150"
              style={{
                transform: `translate(calc(-50% + ${gaze.x}px), calc(-50% + ${gaze.y}px))`,
              }}
            >
              <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#fff]" />
              <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#fff]" />
            </div>
          </div>
          {/* Antenna */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-1 h-4 rounded-full bg-gradient-to-t from-emerald-500 to-cyan-300">
            <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981] animate-pulse" />
          </div>
        </div>

        {/* Neck */}
        <div
          className="absolute top-[30%] left-1/2 -translate-x-1/2 w-[14%] h-[5%] rounded-md hero-chrome-dim"
          style={{ transform: "translateZ(12px)" }}
        />

        {/* Torso */}
        <div
          className="absolute top-[34%] left-1/2 -translate-x-1/2 w-[72%] h-[38%] rounded-[28%_28%_18%_18%] hero-chrome"
          style={{ transform: "translateZ(18px)" }}
        >
          {/* Chest plate */}
          <div className="absolute inset-[12%_18%_28%] rounded-2xl bg-gradient-to-br from-white/15 to-transparent border border-white/10" />
          {/* Core glow */}
          <div className="absolute left-1/2 top-[42%] -translate-x-1/2 w-8 h-8 rounded-full bg-emerald-400/30 blur-md" />
          <div className="absolute left-1/2 top-[45%] -translate-x-1/2 w-3 h-3 rounded-full bg-emerald-300 shadow-[0_0_12px_#34d399]" />
        </div>

        {/* Shoulders + arms */}
        <div
          className="absolute top-[36%] left-[2%] w-[22%] h-[12%] rounded-2xl hero-chrome-dim"
          style={{ transform: "translateZ(10px) rotateZ(-8deg)" }}
        />
        <div
          className="absolute top-[36%] right-[2%] w-[22%] h-[12%] rounded-2xl hero-chrome-dim"
          style={{ transform: "translateZ(10px) rotateZ(8deg)" }}
        />
        <div
          className="absolute top-[46%] left-[4%] w-[14%] h-[28%] rounded-full hero-chrome-dim"
          style={{ transform: "translateZ(6px)" }}
        />
        <div
          className="absolute top-[46%] right-[4%] w-[14%] h-[28%] rounded-full hero-chrome-dim"
          style={{ transform: "translateZ(6px)" }}
        />

        {/* Hips + legs */}
        <div
          className="absolute top-[70%] left-1/2 -translate-x-1/2 w-[48%] h-[8%] rounded-xl hero-chrome"
          style={{ transform: "translateZ(14px)" }}
        />
        <div
          className="absolute top-[76%] left-[28%] w-[16%] h-[22%] rounded-2xl hero-chrome-dim"
          style={{ transform: "translateZ(8px)" }}
        />
        <div
          className="absolute top-[76%] right-[28%] w-[16%] h-[22%] rounded-2xl hero-chrome-dim"
          style={{ transform: "translateZ(8px)" }}
        />
      </div>

      {/* Floating tags */}
      <div className="absolute top-[12%] -left-2 sm:left-0 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 backdrop-blur-sm">
        Buyer
      </div>
      <div className="absolute bottom-[22%] -right-2 sm:right-0 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 backdrop-blur-sm">
        Seller
      </div>
    </div>
  );
}
