"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  ContactShadows,
  Text,
  Billboard,
  OrthographicCamera,
  Line,
} from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { ROLE_BY_ID } from "@/lib/agents/roles";
import type { WorldAgent, WorldStall, WorldSnapshot } from "@/lib/types";
import type { CameraMode, WorldSelection } from "@/components/world/WorldCanvas";
import { ProductMesh } from "@/components/world/ProductMesh";
import { wanderTarget, pulsePhase } from "@/components/world/busyMotion";

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
        <planeGeometry args={[64, 64]} />
        <meshStandardMaterial color="#0a0c12" metalness={0.2} roughness={0.92} />
      </mesh>
      <gridHelper args={[64, 32, "#1e293b", "#111827"]} position={[0, 0.02, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[20, 20.2, 64]} />
        <meshBasicMaterial color="#10b981" transparent opacity={0.22} />
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
      {/* counter */}
      <mesh position={[0, 0.28, 0]} castShadow>
        <boxGeometry args={[1.9, 0.55, 1.45]} />
        <meshStandardMaterial
          color={sold ? "#3f3f46" : "#0c2e24"}
          metalness={0.35}
          roughness={0.45}
          emissive={selected ? "#10b981" : "#000000"}
          emissiveIntensity={selected ? 0.3 : 0}
        />
      </mesh>
      <mesh position={[0, 0.58, 0]} castShadow>
        <boxGeometry args={[2.05, 0.08, 1.55]} />
        <meshStandardMaterial color={sold ? "#52525b" : "#115e45"} metalness={0.4} />
      </mesh>
      {!sold && (
        <mesh position={[0, 1.2, 0.1]} castShadow>
          <boxGeometry args={[2.15, 0.07, 1.65]} />
          <meshStandardMaterial
            color="#10b981"
            emissive="#059669"
            emissiveIntensity={0.45}
          />
        </mesh>
      )}
      {sold && (
        <mesh position={[0, 0.95, 0.75]}>
          <boxGeometry args={[1.8, 1.15, 0.05]} />
          <meshStandardMaterial color="#27272a" metalness={0.6} />
        </mesh>
      )}
      {/* Actual product on the counter */}
      {!sold && (
        <ProductMesh category={stall.category} title={stall.title} sold={false} />
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
        <meshBasicMaterial color={stockPct > 0.3 ? "#34d399" : "#f59e0b"} />
      </mesh>
      <Billboard position={[0, 2.15, 0]}>
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
      // Face the stall
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
        <ringGeometry args={[0.42, 0.5, 24]} />
        <meshBasicMaterial
          color={ringColor}
          transparent
          opacity={selected ? 0.95 : 0.55}
        />
      </mesh>
      <mesh castShadow>
        <capsuleGeometry args={[0.26, 0.4, 4, 10]} />
        <meshStandardMaterial
          color={color}
          metalness={0.65}
          roughness={0.28}
          emissive={selected ? color : "#000000"}
          emissiveIntensity={selected ? 0.25 : 0}
        />
      </mesh>
      <mesh position={[0, 0.52, 0]} castShadow>
        <boxGeometry args={[0.38, 0.32, 0.34]} />
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.22} />
      </mesh>
      <mesh position={[0, 0.54, 0.16]}>
        <boxGeometry args={[0.3, 0.1, 0.06]} />
        <meshStandardMaterial
          color="#67e8f9"
          emissive="#22d3ee"
          emissiveIntensity={1.2}
        />
      </mesh>
      <mesh position={[0.12, 0.78, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.22, 6]} />
        <meshStandardMaterial color="#a1a1aa" />
      </mesh>
      <mesh position={[0.12, 0.92, 0]}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshStandardMaterial
          color={ringColor}
          emissive={ringColor}
          emissiveIntensity={0.9}
        />
      </mesh>
      {/* activity chip */}
      <Billboard position={[0, 1.2, 0]}>
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
        const mid = new THREE.Vector3(
          (a.x + s.x) / 2,
          1.9,
          (a.z + s.z) / 2
        );
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
              opacity={0.85}
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
            {/* spark dots along the arc */}
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
      <sphereGeometry args={[0.08, 8, 8]} />
      <meshStandardMaterial
        color="#fbbf24"
        emissive="#f59e0b"
        emissiveIntensity={2}
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
        <cylinderGeometry args={[2.4, 2.6, 0.3, 32]} />
        <meshStandardMaterial color="#1e1b4b" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[1.7, 1.7, 0.12, 32]} />
        <meshStandardMaterial
          color="#4c1d95"
          emissive="#7c3aed"
          emissiveIntensity={0.35}
        />
      </mesh>
      <Billboard position={[0, 1.3, 0]}>
        <Text
          fontSize={0.32}
          color="#c4b5fd"
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
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[12, 22, 10]}
        intensity={1.15}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[-10, 6, -6]} intensity={0.45} color="#34d399" />
      <pointLight position={[10, 5, 6]} intensity={0.4} color="#22d3ee" />
      <pointLight position={[0, 5, 11]} intensity={0.55} color="#a78bfa" />
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
      <Floor />
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
        position={[0, 0, 0]}
        opacity={0.45}
        scale={50}
        blur={2.2}
        far={14}
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
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        }}
        onPointerMissed={() => onSelect(null)}
      >
        <color attach="background" args={["#0a0c12"]} />
        <fog attach="fog" args={["#0a0c12", 45, 90]} />
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
