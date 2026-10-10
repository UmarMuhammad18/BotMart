"use client";

/** Higher-detail procedural products for stalls. */
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

  if (/headphone|ear|audio|sound/.test(t)) {
    return (
      <group position={[0, 1.08, 0]}>
        {([-1, 1] as const).map((side) => (
          <group key={side} position={[side * 0.2, 0.12, 0]} rotation={[0, 0, side * 0.35]}>
            <mesh>
              <torusGeometry args={[0.16, 0.045, 12, 32, Math.PI]} />
              <meshPhysicalMaterial
                color="#1e293b"
                metalness={0.7}
                roughness={0.25}
                clearcoat={0.4}
                transparent
                opacity={opacity}
              />
            </mesh>
            <mesh position={[0, -0.02, 0]}>
              <cylinderGeometry args={[0.07, 0.08, 0.06, 20]} />
              <meshPhysicalMaterial
                color="#334155"
                metalness={0.6}
                transparent
                opacity={opacity}
              />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 0.28, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.26, 0.03, 10, 40, Math.PI]} />
          <meshPhysicalMaterial
            color="#475569"
            metalness={0.55}
            transparent
            opacity={opacity}
          />
        </mesh>
      </group>
    );
  }

  if (/keyboard|keycap|mechanical/.test(t)) {
    return (
      <group position={[0, 0.98, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.95, 0.07, 0.38]} />
          <meshPhysicalMaterial
            color="#0f172a"
            metalness={0.5}
            roughness={0.35}
            clearcoat={0.3}
            transparent
            opacity={opacity}
          />
        </mesh>
        {[-0.3, -0.1, 0.1, 0.3].map((x) =>
          [-0.1, 0.05].map((z) => (
            <mesh key={`${x}-${z}`} position={[x, 0.055, z]}>
              <boxGeometry args={[0.11, 0.035, 0.09]} />
              <meshPhysicalMaterial
                color="#22d3ee"
                emissive="#0891b2"
                emissiveIntensity={sold ? 0 : 0.5}
                metalness={0.4}
                transparent
                opacity={opacity}
                toneMapped={false}
              />
            </mesh>
          ))
        )}
      </group>
    );
  }

  if (/gpu|cloud|compute|a10|token|api credit|inference/.test(t)) {
    return (
      <group position={[0, 1.02, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.75, 0.22, 0.38]} />
          <meshPhysicalMaterial
            color="#14532d"
            metalness={0.75}
            roughness={0.2}
            clearcoat={0.4}
            transparent
            opacity={opacity}
          />
        </mesh>
        {[0.12, 0, -0.12].map((z, i) => (
          <mesh key={i} position={[0, 0.02, z]}>
            <boxGeometry args={[0.6, 0.04, 0.025]} />
            <meshStandardMaterial
              color="#4ade80"
              emissive="#16a34a"
              emissiveIntensity={sold ? 0 : 0.7}
              transparent
              opacity={opacity}
              toneMapped={false}
            />
          </mesh>
        ))}
        <mesh position={[0.28, 0.08, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.08, 16]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} transparent opacity={opacity} />
        </mesh>
      </group>
    );
  }

  if (/domain|software|prompt|license|dataset|data/.test(t)) {
    return (
      <group position={[0, 1.08, 0]}>
        <mesh castShadow rotation={[0.12, 0.35, 0]}>
          <boxGeometry args={[0.48, 0.62, 0.06]} />
          <meshPhysicalMaterial
            color="#1e3a5f"
            metalness={0.4}
            roughness={0.3}
            clearcoat={0.5}
            transparent
            opacity={opacity}
          />
        </mesh>
        <mesh position={[0, 0.08, 0.04]} rotation={[0.12, 0.35, 0]}>
          <planeGeometry args={[0.36, 0.4]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#0ea5e9"
            emissiveIntensity={sold ? 0.1 : 0.6}
            transparent
            opacity={sold ? 0.25 : 0.85}
            toneMapped={false}
          />
        </mesh>
      </group>
    );
  }

  if (/capture|usb|electronic|gadget|wireless/.test(t)) {
    return (
      <group position={[0, 1.0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.52, 0.16, 0.36]} />
          <meshPhysicalMaterial
            color="#334155"
            metalness={0.7}
            roughness={0.22}
            clearcoat={0.45}
            transparent
            opacity={opacity}
          />
        </mesh>
        <mesh position={[0.18, 0.03, 0.19]}>
          <cylinderGeometry args={[0.045, 0.045, 0.07, 16]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#d97706"
            emissiveIntensity={sold ? 0 : 0.6}
            transparent
            opacity={opacity}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[-0.15, 0.09, 0]}>
          <boxGeometry args={[0.12, 0.02, 0.2]} />
          <meshStandardMaterial color="#64748b" metalness={0.8} transparent opacity={opacity} />
        </mesh>
      </group>
    );
  }

  // Generic product crate — beveled feel via layered boxes
  return (
    <group position={[0, 1.02, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.48, 0.48, 0.48]} />
        <meshPhysicalMaterial
          color={sold ? "#3f3f46" : "#b45309"}
          metalness={0.25}
          roughness={0.55}
          clearcoat={0.2}
          transparent
          opacity={opacity}
        />
      </mesh>
      <mesh position={[0, 0.01, 0.25]}>
        <boxGeometry args={[0.38, 0.28, 0.02]} />
        <meshStandardMaterial
          color="#fde68a"
          emissive="#f59e0b"
          emissiveIntensity={sold ? 0 : 0.3}
          transparent
          opacity={opacity}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 0.26, 0]}>
        <boxGeometry args={[0.5, 0.04, 0.5]} />
        <meshPhysicalMaterial
          color={sold ? "#52525b" : "#92400e"}
          metalness={0.3}
          transparent
          opacity={opacity}
        />
      </mesh>
    </group>
  );
}
