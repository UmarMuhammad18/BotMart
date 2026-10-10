"use client";

/**
 * Small procedural “product” props for stalls — shaped by category / title keywords.
 */
export function ProductMesh({
  category,
  title,
  sold,
}: {
  category: string | null;
  title: string;
  sold: boolean;
}) {
  const t = `${category || ""} ${title}`.toLowerCase();
  const opacity = sold ? 0.35 : 1;

  // Headphones
  if (/headphone|ear|audio|sound/.test(t)) {
    return (
      <group position={[0, 1.05, 0]}>
        <mesh position={[-0.22, 0.15, 0]} rotation={[0, 0, 0.3]}>
          <torusGeometry args={[0.18, 0.05, 8, 16, Math.PI]} />
          <meshStandardMaterial
            color="#1e293b"
            metalness={0.6}
            roughness={0.3}
            transparent
            opacity={opacity}
          />
        </mesh>
        <mesh position={[0.22, 0.15, 0]} rotation={[0, 0, -0.3]}>
          <torusGeometry args={[0.18, 0.05, 8, 16, Math.PI]} />
          <meshStandardMaterial
            color="#1e293b"
            metalness={0.6}
            roughness={0.3}
            transparent
            opacity={opacity}
          />
        </mesh>
        <mesh position={[0, 0.32, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.28, 0.035, 8, 20, Math.PI]} />
          <meshStandardMaterial color="#334155" metalness={0.5} transparent opacity={opacity} />
        </mesh>
      </group>
    );
  }

  // Keyboard
  if (/keyboard|keycap|mechanical/.test(t)) {
    return (
      <group position={[0, 0.95, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.9, 0.08, 0.35]} />
          <meshStandardMaterial color="#0f172a" metalness={0.4} transparent opacity={opacity} />
        </mesh>
        {[-0.25, 0, 0.25].map((x) =>
          [-0.08, 0.08].map((z) => (
            <mesh key={`${x}-${z}`} position={[x, 0.06, z]}>
              <boxGeometry args={[0.12, 0.04, 0.1]} />
              <meshStandardMaterial
                color="#22d3ee"
                emissive="#0891b2"
                emissiveIntensity={sold ? 0 : 0.4}
                transparent
                opacity={opacity}
              />
            </mesh>
          ))
        )}
      </group>
    );
  }

  // GPU / compute / cloud
  if (/gpu|cloud|compute|a10|token|api credit|inference/.test(t)) {
    return (
      <group position={[0, 1.0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.7, 0.2, 0.35]} />
          <meshStandardMaterial
            color="#14532d"
            metalness={0.7}
            roughness={0.25}
            transparent
            opacity={opacity}
          />
        </mesh>
        <mesh position={[0, 0.02, 0.2]}>
          <boxGeometry args={[0.55, 0.12, 0.02]} />
          <meshStandardMaterial
            color="#4ade80"
            emissive="#16a34a"
            emissiveIntensity={sold ? 0 : 0.6}
            transparent
            opacity={opacity}
          />
        </mesh>
      </group>
    );
  }

  // Domain / software / prompt
  if (/domain|software|prompt|license|dataset|data/.test(t)) {
    return (
      <group position={[0, 1.05, 0]}>
        <mesh castShadow rotation={[0.15, 0.4, 0]}>
          <boxGeometry args={[0.45, 0.6, 0.08]} />
          <meshStandardMaterial color="#1e3a5f" metalness={0.3} transparent opacity={opacity} />
        </mesh>
        <mesh position={[0, 0.1, 0.05]} rotation={[0.15, 0.4, 0]}>
          <planeGeometry args={[0.32, 0.35]} />
          <meshBasicMaterial
            color="#38bdf8"
            transparent
            opacity={sold ? 0.2 : 0.7}
          />
        </mesh>
      </group>
    );
  }

  // Capture card / electronics default gadget
  if (/capture|usb|electronic|gadget|wireless/.test(t)) {
    return (
      <group position={[0, 0.98, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.5, 0.15, 0.35]} />
          <meshStandardMaterial color="#334155" metalness={0.65} transparent opacity={opacity} />
        </mesh>
        <mesh position={[0.15, 0.02, 0.18]}>
          <cylinderGeometry args={[0.04, 0.04, 0.08, 8]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#d97706"
            emissiveIntensity={sold ? 0 : 0.5}
            transparent
            opacity={opacity}
          />
        </mesh>
      </group>
    );
  }

  // Generic crate / product box
  return (
    <group position={[0, 1.0, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.45, 0.45, 0.45]} />
        <meshStandardMaterial
          color={sold ? "#3f3f46" : "#b45309"}
          metalness={0.2}
          roughness={0.7}
          transparent
          opacity={opacity}
        />
      </mesh>
      <mesh position={[0, 0.05, 0.23]}>
        <boxGeometry args={[0.35, 0.25, 0.02]} />
        <meshStandardMaterial
          color="#fde68a"
          emissive="#f59e0b"
          emissiveIntensity={sold ? 0 : 0.25}
          transparent
          opacity={opacity}
        />
      </mesh>
    </group>
  );
}
