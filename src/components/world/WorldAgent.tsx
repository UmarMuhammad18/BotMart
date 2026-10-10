"use client";

import { useFrame } from "@react-three/fiber";
import { Text, Billboard } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { ROLE_BY_ID } from "@/lib/agents/roles";
import type { WorldAgent, WorldStall } from "@/lib/types";
import { wanderTarget } from "@/components/world/busyMotion";
import { AgentLaptop, laptopTextForAgent } from "@/components/world/AgentLaptop";

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

      {/* Retro laptop — screen shows sell / activity text */}
      <AgentLaptop
        screenText={laptopTextForAgent(agent, stalls, agent.id)}
        accent={ringColor}
      />

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
