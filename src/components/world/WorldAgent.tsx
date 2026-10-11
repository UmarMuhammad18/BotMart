"use client";

import { useFrame } from "@react-three/fiber";
import { Text, Billboard, Html } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { ROLE_BY_ID } from "@/lib/agents/roles";
import type { WorldAgent, WorldStall } from "@/lib/types";
import { wanderTarget } from "@/components/world/busyMotion";
import { laptopTextForAgent } from "@/components/world/AgentLaptop";
import { AgentStation } from "@/components/world/AgentStation";
import type { BubbleTone, WorldDirector } from "@/lib/world/director";

const BUBBLE_STYLE: Record<BubbleTone, string> = {
  offer: "border-sky-400/60 bg-sky-950/90 text-sky-100",
  counter: "border-amber-400/60 bg-amber-950/90 text-amber-100",
  accept: "border-emerald-400/70 bg-emerald-950/90 text-emerald-100",
  reject: "border-rose-400/60 bg-rose-950/90 text-rose-100",
  info: "border-white/15 bg-zinc-900/90 text-zinc-200",
};

const _goal = new THREE.Vector3();
const _dir = new THREE.Vector3();

export function WorldAgentMesh({
  agent,
  stalls,
  selected,
  onSelect,
  director,
}: {
  agent: WorldAgent;
  stalls: WorldStall[];
  selected: boolean;
  onSelect: () => void;
  director: WorldDirector;
}) {
  const group = useRef<THREE.Group>(null);
  /** [leftLeg, rightLeg, leftArm, rightArm] */
  const limbs = useRef<(THREE.Group | null)[]>([]);
  const pos = useRef(new THREE.Vector3(agent.x, 0, agent.z));
  const stride = useRef(0);
  const color = ROLE_BY_ID[agent.role]?.hex || "#94a3b8";
  // Per-agent idle bob phase, stable across renders
  const bob = useMemo(() => {
    let h = 0;
    for (let i = 0; i < agent.id.length; i++) h = (h * 31 + agent.id.charCodeAt(i)) | 0;
    return ((Math.abs(h) % 628) / 100);
  }, [agent.id]);
  // Negotiations are staged by the director; the snapshot flag alone just roams
  const roam = useMemo(
    () =>
      agent.activity === "negotiating"
        ? { ...agent, activity: "idle" as const }
        : agent,
    [agent]
  );
  const bubble = director.bubbleFor(agent.id);

  useFrame(({ clock }, rawDt) => {
    if (!group.current) return;
    const dt = Math.min(rawDt, 0.1);
    const t = clock.getElapsedTime();
    const placement = director.placementFor(agent.id);

    if (placement) {
      _goal.set(placement.x, 0, placement.z);
    } else if (roam.activity === "idle" || roam.activity === "blocked") {
      _goal.set(agent.x, 0, agent.z);
    } else {
      const w = wanderTarget(roam, t, stalls);
      _goal.set(w.x, 0, w.z);
    }

    _dir.copy(_goal).sub(pos.current);
    const dist = _dir.length();
    // Brisk when far, eases in on arrival; keeps up with faster playback
    const speed =
      THREE.MathUtils.clamp(dist * 1.3, 1.6, 7) * Math.max(1, director.speed);
    const step = Math.min(dist, speed * dt);
    const moving = dist > 0.04;
    if (moving) pos.current.addScaledVector(_dir, step / dist);
    director.livePos.set(agent.id, { x: pos.current.x, z: pos.current.z });

    // Walk cycle: legs and arms swing in opposition while moving
    const gait = moving && dt > 0 ? Math.min(1, step / dt / 2.5) : 0;
    stride.current += dt * (6 + 6 * gait);
    const swing = Math.sin(stride.current) * 0.6 * gait;
    limbs.current.forEach((limb, i) => {
      if (!limb) return;
      const sign = i % 2 === 0 ? 1 : -1;
      const arm = i >= 2;
      limb.rotation.x = THREE.MathUtils.lerp(
        limb.rotation.x,
        (arm ? -swing * 0.7 : swing) * sign,
        0.3
      );
    });

    const y =
      0.58 +
      (gait > 0.05
        ? Math.abs(Math.sin(stride.current)) * 0.05 * gait
        : Math.sin(t * 2.4 + bob) * 0.035);
    group.current.position.set(pos.current.x, y, pos.current.z);

    if (moving && dist > 0.15) {
      group.current.rotation.y = lerpAngle(
        group.current.rotation.y,
        Math.atan2(_dir.x, _dir.z),
        0.15
      );
    } else if (placement) {
      group.current.rotation.y = lerpAngle(
        group.current.rotation.y,
        Math.atan2(
          placement.faceX - pos.current.x,
          placement.faceZ - pos.current.z
        ),
        0.12
      );
    } else {
      // Face the laptop station
      group.current.rotation.y = lerpAngle(
        group.current.rotation.y,
        Math.PI * 0.15,
        0.05
      );
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
    emissiveIntensity: selected ? 0.35 : 0,
  } as const;

  const screen = laptopTextForAgent(agent, stalls, agent.id);

  return (
    <group>
      {/* Fixed laptop station at home slot */}
      <group position={[agent.x, 0, agent.z]}>
        <AgentStation screenText={screen} accent={ringColor} />
      </group>

      {/* Clickable agent body — placed in world space by useFrame */}
      <group
        ref={group}
        position={[agent.x, 0.58, agent.z]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={() => {
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
        }}
      >
        {/* selection glow under feet */}
        {selected && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.56, 0]}>
            <ringGeometry args={[0.35, 0.42, 48]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={0.7}
              toneMapped={false}
            />
          </mesh>
        )}

        <mesh castShadow position={[0, -0.12, 0]}>
          <cylinderGeometry args={[0.22, 0.26, 0.28, 24]} />
          <meshPhysicalMaterial {...bodyMat} />
        </mesh>
        <mesh castShadow position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.28, 0.24, 0.42, 28]} />
          <meshPhysicalMaterial {...bodyMat} />
        </mesh>
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

        {/* Arms pivot at the shoulder */}
        {([-1, 1] as const).map((side, i) => (
          <group
            key={side}
            ref={(el) => {
              limbs.current[2 + i] = el;
            }}
            position={[side * 0.34, 0.32, 0]}
          >
            <mesh castShadow>
              <sphereGeometry args={[0.11, 20, 16]} />
              <meshPhysicalMaterial {...bodyMat} />
            </mesh>
            <mesh position={[side * 0.02, -0.2, 0]} castShadow>
              <capsuleGeometry args={[0.07, 0.22, 8, 16]} />
              <meshPhysicalMaterial {...bodyMat} />
            </mesh>
            <mesh
              position={[side * 0.02, -0.42, 0.04]}
              rotation={[0.25, 0, 0]}
              castShadow
            >
              <capsuleGeometry args={[0.055, 0.16, 8, 16]} />
              <meshPhysicalMaterial {...bodyMat} />
            </mesh>
          </group>
        ))}

        {/* Legs pivot at the hip */}
        {([-1, 1] as const).map((side, i) => (
          <group
            key={`leg-${side}`}
            ref={(el) => {
              limbs.current[i] = el;
            }}
            position={[side * 0.12, -0.35, 0]}
          >
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

        <mesh position={[0, 0.42, 0]}>
          <cylinderGeometry args={[0.08, 0.1, 0.1, 16]} />
          <meshPhysicalMaterial {...bodyMat} />
        </mesh>
        <mesh position={[0, 0.62, 0]} castShadow>
          <sphereGeometry args={[0.2, 28, 22]} />
          <meshPhysicalMaterial {...bodyMat} />
        </mesh>
        <mesh position={[0, 0.52, 0.06]}>
          <boxGeometry args={[0.28, 0.12, 0.22]} />
          <meshPhysicalMaterial {...bodyMat} />
        </mesh>
        <mesh position={[0, 0.64, 0.14]}>
          <boxGeometry args={[0.28, 0.09, 0.05]} />
          <meshStandardMaterial
            color="#67e8f9"
            emissive="#22d3ee"
            emissiveIntensity={3}
            toneMapped={false}
          />
        </mesh>
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

        <Billboard position={[0, 1.25, 0]}>
          <Text
            fontSize={0.16}
            color="#f4f4f5"
            anchorX="center"
            anchorY="bottom"
            outlineWidth={0.012}
            outlineColor="#000"
          >
            {short}
          </Text>
        </Billboard>

        {bubble && (
          <Html
            position={[0, 1.6, 0]}
            center
            zIndexRange={[20, 0]}
            style={{ pointerEvents: "none" }}
          >
            <div
              key={bubble.key}
              className={`world-bubble max-w-[200px] w-max rounded-xl border px-2.5 py-1.5 text-[11px] leading-snug shadow-lg backdrop-blur ${BUBBLE_STYLE[bubble.tone]}`}
            >
              {bubble.price != null &&
                bubble.tone !== "info" &&
                !bubble.text.includes(`£${Math.round(bubble.price)}`) && (
                <span className="font-mono font-semibold mr-1">
                  £{Math.round(bubble.price)}
                </span>
              )}
              {bubble.text}
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}

/** Lerp between angles along the shortest arc (no full-circle spins). */
function lerpAngle(from: number, to: number, k: number) {
  const d = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + d * k;
}
