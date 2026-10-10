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

function Floor() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[56, 56]} />
        <meshStandardMaterial color="#080a0e" metalness={0.25} roughness={0.9} />
      </mesh>
      <gridHelper args={[56, 28, "#1a2332", "#0f141c"]} position={[0, 0.02, 0]} />
      {/* neon rim */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[22, 22.15, 64]} />
        <meshBasicMaterial color="#10b981" transparent opacity={0.25} />
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
  const label = stall.title.length > 16 ? stall.title.slice(0, 15) + "…" : stall.title;

  return (
    <group
      position={[stall.x, 0, stall.z]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* base */}
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
      {/* counter top */}
      <mesh position={[0, 0.65, 0]} castShadow>
        <boxGeometry args={[2, 0.1, 1.55]} />
        <meshStandardMaterial color={sold ? "#52525b" : "#134e3a"} metalness={0.4} />
      </mesh>
      {/* awning */}
      {!sold && (
        <mesh position={[0, 1.15, 0.15]} castShadow>
          <boxGeometry args={[2.1, 0.08, 1.7]} />
          <meshStandardMaterial
            color="#10b981"
            emissive="#059669"
            emissiveIntensity={0.4}
            metalness={0.2}
          />
        </mesh>
      )}
      {/* shutter when sold */}
      {sold && (
        <mesh position={[0, 0.9, 0.72]}>
          <boxGeometry args={[1.7, 1.1, 0.06]} />
          <meshStandardMaterial color="#27272a" metalness={0.6} roughness={0.3} />
        </mesh>
      )}
      {/* stock bar */}
      <mesh position={[-0.7, 0.12, 0.75]}>
        <boxGeometry args={[0.5, 0.08, 0.06]} />
        <meshBasicMaterial color="#27272a" />
      </mesh>
      <mesh position={[-0.7 - 0.25 * (1 - stockPct), 0.12, 0.76]} scale={[stockPct, 1, 1]}>
        <boxGeometry args={[0.5, 0.06, 0.04]} />
        <meshBasicMaterial color={stockPct > 0.3 ? "#34d399" : "#f59e0b"} />
      </mesh>
      {/* pole + sign */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.6, 8]} />
        <meshStandardMaterial color="#71717a" />
      </mesh>
      <Billboard position={[0, 2.1, 0]}>
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
      {/* status ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.52, 0]}>
        <ringGeometry args={[0.42, 0.5, 24]} />
        <meshBasicMaterial
          color={ringColor}
          transparent
          opacity={selected ? 0.95 : 0.55}
        />
      </mesh>
      {/* body */}
      <mesh castShadow position={[0, 0, 0]}>
        <capsuleGeometry args={[0.26, 0.4, 4, 10]} />
        <meshStandardMaterial
          color={color}
          metalness={0.65}
          roughness={0.28}
          emissive={selected ? color : "#000000"}
          emissiveIntensity={selected ? 0.25 : 0}
        />
      </mesh>
      {/* head */}
      <mesh position={[0, 0.52, 0]} castShadow>
        <boxGeometry args={[0.38, 0.32, 0.34]} />
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.22} />
      </mesh>
      {/* visor */}
      <mesh position={[0, 0.54, 0.16]}>
        <boxGeometry args={[0.3, 0.1, 0.06]} />
        <meshStandardMaterial
          color="#67e8f9"
          emissive="#22d3ee"
          emissiveIntensity={1.2}
        />
      </mesh>
      {/* antenna */}
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

function NegotiateLinks({
  snapshot,
}: {
  snapshot: WorldSnapshot;
}) {
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
        const points = [
          new THREE.Vector3(a.x, 0.9, a.z),
          new THREE.Vector3((a.x + s.x) / 2, 1.8, (a.z + s.z) / 2),
          new THREE.Vector3(s.x, 1.2, s.z),
        ];
        return (
          <Line
            key={`${link.agent_id}-${link.stall_id}`}
            points={points}
            color="#fbbf24"
            lineWidth={2}
            transparent
            opacity={0.75}
            dashed={false}
          />
        );
      })}
    </>
  );
}

function DealPopups({ snapshot }: { snapshot: WorldSnapshot }) {
  const tRef = useRef(0);
  useFrame((_, dt) => {
    tRef.current += dt;
  });

  return (
    <>
      {(snapshot.deal_popups || []).map((p, i) => (
        <Billboard key={p.id} position={[p.x, 2.6 + (i % 3) * 0.15, p.z]}>
          <Text
            fontSize={0.32}
            color="#6ee7b7"
            anchorX="center"
            anchorY="middle"
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
    <group position={[0, 0, 10]}>
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
        <Text fontSize={0.3} color="#c4b5fd" anchorX="center" outlineWidth={0.02} outlineColor="#000">
          COURT
        </Text>
      </Billboard>
    </group>
  );
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.45} />
      <directionalLight
        position={[14, 20, 10]}
        intensity={1.1}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[-10, 6, -8]} intensity={0.5} color="#34d399" />
      <pointLight position={[10, 5, 8]} intensity={0.45} color="#22d3ee" />
      <pointLight position={[0, 4, 10]} intensity={0.55} color="#a78bfa" />
    </>
  );
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
      camera.position.lerp(new THREE.Vector3(8, 10, 18), 0.06);
      controls.target.lerp(new THREE.Vector3(0, 0, 10), 0.06);
      controls.update();
      return;
    }
    if (mode === "follow" && followAgentId) {
      const a = snapshot.agents.find((x) => x.id === followAgentId);
      if (!a) return;
      controls.enabled = false;
      const desired = new THREE.Vector3(a.x + 8, 10, a.z + 8);
      camera.position.lerp(desired, 0.08);
      controls.target.lerp(new THREE.Vector3(a.x, 0.5, a.z), 0.08);
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
  return (
    <>
      <OrthographicCamera
        makeDefault
        zoom={26}
        position={[18, 18, 18]}
        near={-100}
        far={250}
      />
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
      <ContactShadows position={[0, 0, 0]} opacity={0.5} scale={48} blur={2.2} far={14} />
      <Text
        position={[0, 0.03, 16]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.7}
        color="#1f2937"
        anchorX="center"
      >
        BOTMART LIVE FLOOR
      </Text>
      <OrbitControls
        makeDefault
        enablePan
        minPolarAngle={0.35}
        maxPolarAngle={Math.PI / 2.15}
        minZoom={10}
        maxZoom={55}
        target={[0, 0, 0]}
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
    <div className="w-full h-full min-h-[480px] rounded-2xl overflow-hidden border border-white/10 bg-[#050507] relative">
      <Canvas
        shadows
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        onPointerMissed={() => onSelect(null)}
      >
        <color attach="background" args={["#050507"]} />
        <fog attach="fog" args={["#050507", 28, 75]} />
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
