"use client";

import { RoundedBox, Sparkles, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useNight } from "./night";

/** Roof tones per role: natural materials, nudged toward the role colour. */
const ROOF: Record<string, string> = {
  buyer: "#4d6b46",
  seller: "#3f6b4f",
  scout: "#3e6c6a",
  negotiator: "#5b5a7a",
  auditor: "#7a6438",
  treasurer: "#6e4a3a",
  judge: "#6a5a33",
};
const roofFor = (role: string) => ROOF[role] ?? (role.startsWith("juror") ? "#5d6b3f" : "#4d6b46");

const PLASTER = "#e4d8bf";
const TIMBER = "#5a3f2b";
const STONE = "#8f8a7d";
const WINDOW = "#ffcf7a";

/** Gable end: a triangular slab that fills the wall under the roof. */
function gableGeometry(width: number, height: number, depth: number) {
  const s = new THREE.Shape();
  s.moveTo(-width / 2, 0);
  s.lineTo(width / 2, 0);
  s.lineTo(0, height);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
  g.translate(0, 0, -depth / 2);
  return g;
}

function Window({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const { night } = useNight();
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[0.74, 0.86]} />
        <meshStandardMaterial color={WINDOW} emissive={WINDOW} emissiveIntensity={night ? 3.2 : 1.4} toneMapped={false} />
      </mesh>
      {/* frame + mullions */}
      {[
        [0, 0.47, 0.9, 0.09],
        [0, -0.47, 0.96, 0.12],
        [-0.42, 0, 0.09, 1.0],
        [0.42, 0, 0.09, 1.0],
        [0, 0, 0.05, 0.86],
        [0, 0, 0.74, 0.05],
      ].map(([x, y, w, h], i) => (
        <mesh key={i} position={[x, y, 0.04]} castShadow>
          <boxGeometry args={[w, h, 0.06]} />
          <meshStandardMaterial color={TIMBER} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * An agent's cottage-workshop. Local +z is the front, facing the square.
 * On the porch: the agent's desktop station, its screen showing what the
 * agent is doing. The agent's idle spot is just in front of the desk.
 */
const BUILD_SECONDS = 2.6;

/** Grow a cottage out of the ground: overshoot a touch, then settle. */
function raise(g: THREE.Group, t: number) {
  const k = Math.min(1, Math.max(0, t));
  const c = 1.70158;
  const back = 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); // easeOutBack
  g.scale.set(0.92 + 0.08 * k, Math.max(0.001, back), 0.92 + 0.08 * k);
}

export function Cottage({
  x,
  z,
  rot,
  role,
  name,
  accent,
  screenText,
  selected,
  onSelect,
  building = false,
}: {
  x: number;
  z: number;
  rot: number;
  role: string;
  name: string;
  accent: string;
  screenText: string;
  selected: boolean;
  onSelect: () => void;
  /** A newly created agent's home: rises out of the ground with a puff of dust. */
  building?: boolean;
}) {
  const gable = useMemo(() => gableGeometry(4.5, 1.75, 0.2), []);
  const rise = useRef<THREE.Group>(null);
  const started = useRef<number | null>(null);
  useFrame(({ clock }) => {
    if (!building || !rise.current) return;
    if (started.current === null) started.current = clock.getElapsedTime();
    raise(rise.current, (clock.getElapsedTime() - started.current) / BUILD_SECONDS);
  });
  // Starts flat if it's being built; a stable value so re-renders don't reset it
  const [initialScale] = useState<[number, number, number]>(() => (building ? [1, 0.001, 1] : [1, 1, 1]));
  const [dust, setDust] = useState(building);
  useEffect(() => {
    if (!building) return;
    const t = setTimeout(() => setDust(false), (BUILD_SECONDS + 1.5) * 1000);
    return () => clearTimeout(t);
  }, [building]);
  const { night, lights } = useNight();
  const roof = roofFor(role);
  const W = 4.6; // wall width (x)
  const D = 3.9; // wall depth (z)
  const H = 2.55; // wall height
  const base = 0.42;
  const pitch = Math.atan2(1.75, W / 2);
  const slope = Math.hypot(W / 2 + 0.45, 1.75 + 0.35);

  return (
    <group
      position={[x, 0, z]}
      rotation={[0, rot, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {dust && (
        <Sparkles count={60} scale={[6, 2.5, 5.5]} position={[0, 1.1, 0]} size={7} speed={0.8} color="#d9cdb0" opacity={0.8} noise={1.2} />
      )}
      <group ref={rise} scale={initialScale}>
      {/* Stone footing */}
      <RoundedBox args={[W + 0.5, base, D + 0.5]} radius={0.08} smoothness={3} position={[0, base / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={STONE} roughness={0.9} />
      </RoundedBox>

      {/* Plaster walls */}
      <RoundedBox args={[W, H, D]} radius={0.06} smoothness={3} position={[0, base + H / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={PLASTER} roughness={0.88} />
      </RoundedBox>

      {/* Timber frame: corner posts, sill and head beams */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx * (W / 2 + 0.01), base + H / 2, sz * (D / 2 + 0.01)]} castShadow>
            <boxGeometry args={[0.2, H, 0.2]} />
            <meshStandardMaterial color={TIMBER} roughness={0.85} />
          </mesh>
        ))
      )}
      {[base + 0.08, base + H - 0.08].map((y) =>
        [-1, 1].map((sz) => (
          <mesh key={`${y}${sz}`} position={[0, y, sz * (D / 2 + 0.03)]} castShadow>
            <boxGeometry args={[W + 0.1, 0.16, 0.12]} />
            <meshStandardMaterial color={TIMBER} roughness={0.85} />
          </mesh>
        ))
      )}

      {/* Gable ends + roof planes */}
      {[-1, 1].map((sz) => (
        <mesh key={sz} geometry={gable} position={[0, base + H, sz * (D / 2 - 0.1)]} castShadow receiveShadow>
          <meshStandardMaterial color={PLASTER} roughness={0.88} />
        </mesh>
      ))}
      {[-1, 1].map((sx) => (
        <RoundedBox
          key={sx}
          args={[slope, 0.2, D + 0.9]}
          radius={0.06}
          smoothness={3}
          position={[sx * (W / 4 + 0.12), base + H + 0.86, 0]}
          rotation={[0, 0, -sx * pitch]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color={roof} roughness={0.7} />
        </RoundedBox>
      ))}
      {/* Ridge cap */}
      <mesh position={[0, base + H + 1.78, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.13, D + 0.95, 48]} />
        <meshStandardMaterial color={new THREE.Color(roof).offsetHSL(0, 0, -0.08)} roughness={0.7} />
      </mesh>

      {/* Chimney */}
      <RoundedBox args={[0.55, 1.5, 0.55]} radius={0.05} smoothness={4} position={[-1.15, base + H + 1.45, -0.7]} castShadow>
        <meshStandardMaterial color={STONE} roughness={0.9} />
      </RoundedBox>

      {/* Front: door between two lit windows */}
      <group position={[0, base, D / 2 + 0.02]}>
        <RoundedBox args={[0.95, 1.75, 0.1]} radius={0.04} smoothness={4} position={[0, 0.88, 0.02]} castShadow>
          <meshStandardMaterial color="#6b4a32" roughness={0.75} />
        </RoundedBox>
        <mesh position={[0.3, 0.9, 0.09]}>
          <sphereGeometry args={[0.045, 48, 32]} />
          <meshStandardMaterial color="#d6b56c" metalness={0.8} roughness={0.3} />
        </mesh>
        <Window position={[-1.45, 1.35, 0]} />
        <Window position={[1.45, 1.35, 0]} />
      </group>
      <Window position={[W / 2 + 0.02, base + 1.35, 0]} rotation={Math.PI / 2} />
      <Window position={[-(W / 2 + 0.02), base + 1.35, 0]} rotation={-Math.PI / 2} />

      {/* Porch deck */}
      <RoundedBox args={[W + 0.2, 0.14, 1.9]} radius={0.04} smoothness={4} position={[0, 0.07, D / 2 + 1.15]} receiveShadow castShadow>
        <meshStandardMaterial color="#8a6748" roughness={0.85} />
      </RoundedBox>

      {/* Desktop station: desk, monitor (screen faces the square), keyboard */}
      <group position={[0, 0.14, D / 2 + 0.75]}>
        <RoundedBox args={[1.6, 0.08, 0.7]} radius={0.03} smoothness={4} position={[0, 0.78, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#a57b52" roughness={0.6} />
        </RoundedBox>
        {[-0.7, 0.7].map((lx) => (
          <mesh key={lx} position={[lx, 0.39, 0]} castShadow>
            <boxGeometry args={[0.08, 0.78, 0.6]} />
            <meshStandardMaterial color="#7b5a3c" roughness={0.7} />
          </mesh>
        ))}
        <group position={[0, 0.82, -0.12]}>
          <mesh position={[0, 0.06, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.16, 0.04, 64]} />
            <meshStandardMaterial color="#20262b" metalness={0.6} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.25, 0]}>
            <boxGeometry args={[0.05, 0.36, 0.05]} />
            <meshStandardMaterial color="#20262b" metalness={0.6} roughness={0.35} />
          </mesh>
          <RoundedBox args={[1.05, 0.64, 0.05]} radius={0.025} smoothness={4} position={[0, 0.66, 0]} castShadow>
            <meshStandardMaterial color="#14191d" metalness={0.4} roughness={0.35} />
          </RoundedBox>
          <mesh position={[0, 0.66, 0.03]}>
            <planeGeometry args={[0.95, 0.54]} />
            <meshStandardMaterial color="#0a1f15" emissive={accent} emissiveIntensity={0.35} toneMapped={false} />
          </mesh>
          <Text
            position={[0, 0.66, 0.035]}
            fontSize={0.075}
            maxWidth={0.86}
            textAlign="center"
            anchorX="center"
            anchorY="middle"
            color="#eafff1"
          >
            {screenText}
          </Text>
        </group>
        <RoundedBox args={[0.62, 0.03, 0.2]} radius={0.01} smoothness={4} position={[0, 0.84, 0.18]}>
          <meshStandardMaterial color="#2a3036" roughness={0.5} />
        </RoundedBox>
      </group>

      {/* Name sign on a post, by the path */}
      <group position={[W / 2 + 0.55, 0, D / 2 + 1.9]}>
        <mesh position={[0, 0.7, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.07, 1.4, 48]} />
          <meshStandardMaterial color={TIMBER} roughness={0.85} />
        </mesh>
        <RoundedBox args={[1.6, 0.42, 0.08]} radius={0.04} smoothness={4} position={[0, 1.35, 0]} castShadow>
          <meshStandardMaterial color="#7d5a3e" roughness={0.8} />
        </RoundedBox>
        <Text position={[0, 1.35, 0.05]} fontSize={0.19} anchorX="center" anchorY="middle" color="#fff6e3" maxWidth={1.45}>
          {name}
        </Text>
        <mesh position={[0, 1.62, 0.02]}>
          <sphereGeometry args={[0.07, 48, 32]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.5} toneMapped={false} />
        </mesh>
      </group>

      {/* Porch lantern */}
      <mesh position={[-1.25, base + 2.05, D / 2 + 0.16]}>
        <sphereGeometry args={[0.11, 48, 32]} />
        <meshStandardMaterial color={WINDOW} emissive={WINDOW} emissiveIntensity={night ? 6 : 2.4} toneMapped={false} />
      </mesh>
      {night && lights && (
        <pointLight position={[-1.25, base + 1.9, D / 2 + 0.6]} color="#ffc98a" intensity={7} distance={7} decay={1.7} />
      )}

      </group>
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <ringGeometry args={[3.7, 3.85, 64]} />
          <meshBasicMaterial color="#d1fae2" transparent opacity={0.7} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}
