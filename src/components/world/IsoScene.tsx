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
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { ROLE_BY_ID } from "@/lib/agents/roles";
import type { WorldAgent, WorldStall, WorldSnapshot } from "@/lib/types";
import type { CameraMode, WorldSelection } from "@/components/world/WorldCanvas";
import { ProductMesh } from "@/components/world/ProductMesh";
import { wanderTarget, pulsePhase } from "@/components/world/busyMotion";
import { SceneDressing } from "@/components/world/SceneDressing";

function contentCenter(snapshot: WorldSnapshot) {
  const pts = [
    ...snapshot.stalls.map((s) => [s.x, s.z] as const),
    ...snapshot.agents.map((a) => [a.x, a.z] as const),
  ];
  if (pts.length === 0) return { x: 0, z: 0, radius: 12 };
  let minX = Infinity,
    maxX = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity;
  for (const [x, z] of pts) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }
  return {
    x: (minX + maxX) / 2,
    z: (minZ + maxZ) / 2,
    radius: Math.max(maxX - minX, maxZ - minZ, 8) * 0.55 + 4,
  };
}

function Floor() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[72, 72]} />
        <meshStandardMaterial
          color="#080b12"
          metalness={0.35}
          roughness={0.75}
          envMapIntensity={0.4}
        />
      </mesh>
      <gridHelper args={[64, 32, "#1e293b", "#0f172a"]} position={[0, 0.025, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[19.5, 19.75, 64]} />
        <meshBasicMaterial color="#10b981" transparent opacity={0.28} toneMapped={false} />
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

function AgentMesh({
  agent,
  stalls,
  selected,
  onSelect,
}: {
  agent: WorldAgent;
  stalls: WorldStall[];
  selected: boolean;
  onSelect: () => void;
}) {
  const group = useRef<THREE.Group>(null);
  const pos = useRef(new THREE.Vector3(agent.x, 0, agent.z));
  const color = ROLE_BY_ID[agent.role]?.hex || "#94a3b8";
  const bob = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame(({ clock }, dt) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();
    const target = wanderTarget(agent, t, stalls);
    const targetV = new THREE.Vector3(target.x, 0, target.z);
    pos.current.lerp(targetV, Math.min(1, dt * 1.8));
    const y = 0.55 + Math.sin(t * 2.6 + bob) * 0.05;
    group.current.position.set(pos.current.x, y, pos.current.z);
    const dir = targetV.clone().sub(pos.current);
    if (dir.lengthSq() > 0.01) {
      group.current.rotation.y = THREE.MathUtils.lerp(
        group.current.rotation.y,
        Math.atan2(dir.x, dir.z),
        0.14
      );
    } else if (agent.activity === "negotiating") {
      const st = stalls.find((s) => s.id === agent.target_stall_id);
      if (st) {
        const ang = Math.atan2(st.x - pos.current.x, st.z - pos.current.z);
        group.current.rotation.y = THREE.MathUtils.lerp(
          group.current.rotation.y,
          ang,
          0.1
        );
      }
    }
  });

  const short =
    agent.name.length > 11 ? agent.name.slice(0, 10) + "…" : agent.name;
  const ringColor =
    agent.activity === "negotiating"
      ? "#fbbf24"
      : agent.activity === "scouting"
        ? "#22d3ee"
        : agent.activity === "jury"
          ? "#a78bfa"
          : color;

  return (
    <group
      ref={group}
      position={[agent.x, 0.55, agent.z]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.52, 0]}>
        <ringGeometry args={[0.42, 0.52, 28]} />
        <meshBasicMaterial
          color={ringColor}
          transparent
          opacity={selected ? 0.95 : 0.6}
          toneMapped={false}
        />
      </mesh>
      <mesh castShadow>
        <capsuleGeometry args={[0.26, 0.4, 4, 12]} />
        <meshPhysicalMaterial
          color={color}
          metalness={0.75}
          roughness={0.2}
          clearcoat={0.6}
          clearcoatRoughness={0.2}
          emissive={selected ? color : "#000000"}
          emissiveIntensity={selected ? 0.3 : 0}
          envMapIntensity={1.2}
        />
      </mesh>
      <mesh position={[0, 0.52, 0]} castShadow>
        <boxGeometry args={[0.38, 0.32, 0.34]} />
        <meshPhysicalMaterial
          color={color}
          metalness={0.8}
          roughness={0.15}
          clearcoat={0.7}
          envMapIntensity={1.3}
        />
      </mesh>
      <mesh position={[0, 0.54, 0.16]}>
        <boxGeometry args={[0.3, 0.1, 0.06]} />
        <meshStandardMaterial
          color="#67e8f9"
          emissive="#22d3ee"
          emissiveIntensity={2.5}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0.12, 0.78, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.22, 6]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.15} />
      </mesh>
      <mesh position={[0.12, 0.92, 0]}>
        <sphereGeometry args={[0.05, 10, 10]} />
        <meshStandardMaterial
          color={ringColor}
          emissive={ringColor}
          emissiveIntensity={2}
          toneMapped={false}
        />
      </mesh>
      <Billboard position={[0, 1.22, 0]}>
        <Text
          fontSize={0.18}
          color="#f4f4f5"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.012}
          outlineColor="#000"
        >
          {short}
        </Text>
        <Text
          position={[0, -0.2, 0]}
          fontSize={0.13}
          color={ringColor}
          anchorX="center"
          anchorY="top"
          outlineWidth={0.01}
          outlineColor="#000"
        >
          {agent.activity === "negotiating"
            ? "deal…"
            : agent.activity === "scouting"
              ? "browsing"
              : agent.activity === "jury"
                ? "in court"
                : agent.activity}
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
    <group position={[0, 0, 11]}>
      <mesh position={[0, 0.15, 0]} receiveShadow>
        <cylinderGeometry args={[2.5, 2.7, 0.32, 32]} />
        <meshPhysicalMaterial
          color="#1e1b4b"
          metalness={0.5}
          roughness={0.4}
          clearcoat={0.3}
        />
      </mesh>
      <mesh position={[0, 0.38, 0]}>
        <cylinderGeometry args={[1.75, 1.75, 0.14, 32]} />
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
        position={[14, 24, 12]}
        intensity={1.35}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={60}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
        color="#e2e8f0"
      />
      <pointLight position={[-10, 6, -6]} intensity={1.2} color="#34d399" distance={28} />
      <pointLight position={[10, 5, 6]} intensity={1.0} color="#22d3ee" distance={28} />
      <pointLight position={[0, 6, 11]} intensity={1.4} color="#a78bfa" distance={22} />
    </>
  );
}

function FrameCamera({ snapshot }: { snapshot: WorldSnapshot }) {
  const { camera, size } = useThree();
  const framed = useRef(false);

  useEffect(() => {
    framed.current = false;
  }, [snapshot.agents.length, snapshot.stalls.length, size.width, size.height]);

  useEffect(() => {
    if (framed.current) return;
    const c = contentCenter(snapshot);
    const cam = camera as THREE.OrthographicCamera;
    const dist = 22;
    cam.position.set(c.x + dist, dist * 0.95, c.z + dist);
    cam.lookAt(c.x, 0, c.z);
    cam.near = -80;
    cam.far = 200;
    const aspect = size.width / Math.max(size.height, 1);
    const fit = c.radius * 1.15;
    cam.zoom = THREE.MathUtils.clamp(
      Math.min(size.height, size.width / aspect) / (fit * 2.8),
      12,
      42
    );
    cam.updateProjectionMatrix();
    framed.current = true;
  }, [camera, snapshot, size.height, size.width]);

  return null;
}

function CameraDirector({
  mode,
  followAgentId,
  snapshot,
}: {
  mode: CameraMode;
  followAgentId: string | null;
  snapshot: WorldSnapshot;
}) {
  const { camera } = useThree();
  const controls = useThree((s) => s.controls) as
    | { target: THREE.Vector3; update: () => void; enabled: boolean }
    | undefined;

  useFrame(() => {
    if (!controls) return;
    if (mode === "overview") {
      controls.enabled = true;
      return;
    }
    if (mode === "court") {
      controls.enabled = false;
      camera.position.lerp(new THREE.Vector3(10, 12, 22), 0.07);
      controls.target.lerp(new THREE.Vector3(0, 0.4, 11), 0.07);
      controls.update();
      return;
    }
    if (mode === "follow" && followAgentId) {
      const a = snapshot.agents.find((x) => x.id === followAgentId);
      if (!a) return;
      controls.enabled = false;
      camera.position.lerp(new THREE.Vector3(a.x + 9, 11, a.z + 9), 0.09);
      controls.target.lerp(new THREE.Vector3(a.x, 0.5, a.z), 0.09);
      controls.update();
    }
  });

  return null;
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
      <OrthographicCamera makeDefault near={-80} far={200} />
      <FrameCamera snapshot={snapshot} />
      <Lights />
      {/* Night city HDR — reflections on metal agents/stalls */}
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
        <AgentMesh
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
        scale={55}
        blur={2.8}
        far={16}
        color="#000000"
      />
      <OrbitControls
        makeDefault
        enablePan
        minPolarAngle={0.4}
        maxPolarAngle={Math.PI / 2.25}
        minZoom={10}
        maxZoom={50}
        target={[center.x, 0, center.z]}
      />
      <CameraDirector
        mode={cameraMode}
        followAgentId={followAgentId}
        snapshot={snapshot}
      />
      {/* Cinematic post stack */}
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
        <fog attach="fog" args={["#06080f", 40, 85]} />
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
