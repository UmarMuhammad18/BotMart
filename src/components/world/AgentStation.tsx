"use client";

import { Text } from "@react-three/drei";

/**
 * Desk + laptop station beside each agent (replaces ground rings/disks).
 * Screen shows what they sell / current activity.
 */
export function AgentStation({
  screenText,
  accent = "#34d399",
}: {
  screenText: string;
  accent?: string;
}) {
  const line =
    screenText.length > 20 ? screenText.slice(0, 19) + "…" : screenText;

  return (
    <group position={[0.85, 0, 0.15]}>
      {/* desk legs */}
      {(
        [
          [-0.35, -0.28],
          [0.35, -0.28],
          [-0.35, 0.28],
          [0.35, 0.28],
        ] as const
      ).map(([x, z], i) => (
        <mesh key={i} position={[x, 0.28, z]} castShadow>
          <cylinderGeometry args={[0.035, 0.04, 0.56, 10]} />
          <meshStandardMaterial color="#292524" metalness={0.4} roughness={0.5} />
        </mesh>
      ))}

      {/* desk top */}
      <mesh position={[0, 0.58, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.95, 0.06, 0.7]} />
        <meshPhysicalMaterial
          color="#44403c"
          metalness={0.25}
          roughness={0.55}
          clearcoat={0.15}
        />
      </mesh>

      {/* laptop base on desk */}
      <group position={[0, 0.64, 0.05]} rotation={[0, -0.15, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.62, 0.035, 0.42]} />
          <meshStandardMaterial color="#1c1917" metalness={0.55} roughness={0.4} />
        </mesh>
        {/* keyboard area */}
        <mesh position={[0, 0.02, 0.04]}>
          <boxGeometry args={[0.52, 0.01, 0.28]} />
          <meshStandardMaterial color="#292524" metalness={0.3} roughness={0.6} />
        </mesh>

        {/* hinge */}
        <mesh position={[0, 0.025, -0.19]}>
          <boxGeometry args={[0.62, 0.025, 0.035]} />
          <meshStandardMaterial color="#44403c" metalness={0.6} />
        </mesh>

        {/* lid */}
        <mesh position={[0, 0.3, -0.22]} rotation={[-0.4, 0, 0]} castShadow>
          <boxGeometry args={[0.62, 0.42, 0.028]} />
          <meshStandardMaterial color="#1c1917" metalness={0.55} roughness={0.35} />
        </mesh>

        {/* screen */}
        <mesh position={[0, 0.3, -0.2]} rotation={[-0.4, 0, 0]}>
          <planeGeometry args={[0.54, 0.36]} />
          <meshStandardMaterial
            color="#022c22"
            emissive={accent}
            emissiveIntensity={0.4}
            toneMapped={false}
          />
        </mesh>

        {/* screen text */}
        <group position={[0, 0.3, -0.19]} rotation={[-0.4, 0, 0]}>
          <Text
            position={[0, 0.05, 0.01]}
            fontSize={0.06}
            color={accent}
            anchorX="center"
            anchorY="middle"
            maxWidth={0.48}
            textAlign="center"
            outlineWidth={0.004}
            outlineColor="#000"
          >
            {line}
          </Text>
          <Text
            position={[0, -0.08, 0.01]}
            fontSize={0.04}
            color="#6ee7b7"
            anchorX="center"
            anchorY="middle"
          >
            BOTMART OS
          </Text>
        </group>
      </group>

      {/* small status LED on desk edge */}
      <mesh position={[0.4, 0.62, 0.32]}>
        <sphereGeometry args={[0.03, 12, 12]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={2}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
