"use client";

import { Text, Billboard } from "@react-three/drei";

/** Market architecture: pillars, neon signs, court backdrop — pure mesh, no external assets. */
export function SceneDressing() {
  return (
    <group>
      {/* Perimeter pillars */}
      {(
        [
          [-14, -14],
          [14, -14],
          [-14, 14],
          [14, 14],
          [-14, 0],
          [14, 0],
          [0, -14],
        ] as const
      ).map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 1.6, 0]} castShadow>
            <cylinderGeometry args={[0.35, 0.4, 3.2, 8]} />
            <meshStandardMaterial
              color="#1e293b"
              metalness={0.55}
              roughness={0.35}
            />
          </mesh>
          <mesh position={[0, 3.3, 0]}>
            <boxGeometry args={[0.9, 0.2, 0.9]} />
            <meshStandardMaterial color="#334155" metalness={0.4} />
          </mesh>
          <mesh position={[0, 3.55, 0]}>
            <sphereGeometry args={[0.12, 12, 12]} />
            <meshStandardMaterial
              color="#34d399"
              emissive="#10b981"
              emissiveIntensity={2.5}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}

      {/* Entrance arch */}
      <group position={[0, 0, -16]}>
        <mesh position={[-3.2, 2, 0]} castShadow>
          <boxGeometry args={[0.5, 4, 0.5]} />
          <meshStandardMaterial color="#0f172a" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[3.2, 2, 0]} castShadow>
          <boxGeometry args={[0.5, 4, 0.5]} />
          <meshStandardMaterial color="#0f172a" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[0, 4.1, 0]} castShadow>
          <boxGeometry args={[7, 0.45, 0.55]} />
          <meshStandardMaterial color="#1e293b" metalness={0.6} />
        </mesh>
        <mesh position={[0, 4.55, 0.05]}>
          <boxGeometry args={[6.5, 0.15, 0.2]} />
          <meshStandardMaterial
            color="#10b981"
            emissive="#059669"
            emissiveIntensity={1.8}
            toneMapped={false}
          />
        </mesh>
        <Billboard position={[0, 5.1, 0]}>
          <Text
            fontSize={0.55}
            color="#6ee7b7"
            anchorX="center"
            outlineWidth={0.03}
            outlineColor="#022c22"
          >
            BOTMART
          </Text>
        </Billboard>
      </group>

      {/* Side neon boards */}
      <NeonBoard position={[-12, 2.2, 4]} rotation={[0, Math.PI / 2, 0]} label="AGENTS" color="#22d3ee" />
      <NeonBoard position={[12, 2.2, 4]} rotation={[0, -Math.PI / 2, 0]} label="DEALS" color="#fbbf24" />
      <NeonBoard position={[-8, 2.0, 12]} rotation={[0, 0.3, 0]} label="COURT" color="#a78bfa" />

      {/* Low market walls */}
      {[-11, 11].map((x) => (
        <mesh key={x} position={[x, 0.4, 2]} castShadow receiveShadow>
          <boxGeometry args={[0.35, 0.8, 18]} />
          <meshStandardMaterial color="#111827" metalness={0.3} roughness={0.7} />
        </mesh>
      ))}

      {/* Court backdrop wall */}
      <mesh position={[0, 1.8, 14.5]} receiveShadow>
        <boxGeometry args={[14, 3.6, 0.4]} />
        <meshStandardMaterial color="#0f0a1a" metalness={0.25} roughness={0.8} />
      </mesh>
      <mesh position={[0, 2.5, 14.25]}>
        <boxGeometry args={[10, 0.12, 0.08]} />
        <meshStandardMaterial
          color="#7c3aed"
          emissive="#6d28d9"
          emissiveIntensity={2}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 1.2, 14.25]}>
        <boxGeometry args={[8, 0.08, 0.06]} />
        <meshStandardMaterial
          color="#c4b5fd"
          emissive="#8b5cf6"
          emissiveIntensity={1.2}
          toneMapped={false}
        />
      </mesh>

      {/* Floor accent tiles under market */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[8, 8.15, 48]} />
        <meshBasicMaterial color="#10b981" transparent opacity={0.15} />
      </mesh>
    </group>
  );
}

function NeonBoard({
  position,
  rotation,
  label,
  color,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  label: string;
  color: string;
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow>
        <boxGeometry args={[3.2, 1.1, 0.12]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.7} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0, 0.08]}>
        <planeGeometry args={[2.8, 0.75]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.6}
          toneMapped={false}
        />
      </mesh>
      <Billboard position={[0, 0, 0.2]}>
        <Text
          fontSize={0.35}
          color="#0a0a0a"
          anchorX="center"
          anchorY="middle"
          fontWeight={700}
        >
          {label}
        </Text>
      </Billboard>
    </group>
  );
}
