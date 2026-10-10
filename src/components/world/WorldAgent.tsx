"use client";

import { useFrame } from "@react-three/fiber";
import { Text, Billboard } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { ROLE_BY_ID } from "@/lib/agents/roles";
import type { WorldAgent, WorldStall } from "@/lib/types";
import { wanderTarget } from "@/components/world/busyMotion";
import { AgentLaptop, laptopTextForAgent } from "@/components/world/AgentLaptop";

/** Higher-detail procedural robot — more segments, limbs, plating. */
export function WorldAgentMesh({
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
    const y = 0.58 + Math.sin(t * 2.6 + bob) * 0.04;
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

  const bodyMat = {
    color,
    metalness: 0.78,
    roughness: 0.18,
    clearcoat: 0.65,
    clearcoatRoughness: 0.15,
    envMapIntensity: 1.35,
    emissive: selected ? color : "#000000",
    emissiveIntensity: selected ? 0.28 : 0,
  } as const;

  return (
    <group
      ref={group}
      position={[agent.x, 0.58, agent.z]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* ground ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.56, 0]}>
        <ringGeometry args={[0.38, 0.5, 48]} />
        <meshBasicMaterial
          color={ringColor}
          transparent
          opacity={selected ? 0.95 : 0.55}
          toneMapped={false}
        />
      </mesh>

      {/* hips / lower torso */}
      <mesh castShadow position={[0, -0.12, 0]}>
        <cylinderGeometry args={[0.22, 0.26, 0.28, 24]} />
        <meshPhysicalMaterial {...bodyMat} />
      </mesh>

      {/* upper torso */}
      <mesh castShadow position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.28, 0.24, 0.42, 28]} />
        <meshPhysicalMaterial {...bodyMat} />
      </mesh>

      {/* chest plate */}
      <mesh position={[0, 0.2, 0.2]}>
        <boxGeometry args={[0.32, 0.28, 0.06]} />
        <meshPhysicalMaterial
          color="#0f172a"
          metalness={0.9}
          roughness={0.12}
          clearcoat={0.8}
        />
      </mesh>
      <mesh position={[0, 0.2, 0.24]}>
        <circleGeometry args={[0.07, 24]} />
        <meshStandardMaterial
          color={ringColor}
          emissive={ringColor}
          emissiveIntensity={1.8}
          toneMapped={false}
        />
      </mesh>

      {/* shoulders */}
      {([-1, 1] as const).map((side) => (
        <group key={side} position={[side * 0.34, 0.32, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.11, 20, 16]} />
            <meshPhysicalMaterial {...bodyMat} />
          </mesh>
          {/* upper arm */}
          <mesh position={[side * 0.02, -0.2, 0]} castShadow>
            <capsuleGeometry args={[0.07, 0.22, 8, 16]} />
            <meshPhysicalMaterial {...bodyMat} />
          </mesh>
          {/* forearm */}
          <mesh position={[side * 0.02, -0.42, 0.04]} rotation={[0.25, 0, 0]} castShadow>
            <capsuleGeometry args={[0.055, 0.16, 8, 16]} />
            <meshPhysicalMaterial {...bodyMat} />
          </mesh>
        </group>
      ))}

      {/* legs */}
      {([-1, 1] as const).map((side) => (
        <group key={`leg-${side}`} position={[side * 0.12, -0.35, 0]}>
          <mesh castShadow>
            <capsuleGeometry args={[0.075, 0.28, 8, 16]} />
            <meshPhysicalMaterial {...bodyMat} />
          </mesh>
          <mesh position={[0, -0.28, 0.02]} castShadow>
            <boxGeometry args={[0.14, 0.08, 0.22]} />
            <meshPhysicalMaterial
              color="#1e293b"
              metalness={0.7}
              roughness={0.3}
            />
          </mesh>
        </group>
      ))}

      {/* neck */}
      <mesh position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 0.1, 16]} />
        <meshPhysicalMaterial {...bodyMat} />
      </mesh>

      {/* head — rounded box via high-seg sphere + jaw */}
      <mesh position={[0, 0.62, 0]} castShadow>
        <sphereGeometry args={[0.2, 28, 22]} />
        <meshPhysicalMaterial {...bodyMat} />
      </mesh>
      <mesh position={[0, 0.52, 0.06]}>
        <boxGeometry args={[0.28, 0.12, 0.22]} />
        <meshPhysicalMaterial {...bodyMat} />
      </mesh>

      {/* visor — curved feel via thin box + glow */}
      <mesh position={[0, 0.64, 0.14]}>
        <boxGeometry args={[0.28, 0.09, 0.05]} />
        <meshStandardMaterial
          color="#67e8f9"
          emissive="#22d3ee"
          emissiveIntensity={3}
          toneMapped={false}
          transparent
          opacity={0.95}
        />
      </mesh>
      <mesh position={[0, 0.64, 0.12]}>
        <boxGeometry args={[0.3, 0.11, 0.02]} />
        <meshPhysicalMaterial
          color="#0ea5e9"
          metalness={1}
          roughness={0.05}
          transparent
          opacity={0.5}
        />
      </mesh>

      {/* antenna */}
      <mesh position={[0.14, 0.82, 0]}>
        <cylinderGeometry args={[0.018, 0.022, 0.2, 12]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.1} />
      </mesh>
      <mesh position={[0.14, 0.94, 0]}>
        <sphereGeometry args={[0.045, 16, 16]} />
        <meshStandardMaterial
          color={ringColor}
          emissive={ringColor}
          emissiveIntensity={2.2}
          toneMapped={false}
        />
      </mesh>

      <AgentLaptop
        screenText={laptopTextForAgent(agent, stalls, agent.id)}
        accent={ringColor}
      />

      <Billboard position={[0, 1.28, 0]}>
        <Text
          fontSize={0.17}
          color="#f4f4f5"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.012}
          outlineColor="#000"
        >
          {short}
        </Text>
        <Text
          position={[0, -0.18, 0]}
          fontSize={0.12}
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
