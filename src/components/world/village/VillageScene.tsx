"use client";

import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls, PerformanceMonitor, PerspectiveCamera, Sky, Stars } from "@react-three/drei";
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
import { useResolvedTheme } from "@/lib/theme";

/** Late-afternoon sun: warm, low enough for long soft shadows. */
const SUN = new THREE.Vector3(55, 34, -28);
/** At night a cool moon stands in for the sun, from the other side. */
const MOON = new THREE.Vector3(-48, 42, -36);

function Lighting({ night }: { night: boolean }) {
  return (
    <>
      <hemisphereLight args={night ? ["#5a74b0", "#0c1710", 0.42] : ["#dcefff", "#3e5c2c", 0.65]} />
      <directionalLight
        position={night ? MOON : SUN}
        intensity={night ? 0.75 : 2.6}
        color={night ? "#b4c8ff" : "#ffeccc"}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.035}
        shadow-camera-near={10}
        shadow-camera-far={180}
        shadow-camera-left={-48}
        shadow-camera-right={48}
        shadow-camera-top={48}
        shadow-camera-bottom={-48}
      />
    </>
  );
}

function DaySky() {
  return (
    <>
      <Sky distance={4500} sunPosition={SUN} turbidity={5} rayleigh={1.4} mieCoefficient={0.004} mieDirectionalG={0.86} />
      <Environment resolution={256} frames={1}>
        <Sky distance={400} sunPosition={SUN} turbidity={5} rayleigh={1.4} mieCoefficient={0.004} mieDirectionalG={0.86} />
      </Environment>
      <fog attach="fog" args={["#c9dccf", 85, 210]} />
    </>
  );
}

/** Deep blue sky, stars, a moon and a faint cool environment for reflections. */
function NightSky() {
  const moon = MOON.clone().normalize().multiplyScalar(380);
  return (
    <>
      <color attach="background" args={["#0a1426"]} />
      <Stars radius={420} depth={60} count={5000} factor={7} saturation={0.15} fade speed={0.4} />
      <mesh position={moon}>
        <sphereGeometry args={[11, 64, 48]} />
        <meshBasicMaterial color="#eef2ff" toneMapped={false} />
      </mesh>
      <Environment resolution={128} frames={1}>
        <color attach="background" args={["#0e1a2e"]} />
        <Lightformer form="circle" intensity={1.2} color="#a9bfff" position={[-30, 30, -20]} scale={22} />
        <Lightformer form="rect" intensity={0.5} color="#ffb870" position={[0, -6, 0]} rotation-x={Math.PI / 2} scale={[60, 60, 1]} />
      </Environment>
      <fog attach="fog" args={["#0b1626", 70, 200]} />
    </>
  );
}

function Village({
  snapshot,
  selection,
  onSelect,
  cameraMode,
  followAgentId,
  director,
  bubbles,
  lowQuality,
}: {
  snapshot: WorldSnapshot;
  selection: WorldSelection;
  onSelect: (s: WorldSelection) => void;
  cameraMode: CameraMode;
  followAgentId: string | null;
  director: WorldDirector;
  bubbles: BubbleRegistry;
  lowQuality: boolean;
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
  const night = useResolvedTheme() === "dark";
  const nightValue = useMemo(() => ({ night, lights: night && !lowQuality }), [night, lowQuality]);
  const grassCount = useMemo(() => (typeof window !== "undefined" && window.innerWidth < 768 ? 12000 : 30000), []);
  const districtColor = useMemo(
    () => new Map((snapshot.districts || []).map((d) => [d.id, d.color])),
    [snapshot.districts]
  );

  return (
    <NightContext.Provider value={nightValue}>
      <PerspectiveCamera makeDefault fov={34} near={0.5} far={700} />
      <FrameCamera />
      {night ? <NightSky /> : <DaySky />}
      <Lighting night={night} />

      <Terrain homes={homes} />
      <Grass homes={homes} count={grassCount} />
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

      {/* Ambient occlusion is the most expensive pass: slow GPUs get a lighter chain */}
      {lowQuality ? (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <Bloom intensity={night ? 1.1 : 0.6} luminanceThreshold={night ? 0.9 : 1.05} luminanceSmoothing={0.15} mipmapBlur />
          {/* The composer renders off-screen, bypassing gl.toneMapping: tone map here */}
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          <SMAA />
          <Vignette eskil={false} offset={0.22} darkness={0.42} />
        </EffectComposer>
      ) : (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <N8AO aoRadius={2.2} intensity={2.2} distanceFalloff={1.2} halfRes />
          <Bloom intensity={night ? 1.1 : 0.6} luminanceThreshold={night ? 0.9 : 1.05} luminanceSmoothing={0.15} mipmapBlur />
          {/* The composer renders off-screen, bypassing gl.toneMapping: tone map here */}
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
}) {
  const bubbles = useRef(new Map<string, HTMLDivElement>());
  // Adaptive quality: lower resolution and drop AO if the frame rate sags
  const [lowQuality, setLowQuality] = useState(false);
  return (
    <div
      className="w-full rounded-2xl overflow-hidden border border-ink/10 bg-[#c9dccf] dark:bg-[#0b1626] relative"
      style={{ height: "min(72vh, 680px)", minHeight: 520 }}
    >
      <Canvas
        className="!w-full !h-full"
        style={{ width: "100%", height: "100%" }}
        shadows
        dpr={lowQuality ? 1 : [1, 1.75]}
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
