"use client";

import { Text, Billboard } from "@react-three/drei";

/** Larger market footprint: pillars, neon, walls, court. */
export function SceneDressing() {
  const pillarPositions: [number, number][] = [
    [-22, -22],
    [22, -22],
    [-22, 22],
    [22, 22],
    [-22, 0],
    [22, 0],
    [0, -22],
    [0, 22],
    [-22, 11],
    [22, 11],
    [-11, -22],
    [11, -22],
  ];

  return (
    <group>
      {pillarPositions.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 2.0, 0]} castShadow>
            <cylinderGeometry args={[0.4, 0.48, 4.0, 8]} />
            <meshStandardMaterial color="#1e293b" metalness={0.55} roughness={0.35} />
          </mesh>
          <mesh position={[0, 4.15, 0]}>
            <boxGeometry args={[1.0, 0.22, 1.0]} />
            <meshStandardMaterial color="#334155" metalness={0.4} />
          </mesh>
          <mesh position={[0, 4.45, 0]}>
            <sphereGeometry args={[0.14, 12, 12]} />
            <meshStandardMaterial
              color="#34d399"
              emissive="#10b981"
              emissiveIntensity={2.5}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}

      {/* Grand entrance */}
      <group position={[0, 0, -24]}>
        <mesh position={[-4.5, 2.5, 0]} castShadow>
          <boxGeometry args={[0.6, 5, 0.6]} />
          <meshStandardMaterial color="#0f172a" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[4.5, 2.5, 0]} castShadow>
          <boxGeometry args={[0.6, 5, 0.6]} />
          <meshStandardMaterial color="#0f172a" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[0, 5.2, 0]} castShadow>
          <boxGeometry args={[10, 0.5, 0.65]} />
          <meshStandardMaterial color="#1e293b" metalness={0.6} />
        </mesh>
        <mesh position={[0, 5.7, 0.05]}>
          <boxGeometry args={[9.2, 0.18, 0.22]} />
          <meshStandardMaterial
            color="#10b981"
            emissive="#059669"
            emissiveIntensity={1.8}
            toneMapped={false}
          />
        </mesh>
        <Billboard position={[0, 6.3, 0]}>
          <Text
            fontSize={0.7}
            color="#6ee7b7"
            anchorX="center"
            outlineWidth={0.04}
            outlineColor="#022c22"
          >
            BOTMART
          </Text>
        </Billboard>
      </group>

      <NeonBoard position={[-18, 2.5, 6]} rotation={[0, Math.PI / 2, 0]} label="AGENTS" color="#22d3ee" />
      <NeonBoard position={[18, 2.5, 6]} rotation={[0, -Math.PI / 2, 0]} label="DEALS" color="#fbbf24" />
      <NeonBoard position={[-12, 2.3, 18]} rotation={[0, 0.25, 0]} label="COURT" color="#a78bfa" />

      {[-16, 16].map((x) => (
        <mesh key={x} position={[x, 0.5, 2]} castShadow receiveShadow>
          <boxGeometry args={[0.4, 1.0, 28]} />
          <meshStandardMaterial color="#111827" metalness={0.3} roughness={0.7} />
        </mesh>
      ))}

      <mesh position={[0, 2.2, 20]} receiveShadow>
        <boxGeometry args={[20, 4.4, 0.5]} />
        <meshStandardMaterial color="#0f0a1a" metalness={0.25} roughness={0.8} />
      </mesh>
      <mesh position={[0, 3.0, 19.7]}>
        <boxGeometry args={[14, 0.14, 0.1]} />
        <meshStandardMaterial
          color="#7c3aed"
          emissive="#6d28d9"
          emissiveIntensity={2}
          toneMapped={false}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[12, 12.2, 64]} />
        <meshBasicMaterial color="#10b981" transparent opacity={0.12} />
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
        <boxGeometry args={[3.6, 1.2, 0.14]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.7} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0, 0.09]}>
        <planeGeometry args={[3.2, 0.85]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.6}
          toneMapped={false}
        />
      </mesh>
      <Billboard position={[0, 0, 0.22]}>
        <Text fontSize={0.4} color="#0a0a0a" anchorX="center" anchorY="middle">
          {label}
        </Text>
      </Billboard>
    </group>
  );
}
