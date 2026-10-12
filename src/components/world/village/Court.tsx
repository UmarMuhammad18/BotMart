"use client";

import { useFrame } from "@react-three/fiber";
import { RoundedBox, useAnimations, useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { ROLE_CATALOG } from "@/lib/agents/roles";
import { MODEL, robotCopy } from "./RobotAgent";

/**
 * The court hall's interior and grounds. Coordinates are local to the hall:
 * +z faces the square, the floor of the hall sits at y = FLOOR.
 */
const FLOOR = 0.66;
const GOLD = "#c9a24a";
const WOOD = "#7a4f2e";
const WOOD_DARK = "#5b3920";

type Vec3 = [number, number, number];

/** A column shaft with 20 shallow flutes and a gentle taper. */
export function flutedColumnGeometry(height = 3.4, radius = 0.26) {
  const g = new THREE.CylinderGeometry(radius, radius, height, 160, 12);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 1e-4) continue;
    const a = Math.atan2(z, x);
    const groove = Math.pow(0.5 + 0.5 * Math.cos(a * 20), 3);
    const taper = THREE.MathUtils.lerp(1.08, 0.92, p.getY(i) / height + 0.5);
    const k = taper * (1 - 0.06 * groove);
    p.setXYZ(i, x * k, p.getY(i), z * k);
  }
  g.computeVertexNormals();
  return g;
}

type Actions = ReturnType<typeof useAnimations>["actions"];

/** Hold `pose`, and every few seconds play one of `gestures` before settling back. */
function performPose(actions: Actions, pose: string, gestures: string[], seed: number) {
  const base = actions[pose];
  if (!base) return;
  base.reset().play();
  base.time = (seed % 7) * 0.37;
  if (gestures.length === 0) return;
  let timer = 0;
  const next = (n: number) => {
    timer = window.setTimeout(() => {
      const g = actions[gestures[n % gestures.length]];
      if (!g) return next(n + 1);
      base.fadeOut(0.25);
      g.reset().setLoop(THREE.LoopOnce, 1);
      g.clampWhenFinished = true;
      g.fadeIn(0.25).play();
      timer = window.setTimeout(() => {
        g.fadeOut(0.3);
        base.reset().fadeIn(0.3).play();
        next(n + 1);
      }, Math.max(0, g.getClip().duration * 1000 - 300));
    }, 5200 + ((seed * 1931 + n * 787) % 4200));
  };
  next(seed);
  return () => window.clearTimeout(timer);
}

/**
 * A decorative robot that holds a pose (sitting, standing) and now and then
 * nods or shakes its head. Same smoothed, high-poly model as the agents.
 */
function CourtFigure({
  position,
  rotation = 0,
  color,
  pose = "Idle",
  gestures = [],
  seed = 0,
  height = 1.5,
}: {
  position: Vec3;
  rotation?: number;
  color: string;
  pose?: string;
  gestures?: string[];
  seed?: number;
  height?: number;
}) {
  const { scene, animations } = useGLTF(MODEL);
  const root = useRef<THREE.Group>(null);
  const { model, scale } = useMemo(() => robotCopy(scene, color, height), [scene, color, height]);
  const { actions } = useAnimations(animations, root);

  useEffect(() => performPose(actions, pose, gestures, seed), [actions, pose, gestures, seed]);

  return (
    <group ref={root} position={position} rotation={[0, rotation, 0]}>
      <primitive object={model} scale={scale} />
    </group>
  );
}

const JUDGE_GESTURES = ["Yes", "No"];
const PARTY_GESTURES = ["No", "Yes", "ThumbsUp"];
const NO_GESTURES: string[] = [];

/** Walls, bench, jury box, podiums and the people in them. */
export function CourtInterior({ night }: { night: boolean }) {
  const jurors = useMemo(() => {
    const hexes = ROLE_CATALOG.map((r) => r.hex);
    // Front row of three, raised back row of two, facing across the hall
    const seats: Vec3[] = [
      [2.05, FLOOR + 0.02, -1.25],
      [2.05, FLOOR + 0.02, -0.45],
      [2.05, FLOOR + 0.02, 0.35],
      [2.62, FLOOR + 0.3, -0.85],
      [2.62, FLOOR + 0.3, -0.05],
    ];
    return seats.map((p, i) => ({ p, color: hexes[i % hexes.length] }));
  }, []);

  return (
    <group>
      {/* Shell: back wall, side walls, ceiling, open to the portico */}
      <RoundedBox args={[6.6, 3.2, 0.24]} radius={0.04} smoothness={3} position={[0, FLOOR + 1.6, -2.78]} castShadow receiveShadow>
        <meshStandardMaterial color="#d6cdb8" roughness={0.85} />
      </RoundedBox>
      {[-3.18, 3.18].map((x) => (
        <RoundedBox key={x} args={[0.24, 3.2, 4.4]} radius={0.04} smoothness={3} position={[x, FLOOR + 1.6, -0.7]} castShadow receiveShadow>
          <meshStandardMaterial color="#d6cdb8" roughness={0.85} />
        </RoundedBox>
      ))}
      <RoundedBox args={[6.6, 0.24, 4.4]} radius={0.04} smoothness={3} position={[0, FLOOR + 3.08, -0.7]} castShadow receiveShadow>
        <meshStandardMaterial color="#cfc5ae" roughness={0.85} />
      </RoundedBox>

      {/* Floor: polished boards and a runner up the aisle */}
      <mesh position={[0, FLOOR + 0.012, -0.7]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[6.12, 4.2]} />
        <meshStandardMaterial color="#a8774a" roughness={0.45} />
      </mesh>
      <mesh position={[-0.6, FLOOR + 0.02, -0.2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1.1, 3.4]} />
        <meshStandardMaterial color="#7d2f2a" roughness={0.9} />
      </mesh>

      {/* Wainscot and the crest above the bench */}
      <RoundedBox args={[6.1, 1.1, 0.06]} radius={0.02} smoothness={2} position={[0, FLOOR + 0.55, -2.64]} receiveShadow>
        <meshStandardMaterial color={WOOD} roughness={0.55} />
      </RoundedBox>
      <group position={[0, FLOOR + 2.55, -2.63]}>
        <mesh>
          <torusGeometry args={[0.38, 0.045, 24, 96]} />
          <meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.28} />
        </mesh>
        <mesh>
          <circleGeometry args={[0.34, 64]} />
          <meshStandardMaterial color="#2e5e3a" roughness={0.6} />
        </mesh>
        <ScalesOfJustice position={[0, -0.2, 0.03]} scale={0.32} />
      </group>

      {/* Judge's dais and bench */}
      <RoundedBox args={[3.0, 0.65, 1.3]} radius={0.04} smoothness={3} position={[0, FLOOR + 0.325, -2.0]} castShadow receiveShadow>
        <meshStandardMaterial color={WOOD_DARK} roughness={0.6} />
      </RoundedBox>
      <RoundedBox args={[2.8, 0.95, 0.5]} radius={0.05} smoothness={3} position={[0, FLOOR + 0.475, -1.3]} castShadow receiveShadow>
        <meshStandardMaterial color={WOOD} roughness={0.5} />
      </RoundedBox>
      <RoundedBox args={[3.0, 0.08, 0.62]} radius={0.03} smoothness={3} position={[0, FLOOR + 0.99, -1.32]} castShadow receiveShadow>
        <meshStandardMaterial color={WOOD_DARK} roughness={0.4} />
      </RoundedBox>
      <Gavel position={[0.75, FLOOR + 1.03, -1.25]} />
      <CourtFigure position={[0, FLOOR + 0.65, -2.1]} color="#e8e4da" gestures={JUDGE_GESTURES} seed={3} height={1.7} />

      {/* Jury box: a railed, two-tier pen on the right */}
      <RoundedBox args={[1.25, 0.3, 2.3]} radius={0.03} smoothness={2} position={[2.62, FLOOR + 0.15, -0.45]} receiveShadow>
        <meshStandardMaterial color={WOOD_DARK} roughness={0.6} />
      </RoundedBox>
      <RoundedBox args={[0.08, 0.75, 2.5]} radius={0.03} smoothness={2} position={[1.5, FLOOR + 0.375, -0.45]} castShadow receiveShadow>
        <meshStandardMaterial color={WOOD} roughness={0.5} />
      </RoundedBox>
      <RoundedBox args={[0.14, 0.06, 2.56]} radius={0.02} smoothness={2} position={[1.5, FLOOR + 0.78, -0.45]} castShadow>
        <meshStandardMaterial color={WOOD_DARK} roughness={0.4} />
      </RoundedBox>
      {jurors.map(({ p, color }, i) => (
        <CourtFigure key={i} position={p} rotation={-Math.PI / 2} color={color} pose="Sitting" gestures={NO_GESTURES} seed={i} height={1.4} />
      ))}

      {/* The two parties at their podiums, facing the bench */}
      {[
        { x: -1.9, color: ROLE_CATALOG[0].hex, turn: 0.35, seed: 1 },
        { x: -0.15, color: ROLE_CATALOG[1].hex, turn: -0.35, seed: 4 },
      ].map(({ x, color, turn, seed }) => (
        <group key={x}>
          <RoundedBox args={[0.7, 1.0, 0.42]} radius={0.04} smoothness={3} position={[x, FLOOR + 0.5, -0.05]} castShadow receiveShadow>
            <meshStandardMaterial color={WOOD} roughness={0.5} />
          </RoundedBox>
          <RoundedBox args={[0.78, 0.05, 0.5]} radius={0.02} smoothness={2} position={[x, FLOOR + 1.02, -0.07]} rotation={[0.18, 0, 0]} castShadow>
            <meshStandardMaterial color={WOOD_DARK} roughness={0.4} />
          </RoundedBox>
          <CourtFigure position={[x, FLOOR, 0.55]} rotation={Math.PI + turn} color={color} gestures={PARTY_GESTURES} seed={seed} />
        </group>
      ))}

      {/* Chandelier and warm interior light */}
      <group position={[0, FLOOR + 2.55, -0.7]}>
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.5, 8]} />
          <meshStandardMaterial color="#3b3328" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.42, 0.03, 16, 96]} />
          <meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.3} />
        </mesh>
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.42, 0.08, Math.sin(a) * 0.42]}>
              <sphereGeometry args={[0.05, 24, 16]} />
              <meshStandardMaterial color="#fff2c8" emissive="#ffc96b" emissiveIntensity={night ? 5 : 1.6} toneMapped={false} />
            </mesh>
          );
        })}
        <pointLight color="#ffd9a0" intensity={night ? 14 : 2.5} distance={9} decay={1.6} />
      </group>
    </group>
  );
}

function Gavel({ position }: { position: Vec3 }) {
  return (
    <group position={position} rotation={[0, -0.5, 0]}>
      <mesh position={[0, 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.1, 0.04, 48]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.35} />
      </mesh>
      <group position={[0, 0.09, 0]} rotation={[0, 0, 0.12]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.045, 0.045, 0.2, 48]} />
          <meshStandardMaterial color={WOOD} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0, 0.14]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.014, 0.018, 0.28, 24]} />
          <meshStandardMaterial color={WOOD} roughness={0.35} />
        </mesh>
      </group>
    </group>
  );
}

/** Balance scales; the beam rocks very slowly. */
function ScalesOfJustice({ position, scale = 1 }: { position: Vec3; scale?: number }) {
  const beam = useRef<THREE.Group>(null);
  const pans = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ clock }) => {
    if (!beam.current) return;
    const tilt = Math.sin(clock.getElapsedTime() * 0.45) * 0.07;
    beam.current.rotation.z = tilt;
    // Pans hang straight down whatever the beam does
    for (const p of pans.current) if (p) p.rotation.z = -tilt;
  });
  const metal = <meshStandardMaterial color={GOLD} metalness={0.9} roughness={0.25} />;
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.34, 0.1, 64]} />
        {metal}
      </mesh>
      <mesh position={[0, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.06, 1.7, 32]} />
        {metal}
      </mesh>
      <mesh position={[0, 1.8, 0]} castShadow>
        <sphereGeometry args={[0.08, 32, 24]} />
        {metal}
      </mesh>
      <group ref={beam} position={[0, 1.7, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 1.5, 24]} />
          {metal}
        </mesh>
        {[-0.72, 0.72].map((x, i) => (
          <group
            key={x}
            position={[x, 0, 0]}
            ref={(el) => {
              pans.current[i] = el;
            }}
          >
            {[0, 1, 2].map((k) => {
              const a = (k / 3) * Math.PI * 2;
              return (
                <mesh key={k} position={[Math.cos(a) * 0.1, -0.3, Math.sin(a) * 0.1]} rotation={[Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3]}>
                  <cylinderGeometry args={[0.006, 0.006, 0.62, 6]} />
                  {metal}
                </mesh>
              );
            })}
            <mesh position={[0, -0.6, 0]} castShadow>
              <sphereGeometry args={[0.24, 48, 16, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38]} />
              <meshStandardMaterial color={GOLD} metalness={0.9} roughness={0.25} side={THREE.DoubleSide} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

/** A long pennant on a pole that ripples in the breeze. */
function Banner({ position, color }: { position: Vec3; color: string }) {
  const cloth = useRef<THREE.Mesh>(null);
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.8, 2.2, 12, 32);
    g.translate(0.4, -1.1, 0);
    return g;
  }, []);
  const rest = useMemo(() => Float32Array.from(geo.attributes.position.array), [geo]);
  useFrame(({ clock }) => {
    const p = cloth.current?.geometry.attributes.position;
    if (!p) return;
    rippleCloth(p as THREE.BufferAttribute, rest, clock.getElapsedTime() + position[0]);
  });
  return (
    <group position={position}>
      <mesh position={[0, 1.9, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.05, 3.8, 24]} />
        <meshStandardMaterial color="#3b3328" metalness={0.5} roughness={0.45} />
      </mesh>
      <mesh position={[0, 3.85, 0]}>
        <sphereGeometry args={[0.08, 32, 24]} />
        <meshStandardMaterial color={GOLD} metalness={0.9} roughness={0.25} />
      </mesh>
      <mesh position={[0.04, 3.55, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, 0.9, 12]} />
        <meshStandardMaterial color="#3b3328" metalness={0.5} roughness={0.45} />
      </mesh>
      <mesh ref={cloth} geometry={geo} position={[0.04, 3.55, 0]} castShadow>
        <meshStandardMaterial color={color} roughness={0.8} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0.44, 2.35, 0.012]}>
        <circleGeometry args={[0.2, 48]} />
        <meshStandardMaterial color={GOLD} metalness={0.6} roughness={0.35} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function rippleCloth(p: THREE.BufferAttribute, rest: Float32Array, t: number) {
  for (let i = 0; i < p.count; i++) {
    const x = rest[i * 3];
    const y = rest[i * 3 + 1];
    const reach = x / 0.8 + (-y / 2.2) * 0.6;
    p.setZ(i, Math.sin(t * 2.1 + x * 4 - y * 1.6) * 0.07 * reach);
  }
  p.needsUpdate = true;
}

function Bench({ position, rotation = 0 }: { position: Vec3; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {[-0.1, 0.1].map((z) => (
        <RoundedBox key={z} args={[1.7, 0.06, 0.16]} radius={0.02} smoothness={3} position={[0, 0.46, z]} castShadow receiveShadow>
          <meshStandardMaterial color={WOOD} roughness={0.6} />
        </RoundedBox>
      ))}
      <RoundedBox args={[1.7, 0.3, 0.05]} radius={0.02} smoothness={3} position={[0, 0.72, -0.2]} rotation={[-0.15, 0, 0]} castShadow>
        <meshStandardMaterial color={WOOD} roughness={0.6} />
      </RoundedBox>
      {[-0.7, 0.7].map((x) => (
        <mesh key={x} position={[x, 0.23, 0]} castShadow>
          <boxGeometry args={[0.07, 0.46, 0.4]} />
          <meshStandardMaterial color="#2f2a24" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

/** Statue, banners and benches around the steps. */
export function CourtGrounds() {
  return (
    <group>
      <group position={[-6.2, 0, 2.2]}>
        <RoundedBox args={[1.3, 1.2, 1.3]} radius={0.06} smoothness={3} position={[0, 0.6, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#c2baa6" roughness={0.8} />
        </RoundedBox>
        <RoundedBox args={[1.5, 0.14, 1.5]} radius={0.04} smoothness={3} position={[0, 1.27, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#d1c7b1" roughness={0.75} />
        </RoundedBox>
        <ScalesOfJustice position={[0, 1.34, 0]} scale={1.15} />
      </group>
      <Banner position={[-4.95, 0, 3.55]} color="#2e5e3a" />
      <Banner position={[4.95, 0, 3.55]} color="#2e5e3a" />
      <Bench position={[6.3, 0, 0.4]} rotation={-Math.PI / 2} />
      <Bench position={[6.3, 0, 2.6]} rotation={-Math.PI / 2} />
    </group>
  );
}
