"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import {
  Html,
  OrbitControls,
  ContactShadows,
  Text,
} from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { ROLE_BY_ID } from "@/lib/agents/roles";
import type { WorldAgent, WorldStall, WorldSnapshot } from "@/lib/types";

function Floor() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[48, 48]} />
        <meshStandardMaterial color="#0c0f14" metalness={0.2} roughness={0.85} />
      </mesh>
      <gridHelper args={[48, 24, "#1f2937", "#111827"]} position={[0, 0.01, 0]} />
    </group>
  );
}

function StallMesh({ stall }: { stall: WorldStall }) {
  const sold = stall.status !== "active" || stall.stock <= 0;
  return (
    <group position={[stall.x, 0, stall.z]}>
      {/* Base */}
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[1.6, 0.7, 1.2]} />
        <meshStandardMaterial
          color={sold ? "#3f3f46" : "#14532d"}
          metalness={0.3}
          roughness={0.5}
        />
      </mesh>
      {/* Awning */}
      <mesh position={[0, 0.95, 0]} castShadow>
        <boxGeometry args={[1.8, 0.12, 1.4]} />
        <meshStandardMaterial color={sold ? "#52525b" : "#10b981"} />
      </mesh>
      {/* Pole */}
      <mesh position={[0, 1.3, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.5, 8]} />
        <meshStandardMaterial color="#a1a1aa" />
      </mesh>
      <Html position={[0, 1.85, 0]} center distanceFactor={12}>
        <div className="px-2 py-1 rounded-md bg-black/70 border border-white/10 text-[10px] text-white whitespace-nowrap pointer-events-none">
          <div className="font-semibold max-w-[120px] truncate">{stall.title}</div>
          <div className="text-emerald-300">£{stall.price}</div>
        </div>
      </Html>
    </group>
  );
}

function AgentMesh({ agent }: { agent: WorldAgent }) {
  const ref = useRef<THREE.Group>(null);
  const color = ROLE_BY_ID[agent.role]?.hex || "#94a3b8";
  const bob = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.position.y = 0.55 + Math.sin(t * 2 + bob) * 0.06;
    if (agent.activity === "negotiating" || agent.activity === "scouting") {
      ref.current.rotation.y = t * 0.8;
    }
  });

  return (
    <group ref={ref} position={[agent.x, 0.55, agent.z]}>
      <mesh castShadow>
        <capsuleGeometry args={[0.28, 0.45, 4, 8]} />
        <meshStandardMaterial color={color} metalness={0.55} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.25} />
      </mesh>
      {/* visor */}
      <mesh position={[0, 0.58, 0.16]}>
        <boxGeometry args={[0.28, 0.1, 0.06]} />
        <meshStandardMaterial
          color="#67e8f9"
          emissive="#22d3ee"
          emissiveIntensity={0.8}
        />
      </mesh>
      <Html position={[0, 1.15, 0]} center distanceFactor={10}>
        <div className="px-1.5 py-0.5 rounded bg-black/75 border border-white/10 text-[9px] text-zinc-100 whitespace-nowrap pointer-events-none">
          <span className="font-medium">{agent.name}</span>
          <span className="text-zinc-500"> · {agent.activity}</span>
        </div>
      </Html>
    </group>
  );
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.45} />
      <directionalLight
        position={[12, 18, 8]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-8, 6, -6]} intensity={0.4} color="#34d399" />
      <pointLight position={[8, 5, 6]} intensity={0.35} color="#22d3ee" />
    </>
  );
}

function SceneContent({ snapshot }: { snapshot: WorldSnapshot }) {
  return (
    <>
      <Lights />
      <Floor />
      {snapshot.stalls.map((s) => (
        <StallMesh key={s.id} stall={s} />
      ))}
      {snapshot.agents.map((a) => (
        <AgentMesh key={a.id} agent={a} />
      ))}
      <ContactShadows
        position={[0, 0, 0]}
        opacity={0.45}
        scale={40}
        blur={2.5}
        far={12}
      />
      <Text
        position={[0, 0.02, 14]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.8}
        color="#27272a"
        anchorX="center"
        anchorY="middle"
      >
        BOTMART LIVE FLOOR
      </Text>
      <OrbitControls
        makeDefault
        enablePan
        minPolarAngle={0.35}
        maxPolarAngle={Math.PI / 2.15}
        minDistance={8}
        maxDistance={42}
        target={[0, 0, 0]}
      />
    </>
  );
}

export function IsoScene({ snapshot }: { snapshot: WorldSnapshot }) {
  return (
    <div className="w-full h-full min-h-[420px] rounded-2xl overflow-hidden border border-white/10 bg-[#050507]">
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{
          position: [16, 14, 16],
          fov: 42,
          near: 0.1,
          far: 200,
        }}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={["#050507"]} />
        <fog attach="fog" args={["#050507", 25, 55]} />
        <SceneContent snapshot={snapshot} />
      </Canvas>
    </div>
  );
}
