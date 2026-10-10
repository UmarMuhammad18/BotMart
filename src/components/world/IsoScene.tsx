"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  ContactShadows,
  Text,
  Billboard,
  OrthographicCamera,
  Line,
  Environment,
  Float,
} from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  Vignette,
  SMAA,
} from "@react-three/postprocessing";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { WorldAgent, WorldStall, WorldSnapshot } from "@/lib/types";
import type { CameraMode, WorldSelection } from "@/components/world/WorldCanvas";
import { ProductMesh } from "@/components/world/ProductMesh";
import { pulsePhase } from "@/components/world/busyMotion";
import { SceneDressing } from "@/components/world/SceneDressing";
import { WorldAgentMesh } from "@/components/world/WorldAgent";
import {
  contentCenter,
  FrameCamera,
  CameraDirector,
} from "@/components/world/WorldCamera";

function Floor() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[96, 96]} />
        <meshStandardMaterial
          color="#080b12"
          metalness={0.35}
          roughness={0.75}
          envMapIntensity={0.4}
        />
      </mesh>
      <gridHelper args={[80, 40, "#1e293b", "#0f172a"]} position={[0, 0.025, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[28, 28.3, 64]} />
        <meshBasicMaterial
          color="#10b981"
          transparent
          opacity={0.28}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function StallMesh({
  stall,
  selected,
  onSelect,
}: {
  stall: WorldStall;
  selected: boolean;
  onSelect: () => void;
}) {
  const sold = stall.status !== "active" || stall.stock <= 0;
  const stockPct = Math.min(1, Math.max(0, stall.stock / 10));
  const label =
    stall.title.length > 16 ? stall.title.slice(0, 15) + "…" : stall.title;

  return (
    <group
      position={[stall.x, 0, stall.z]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <mesh position={[0, 0.28, 0]} castShadow>
        <boxGeometry args={[1.9, 0.55, 1.45]} />
        <meshPhysicalMaterial
          color={sold ? "#3f3f46" : "#0c2e24"}
          metalness={0.45}
          roughness={0.35}
          clearcoat={0.3}
          emissive={selected ? "#10b981" : "#000000"}
          emissiveIntensity={selected ? 0.35 : 0}
        />
      </mesh>
      <mesh position={[0, 0.58, 0]} castShadow>
        <boxGeometry args={[2.05, 0.08, 1.55]} />
        <meshPhysicalMaterial
          color={sold ? "#52525b" : "#115e45"}
          metalness={0.55}
          roughness={0.3}
          clearcoat={0.4}
        />
      </mesh>
      {!sold && (
        <mesh position={[0, 1.2, 0.1]} castShadow>
          <boxGeometry args={[2.15, 0.07, 1.65]} />
          <meshStandardMaterial
            color="#10b981"
            emissive="#10b981"
            emissiveIntensity={1.4}
            toneMapped={false}
          />
        </mesh>
      )}
      {sold && (
        <mesh position={[0, 0.95, 0.75]}>
          <boxGeometry args={[1.8, 1.15, 0.05]} />
          <meshStandardMaterial color="#27272a" metalness={0.7} roughness={0.25} />
        </mesh>
      )}
      {!sold && (
        <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.25}>
          <ProductMesh category={stall.category} title={stall.title} sold={false} />
        </Float>
      )}
      <mesh position={[-0.75, 0.1, 0.78]}>
        <boxGeometry args={[0.5, 0.07, 0.05]} />
        <meshBasicMaterial color="#27272a" />
      </mesh>
      <mesh
        position={[-0.75 - 0.25 * (1 - stockPct), 0.1, 0.79]}
        scale={[stockPct || 0.05, 1, 1]}
      >
        <boxGeometry args={[0.5, 0.05, 0.04]} />
        <meshBasicMaterial
          color={stockPct > 0.3 ? "#34d399" : "#f59e0b"}
          toneMapped={false}
        />
      </mesh>
      <Billboard position={[0, 2.2, 0]}>
        <Text
          fontSize={0.24}
          color="#fafafa"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.018}
          outlineColor="#000"
        >
          {label}
        </Text>
        <Text
          position={[0, -0.26, 0]}
          fontSize={0.2}
          color={sold ? "#a1a1aa" : "#6ee7b7"}
          anchorX="center"
          anchorY="top"
          outlineWidth={0.014}
          outlineColor="#000"
        >
          {sold ? "SOLD" : `£${stall.price}`}
        </Text>
      </Billboard>
    </group>
  );
}

function NegotiateLinks({ snapshot }: { snapshot: WorldSnapshot }) {
  const agentMap = useMemo(
    () => new Map(snapshot.agents.map((a) => [a.id, a])),
    [snapshot.agents]
  );
  const stallMap = useMemo(
    () => new Map(snapshot.stalls.map((s) => [s.id, s])),
    [snapshot.stalls]
  );

  return (
    <>
      {(snapshot.links || []).map((link) => {
        const a = agentMap.get(link.agent_id);
        const s = stallMap.get(link.stall_id);
        if (!a || !s) return null;
        const mid = new THREE.Vector3((a.x + s.x) / 2, 1.9, (a.z + s.z) / 2);
        return (
          <group key={`${link.agent_id}-${link.stall_id}`}>
            <Line
              points={[
                new THREE.Vector3(a.x, 0.9, a.z),
                mid,
                new THREE.Vector3(s.x, 1.15, s.z),
              ]}
              color="#fbbf24"
              lineWidth={2.5}
              transparent
              opacity={0.9}
            />
            <Billboard position={[mid.x, mid.y + 0.35, mid.z]}>
              <Text
                fontSize={0.28}
                color="#fde68a"
                anchorX="center"
                outlineWidth={0.02}
                outlineColor="#422006"
              >
                {`£${s.price}`}
              </Text>
            </Billboard>
            <Sparkle id={link.agent_id} a={a} s={s} />
          </group>
        );
      })}
    </>
  );
}

function Sparkle({
  id,
  a,
  s,
}: {
  id: string;
  a: WorldAgent;
  s: WorldStall;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const u = (Math.sin(pulsePhase(id, t)) + 1) / 2;
    ref.current.position.set(
      a.x + (s.x - a.x) * u,
      1.0 + Math.sin(u * Math.PI) * 1.2,
      a.z + (s.z - a.z) * u
    );
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.09, 10, 10]} />
      <meshStandardMaterial
        color="#fbbf24"
        emissive="#f59e0b"
        emissiveIntensity={3}
        toneMapped={false}
      />
    </mesh>
  );
}

function DealPopups({ snapshot }: { snapshot: WorldSnapshot }) {
  return (
    <>
      {(snapshot.deal_popups || []).map((p, i) => (
        <Billboard key={p.id} position={[p.x, 2.7 + (i % 3) * 0.12, p.z]}>
          <Text
            fontSize={0.3}
            color="#6ee7b7"
            anchorX="center"
            outlineWidth={0.022}
            outlineColor="#052e16"
          >
            {p.label}
          </Text>
        </Billboard>
      ))}
    </>
  );
}

function CourtDais() {
  return (
    <group position={[0, 0, 16]}>
      <mesh position={[0, 0.15, 0]} receiveShadow>
        <cylinderGeometry args={[2.8, 3.0, 0.32, 32]} />
        <meshPhysicalMaterial
          color="#1e1b4b"
          metalness={0.5}
          roughness={0.4}
          clearcoat={0.3}
        />
      </mesh>
      <mesh position={[0, 0.38, 0]}>
        <cylinderGeometry args={[2.0, 2.0, 0.14, 32]} />
        <meshStandardMaterial
          color="#6d28d9"
          emissive="#7c3aed"
          emissiveIntensity={1.2}
          toneMapped={false}
        />
      </mesh>
      <Billboard position={[0, 1.35, 0]}>
        <Text
          fontSize={0.32}
          color="#e9d5ff"
          anchorX="center"
          outlineWidth={0.02}
          outlineColor="#000"
        >
          COURT IN SESSION
        </Text>
      </Billboard>
    </group>
  );
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <hemisphereLight args={["#1e293b", "#020617", 0.45]} />
      <directionalLight
        position={[16, 28, 14]}
        intensity={1.35}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={80}
        shadow-camera-left={-35}
        shadow-camera-right={35}
        shadow-camera-top={35}
        shadow-camera-bottom={-35}
        color="#e2e8f0"
      />
      <pointLight position={[-14, 7, -8]} intensity={1.2} color="#34d399" distance={36} />
      <pointLight position={[14, 6, 8]} intensity={1.0} color="#22d3ee" distance={36} />
      <pointLight position={[0, 7, 16]} intensity={1.4} color="#a78bfa" distance={28} />
    </>
  );
}

function SceneContent({
  snapshot,
  selection,
  onSelect,
  cameraMode,
  followAgentId,
}: {
  snapshot: WorldSnapshot;
  selection: WorldSelection;
  onSelect: (s: WorldSelection) => void;
  cameraMode: CameraMode;
  followAgentId: string | null;
}) {
  const center = contentCenter(snapshot);

  return (
    <>
      <OrthographicCamera makeDefault near={-100} far={250} zoom={36} />
      <FrameCamera snapshot={snapshot} />
      <Lights />
      <Environment preset="night" environmentIntensity={0.55} />
      <Floor />
      <SceneDressing />
      <CourtDais />
      <NegotiateLinks snapshot={snapshot} />
      <DealPopups snapshot={snapshot} />
      {snapshot.stalls.map((s) => (
        <StallMesh
          key={s.id}
          stall={s}
          selected={selection?.kind === "stall" && selection.id === s.id}
          onSelect={() => onSelect({ kind: "stall", id: s.id })}
        />
      ))}
      {snapshot.agents.map((a) => (
        <WorldAgentMesh
          key={a.id}
          agent={a}
          stalls={snapshot.stalls}
          selected={selection?.kind === "agent" && selection.id === a.id}
          onSelect={() => onSelect({ kind: "agent", id: a.id })}
        />
      ))}
      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.55}
        scale={70}
        blur={2.8}
        far={16}
        color="#000000"
      />
      <OrbitControls
        makeDefault
        enablePan
        minPolarAngle={0.4}
        maxPolarAngle={Math.PI / 2.25}
        minZoom={18}
        maxZoom={75}
        target={[center.x, 0, center.z]}
      />
      <CameraDirector
        mode={cameraMode}
        followAgentId={followAgentId}
        snapshot={snapshot}
      />
      <EffectComposer multisampling={0}>
        <SMAA />
        <Bloom
          intensity={0.85}
          luminanceThreshold={0.35}
          luminanceSmoothing={0.7}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.15} darkness={0.55} />
      </EffectComposer>
    </>
  );
}

export function IsoScene({
  snapshot,
  selection,
  onSelect,
  cameraMode,
  followAgentId,
}: {
  snapshot: WorldSnapshot;
  selection: WorldSelection;
  onSelect: (s: WorldSelection) => void;
  cameraMode: CameraMode;
  followAgentId: string | null;
}) {
  return (
    <div
      className="w-full rounded-2xl overflow-hidden border border-white/10 bg-[#050507] relative"
      style={{ height: "min(70vh, 640px)", minHeight: 520 }}
    >
      <Canvas
        className="!w-full !h-full"
        style={{ width: "100%", height: "100%" }}
        shadows
        dpr={[1, 1.75]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
        onPointerMissed={() => onSelect(null)}
      >
        <color attach="background" args={["#06080f"]} />
        <fog attach="fog" args={["#06080f", 50, 100]} />
        <SceneContent
          snapshot={snapshot}
          selection={selection}
          onSelect={onSelect}
          cameraMode={cameraMode}
          followAgentId={followAgentId}
        />
      </Canvas>
    </div>
  );
}
