"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerformanceMonitor, PerspectiveCamera } from "@react-three/drei";
import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { Suspense, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { WorldSnapshot } from "@/lib/types";
import type { WorldDirector } from "@/lib/world/director";
import { COURT_POS } from "@/lib/world/districts";
import type { Footprint } from "@/lib/world/terrain";
import type { CameraMode, WorldSelection } from "@/components/world/WorldCanvas";
import { CameraDirector, FrameCamera, VILLAGE_VIEW } from "@/components/world/WorldCamera";
import { BubbleLayer, BubbleProjector, type BubbleRegistry } from "@/components/world/SpeechBubbles";
import { laptopTextForAgent } from "@/components/world/AgentLaptop";
import { ROLE_BY_ID } from "@/lib/agents/roles";
import { Grass, Terrain, Trees, Undergrowth } from "./Nature";
import { Cottage } from "./Cottage";
import { CourtHall, Lamps, Plazas, Stall } from "./Market";
import { Bunting, MarketSquare } from "./Square";
import { Pond } from "./Pond";
import { RobotAgent } from "./RobotAgent";
import { DealBursts, DirectorClock, NegotiationTags } from "./StageFx";
import { NightContext } from "./night";
import { Atmosphere, bloomFor } from "./Atmosphere";
import { setRobotDetail } from "./RobotAgent";
import { TIER, type WorldOptions } from "@/lib/world/options";
import { villageNavGrid } from "@/lib/world/navigation";

function Village({
  snapshot,
  selection,
  onSelect,
  cameraMode,
  followAgentId,
  director,
  bubbles,
  lowQuality,
  options,
}: {
  snapshot: WorldSnapshot;
  selection: WorldSelection;
  onSelect: (s: WorldSelection) => void;
  cameraMode: CameraMode;
  followAgentId: string | null;
  director: WorldDirector;
  bubbles: BubbleRegistry;
  lowQuality: boolean;
  options: WorldOptions;
}) {
  // Landscape is expensive to build: only rebuild when a cottage moves
  const homesKey = snapshot.agents
    .map((a) => (a.building ? `${a.building.x.toFixed(2)},${a.building.z.toFixed(2)},${a.building.rot.toFixed(3)}` : ""))
    .join("|");
  const homes = useMemo<Footprint[]>(
    () =>
      homesKey
        .split("|")
        .filter(Boolean)
        .map((s) => {
          const [x, z, rot] = s.split(",").map(Number);
          return { x, z, rot };
        }),
    [homesKey]
  );
  const { phase, weather, tier, welcomeId } = options;
  const t = TIER[tier];
  // Lamps and windows glow from dusk; real point lights only where the GPU can afford them
  const nightValue = useMemo(
    () => ({ night: phase !== "day", lights: phase !== "day" && t.pointLights && !lowQuality }),
    [phase, t.pointLights, lowQuality]
  );
  const bloom = bloomFor(phase, weather);
  const ao = t.ao && !lowQuality;
  // Walkable grid for routes around stalls and cottages; rebuilt when they move
  const stallKey = snapshot.stalls.map((s) => `${s.x.toFixed(1)},${s.z.toFixed(1)}`).join("|");
  const nav = useMemo(
    () =>
      villageNavGrid(
        stallKey ? stallKey.split("|").map((p) => ({ x: Number(p.split(",")[0]), z: Number(p.split(",")[1]) })) : [],
        homes
      ),
    [stallKey, homes]
  );
  const districtColor = useMemo(
    () => new Map((snapshot.districts || []).map((d) => [d.id, d.color])),
    [snapshot.districts]
  );

  return (
    <NightContext.Provider value={nightValue}>
      <PerspectiveCamera makeDefault fov={34} near={0.5} far={700} />
      <FrameCamera />
      <Atmosphere phase={phase} weather={weather} shadowMap={t.shadowMap} />

      <Terrain homes={homes} segments={t.terrain} />
      <Grass key={t.grass} homes={homes} count={t.grass} />
      <Trees homes={homes} />
      <Undergrowth homes={homes} />
      <Pond />
      <MarketSquare />
      <Plazas districts={snapshot.districts || []} />
      <Lamps />
      <Bunting />
      <CourtHall x={COURT_POS.x} z={COURT_POS.z} />

      {snapshot.stalls.map((s) => (
        <Stall
          key={s.id}
          stall={s}
          color={districtColor.get(s.district || "") || "#5fa36b"}
          selected={selection?.kind === "stall" && selection.id === s.id}
          onSelect={() => onSelect({ kind: "stall", id: s.id })}
        />
      ))}
      {snapshot.agents.map((a) =>
        a.building ? (
          <Cottage
            key={`home-${a.id}`}
            x={a.building.x}
            z={a.building.z}
            rot={a.building.rot}
            role={a.role}
            name={a.name}
            accent={ROLE_BY_ID[a.role]?.hex || "#42d886"}
            screenText={laptopTextForAgent(a, snapshot.stalls, a.id)}
            selected={selection?.kind === "agent" && selection.id === a.id}
            onSelect={() => onSelect({ kind: "agent", id: a.id })}
            building={a.id === welcomeId}
          />
        ) : null
      )}
      {snapshot.agents.map((a) => (
        <RobotAgent
          key={a.id}
          agent={a}
          stalls={snapshot.stalls}
          selected={selection?.kind === "agent" && selection.id === a.id}
          onSelect={() => onSelect({ kind: "agent", id: a.id })}
          director={director}
          nav={nav}
        />
      ))}

      <DirectorClock director={director} />
      <NegotiationTags snapshot={snapshot} director={director} />
      <DealBursts director={director} />
      <BubbleProjector director={director} registry={bubbles} />

      <OrbitControls
        makeDefault
        target={VILLAGE_VIEW.target}
        enableDamping
        dampingFactor={0.08}
        minDistance={10}
        maxDistance={140}
        maxPolarAngle={1.36}
      />
      <CameraDirector mode={cameraMode} followAgentId={followAgentId} snapshot={snapshot} director={director} />

      {/* Ambient occlusion is the most expensive pass: only on capable GPUs */}
      {ao ? (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <N8AO aoRadius={2.2} intensity={2.2} distanceFalloff={1.2} halfRes />
          <Bloom intensity={bloom.intensity} luminanceThreshold={bloom.threshold} luminanceSmoothing={0.15} mipmapBlur />
          {/* The composer renders off-screen, bypassing gl.toneMapping: tone map here */}
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          <SMAA />
          <Vignette eskil={false} offset={0.22} darkness={0.42} />
        </EffectComposer>
      ) : (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <Bloom intensity={bloom.intensity} luminanceThreshold={bloom.threshold} luminanceSmoothing={0.15} mipmapBlur />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          <SMAA />
          <Vignette eskil={false} offset={0.22} darkness={0.42} />
        </EffectComposer>
      )}
    </NightContext.Provider>
  );
}

export function VillageScene(props: {
  snapshot: WorldSnapshot;
  selection: WorldSelection;
  onSelect: (s: WorldSelection) => void;
  cameraMode: CameraMode;
  followAgentId: string | null;
  director: WorldDirector;
  options: WorldOptions;
}) {
  const bubbles = useRef(new Map<string, HTMLDivElement>());
  // Adaptive quality: lower resolution and drop AO if the frame rate sags
  const [lowQuality, setLowQuality] = useState(false);
  const t = TIER[props.options.tier];
  // Robot mesh detail must be set before the first robot is smoothed
  setRobotDetail(t.smoothPasses);
  return (
    <div
      className="w-full rounded-2xl overflow-hidden border border-ink/10 bg-[#c9dccf] dark:bg-[#0b1626] relative"
      style={{ height: "min(72vh, 680px)", minHeight: 520 }}
    >
      <Canvas
        className="!w-full !h-full"
        style={{ width: "100%", height: "100%" }}
        shadows
        dpr={lowQuality ? 1 : t.dpr}
        gl={{
          antialias: false,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.95,
        }}
        onPointerMissed={() => props.onSelect(null)}
      >
        <PerformanceMonitor onDecline={() => setLowQuality(true)} flipflops={2}>
          <Suspense fallback={null}>
            <Village {...props} bubbles={bubbles} lowQuality={lowQuality} />
          </Suspense>
        </PerformanceMonitor>
      </Canvas>
      <BubbleLayer director={props.director} registry={bubbles} />
    </div>
  );
}
