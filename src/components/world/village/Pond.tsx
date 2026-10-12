"use client";

import { useMemo } from "react";
import { POND, seeded } from "@/lib/world/terrain";

/** A reflective pond in the meadow, with lily pads and reeds. */
export function Pond() {
  const pads = useMemo(() => {
    const rand = seeded(2718);
    return Array.from({ length: 9 }, () => {
      const a = rand() * Math.PI * 2;
      const r = 0.35 + rand() * 0.5;
      return { x: Math.cos(a) * POND.rx * r, z: Math.sin(a) * POND.rz * r, s: 0.35 + rand() * 0.3, rot: rand() * 6 };
    });
  }, []);
  const reeds = useMemo(() => {
    const rand = seeded(1618);
    return Array.from({ length: 46 }, () => {
      const a = rand() * Math.PI * 2;
      const k = 1.02 + rand() * 0.18;
      return { x: Math.cos(a) * POND.rx * k, z: Math.sin(a) * POND.rz * k, h: 0.7 + rand() * 0.8, lean: (rand() - 0.5) * 0.3 };
    });
  }, []);
  return (
    <group position={[POND.x, 0, POND.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.18, 0]} scale={[POND.rx, POND.rz, 1]} receiveShadow>
        <circleGeometry args={[1, 96]} />
        <meshPhysicalMaterial color="#2f6f73" roughness={0.04} metalness={0.05} clearcoat={1} clearcoatRoughness={0.03} envMapIntensity={1.6} />
      </mesh>
      {pads.map((p, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, p.rot]} position={[p.x, -0.165, p.z]} scale={p.s}>
          <circleGeometry args={[1, 24, 0.3, Math.PI * 2 - 0.6]} />
          <meshStandardMaterial color="#4f8f3a" roughness={0.55} />
        </mesh>
      ))}
      {reeds.map((r, i) => (
        <mesh key={i} position={[r.x, r.h / 2 - 0.2, r.z]} rotation={[r.lean, 0, r.lean]} castShadow>
          <cylinderGeometry args={[0.02, 0.035, r.h, 16]} />
          <meshStandardMaterial color="#6b8f3a" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}
