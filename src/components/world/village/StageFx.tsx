"use client";

import { useFrame } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { WorldSnapshot, WorldStall } from "@/lib/types";
import type { WorldDirector } from "@/lib/world/director";

/*
 * Director-driven stage effects shared by the world scene: the sim clock,
 * live price tags / auction banners over negotiated stalls, deal bursts.
 */

/** Advances the director on the render clock (sim time scales with speed). */
export function DirectorClock({ director }: { director: WorldDirector }) {
  useFrame((_, dt) => director.tick(dt * 1000));
  return null;
}

/** Live price tag + pulsing floor ring over each stall being negotiated. */
export function NegotiationTags({
  snapshot,
  director,
}: {
  snapshot: WorldSnapshot;
  director: WorldDirector;
}) {
  const stallMap = useMemo(
    () => new Map(snapshot.stalls.map((s) => [s.id, s])),
    [snapshot.stalls]
  );

  return (
    <>
      {director.links.map((link) => {
        const s = stallMap.get(link.stallId);
        if (!s) return null;
        return (
          <NegotiationTag
            key={`${link.buyerId}-${link.stallId}`}
            stall={s}
            price={link.price}
            bidders={link.bidders}
          />
        );
      })}
    </>
  );
}

function NegotiationTag({
  stall,
  price,
  bidders,
}: {
  stall: WorldStall;
  price: number | null;
  bidders: number;
}) {
  const auction = bidders > 1;
  const ring = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ring.current) return;
    const k = 1 + ((clock.getElapsedTime() * 0.8) % 1) * 0.35;
    ring.current.scale.set(k, k, 1);
    (ring.current.material as THREE.MeshBasicMaterial).opacity = 1.35 - k;
  });

  return (
    <group position={[stall.x, 0, stall.z]}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0.6]}>
        <ringGeometry args={[1.95, 2.08, 64]} />
        <meshBasicMaterial
          color={auction ? "#f472b6" : "#fbbf24"}
          transparent
          toneMapped={false}
        />
      </mesh>
      {auction && (
        <Billboard position={[0, 4.35, 0]}>
          <Text
            fontSize={0.3}
            letterSpacing={0.08}
            color="#f9a8d4"
            anchorX="center"
            outlineWidth={0.022}
            outlineColor="#500724"
          >
            {`AUCTION · ${bidders} bidders`}
          </Text>
        </Billboard>
      )}
      {price != null && (
        <Billboard position={[0, 3.75, 0]}>
          <Text
            fontSize={0.34}
            color="#fde68a"
            anchorX="center"
            outlineWidth={0.024}
            outlineColor="#422006"
          >
            {`⇄ £${Math.round(price)}`}
          </Text>
        </Billboard>
      )}
    </group>
  );
}

/** Deal / no-deal bursts: rising label, shockwave ring, coin spray. */
export function DealBursts({ director }: { director: WorldDirector }) {
  return (
    <>
      {director.activeBursts.map((b) => (
        <DealBurst key={b.id} burst={b} director={director} />
      ))}
    </>
  );
}

const COINS = 10;

function DealBurst({
  burst,
  director,
}: {
  burst: { x: number; z: number; label: string; tone: "deal" | "walk"; bornAt: number };
  director: WorldDirector;
}) {
  const label = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const coins = useRef<(THREE.Mesh | null)[]>([]);
  const deal = burst.tone === "deal";
  const color = deal ? "#42d886" : "#fb7185";

  useFrame(() => {
    // Seconds since birth on the director clock (respects playback speed)
    const age = (director.now - burst.bornAt) / 1000;
    if (label.current) label.current.position.y = 3.4 + Math.min(age, 1.2) * 0.9;
    if (ring.current) {
      const k = 0.3 + age * 2.2;
      ring.current.scale.set(k, k, 1);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = Math.max(
        0,
        0.9 - age * 0.6
      );
    }
    coins.current.forEach((c, i) => {
      if (!c) return;
      const a = (i / COINS) * Math.PI * 2;
      const r = age * 1.6;
      c.position.set(
        Math.cos(a) * r,
        1.6 + age * 3.4 - age * age * 3.4,
        Math.sin(a) * r
      );
      c.rotation.y = age * 8 + i;
      c.visible = deal && c.position.y > 0;
    });
  });

  return (
    <group position={[burst.x, 0, burst.z]}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[1, 1.15, 48]} />
        <meshBasicMaterial color={color} transparent toneMapped={false} />
      </mesh>
      {Array.from({ length: COINS }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            coins.current[i] = el;
          }}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.1, 0.1, 0.03, 48]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#f59e0b"
            emissiveIntensity={1.6}
            metalness={0.9}
            roughness={0.2}
            toneMapped={false}
          />
        </mesh>
      ))}
      <group ref={label}>
        <Billboard>
          <Text
            fontSize={deal ? 0.5 : 0.36}
            color={deal ? "#74e9a5" : "#fda4af"}
            anchorX="center"
            outlineWidth={0.03}
            outlineColor={deal ? "#052e16" : "#4c0519"}
          >
            {burst.label}
          </Text>
        </Billboard>
      </group>
    </group>
  );
}
