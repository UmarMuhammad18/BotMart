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
  const x = (minX + maxX) / 2;
  const z = (minZ + maxZ) / 2;
  const radius = Math.max(maxX - minX, maxZ - minZ, 8) * 0.55 + 4;
  return { x, z, radius };
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
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[1.8, 0.6, 1.4]} />
        <meshStandardMaterial
          color={sold ? "#3f3f46" : "#0f3d2e"}
          metalness={0.35}
          roughness={0.45}
          emissive={selected ? "#10b981" : "#000000"}
          emissiveIntensity={selected ? 0.35 : 0}
        />
      </mesh>
      <mesh position={[0, 0.65, 0]} castShadow>
        <boxGeometry args={[2, 0.1, 1.55]} />
        <meshStandardMaterial
          color={sold ? "#52525b" : "#134e3a"}
          metalness={0.4}
        />
      </mesh>
      {!sold && (
        <mesh position={[0, 1.15, 0.15]} castShadow>
          <boxGeometry args={[2.1, 0.08, 1.7]} />
          <meshStandardMaterial
            color="#10b981"
            emissive="#059669"
            emissiveIntensity={0.4}
          />
        </mesh>
      )}
      {sold && (
        <mesh position={[0, 0.9, 0.72]}>
          <boxGeometry args={[1.7, 1.1, 0.06]} />
          <meshStandardMaterial color="#27272a" metalness={0.6} />
        </mesh>
      )}
      <mesh position={[-0.7, 0.12, 0.75]}>
        <boxGeometry args={[0.5, 0.08, 0.06]} />
        <meshBasicMaterial color="#27272a" />
      </mesh>
      <mesh
        position={[-0.7 - 0.25 * (1 - stockPct), 0.12, 0.76]}
        scale={[stockPct || 0.05, 1, 1]}
      >
        <boxGeometry args={[0.5, 0.06, 0.04]} />
        <meshBasicMaterial color={stockPct > 0.3 ? "#34d399" : "#f59e0b"} />
      </mesh>
      <Billboard position={[0, 2.0, 0]}>
        <Text
          fontSize={0.26}
          color="#fafafa"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.02}
          outlineColor="#000"
        >
          {label}
        </Text>
        <Text
          position={[0, -0.28, 0]}
          fontSize={0.22}
          color={sold ? "#a1a1aa" : "#6ee7b7"}
          anchorX="center"
          anchorY="top"
          outlineWidth={0.015}
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
  selected,
  onSelect,
}: {
  agent: WorldAgent;
  selected: boolean;
  onSelect: () => void;
}) {
  const group = useRef<THREE.Group>(null);
  const pos = useRef(new THREE.Vector3(agent.x, 0, agent.z));
  const targetRef = useRef(new THREE.Vector3(agent.x, 0, agent.z));
  const color = ROLE_BY_ID[agent.role]?.hex || "#94a3b8";
  const bob = useMemo(() => Math.random() * Math.PI * 2, []);

  useEffect(() => {
    targetRef.current.set(agent.x, 0, agent.z);
  }, [agent.x, agent.z]);

  useFrame(({ clock }, dt) => {
    if (!group.current) return;
    pos.current.lerp(targetRef.current, Math.min(1, dt * 1.6));
    const t = clock.getElapsedTime();
    const y = 0.55 + Math.sin(t * 2.4 + bob) * 0.04;
    group.current.position.set(pos.current.x, y, pos.current.z);
    const dir = targetRef.current.clone().sub(pos.current);
    if (dir.lengthSq() > 0.02) {
      group.current.rotation.y = THREE.MathUtils.lerp(
        group.current.rotation.y,
        Math.atan2(dir.x, dir.z),
        0.12
      );
    } else if (agent.activity === "negotiating") {
      group.current.rotation.y = t * 0.5;
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
      <Billboard position={[0, 1.15, 0]}>
        <Text
          fontSize={0.2}
          color="#f4f4f5"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.014}
          outlineColor="#000"
        >
          {short}
        </Text>
        <Text
          position={[0, -0.22, 0]}
          fontSize={0.14}
          color="#a1a1aa"
          anchorX="center"
          anchorY="top"
          outlineWidth={0.01}
          outlineColor="#000"
        >
          {agent.activity}
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
        return (
          <Line
            key={`${link.agent_id}-${link.stall_id}`}
            points={[
              new THREE.Vector3(a.x, 0.9, a.z),
              new THREE.Vector3((a.x + s.x) / 2, 1.8, (a.z + s.z) / 2),
              new THREE.Vector3(s.x, 1.2, s.z),
            ]}
            color="#fbbf24"
            lineWidth={2}
            transparent
            opacity={0.75}
          />
        );
      })}
    </>
  );
}

function DealPopups({ snapshot }: { snapshot: WorldSnapshot }) {
  return (
    <>
      {(snapshot.deal_popups || []).map((p, i) => (
        <Billboard key={p.id} position={[p.x, 2.6 + (i % 3) * 0.12, p.z]}>
          <Text
            fontSize={0.32}
            color="#6ee7b7"
            anchorX="center"
            outlineWidth={0.025}
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
        <cylinderGeometry args={[2.2, 2.4, 0.3, 32]} />
        <meshStandardMaterial color="#1e1b4b" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[1.6, 1.6, 0.12, 32]} />
        <meshStandardMaterial
          color="#4c1d95"
          emissive="#7c3aed"
          emissiveIntensity={0.3}
        />
      </mesh>
      <Billboard position={[0, 1.2, 0]}>
        <Text
          fontSize={0.3}
          color="#c4b5fd"
          anchorX="center"
          outlineWidth={0.02}
          outlineColor="#000"
        >
          COURT
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
      <pointLight position={[0, 5, 11]} intensity={0.5} color="#a78bfa" />
    </>
  );
}

/** Frames orthographic camera so the market fills the whole canvas */
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
    // True isometric offset from content center
    const dist = 22;
    cam.position.set(c.x + dist, dist * 0.95, c.z + dist);
    cam.lookAt(c.x, 0, c.z);
    cam.near = -80;
    cam.far = 200;
    // Zoom so content radius fits both axes
    const aspect = size.width / Math.max(size.height, 1);
    const fit = c.radius * 1.15;
    cam.zoom = Math.min(size.height, size.width / aspect) / (fit * 2.8);
    cam.zoom = THREE.MathUtils.clamp(cam.zoom, 12, 42);
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
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
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
