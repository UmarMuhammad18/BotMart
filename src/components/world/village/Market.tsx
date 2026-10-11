"use client";

import { RoundedBox, Text, Billboard } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import type { WorldStall } from "@/lib/types";
import type { District } from "@/lib/world/districts";
import { VILLAGE } from "@/lib/world/districts";
import { ZONES, seeded } from "@/lib/world/terrain";
import { ProductMesh } from "@/components/world/ProductMesh";

const WOOD = "#9a7350";
const WOOD_DARK = "#6b4b32";

/* ── Procedural textures (generated once, client-side) ──────────────────── */

let cobbleTex: THREE.CanvasTexture | null = null;
export function cobblestones() {
  if (cobbleTex) return cobbleTex;
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#6f6a5e";
  ctx.fillRect(0, 0, 512, 512);
  const rand = seeded(31);
  for (let row = 0; row < 16; row++) {
    for (let col = 0; col < 16; col++) {
      const x = col * 32 + (row % 2) * 16 + (rand() - 0.5) * 4;
      const y = row * 32 + (rand() - 0.5) * 4;
      const shade = 150 + Math.floor(rand() * 45);
      ctx.fillStyle = `rgb(${shade},${shade - 6},${shade - 22})`;
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, 28 + (rand() - 0.5) * 3, 28 + (rand() - 0.5) * 3, 9);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.beginPath();
      ctx.roundRect(x + 5, y + 4, 18, 8, 4);
      ctx.fill();
    }
  }
  cobbleTex = new THREE.CanvasTexture(c);
  cobbleTex.wrapS = cobbleTex.wrapT = THREE.RepeatWrapping;
  cobbleTex.colorSpace = THREE.SRGBColorSpace;
  cobbleTex.anisotropy = 8;
  return cobbleTex;
}

const awningCache = new Map<string, THREE.CanvasTexture>();
function awning(color: string) {
  const hit = awningCache.get(color);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext("2d")!;
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 === 0 ? color : "#f4ecd8";
    ctx.fillRect(i * 32, 0, 32, 64);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  awningCache.set(color, t);
  return t;
}

/** A gently sagging cloth canopy (many segments, not a flat slab). */
function canopyGeometry() {
  const g = new THREE.PlaneGeometry(2.7, 1.9, 24, 12);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const sag = Math.cos((x / 2.7) * Math.PI) * 0.08 + Math.cos((y / 1.9) * Math.PI) * 0.05;
    pos.setZ(i, -sag);
  }
  g.computeVertexNormals();
  return g;
}

/* ── Stalls ─────────────────────────────────────────────────────────────── */

export function Stall({
  stall,
  color,
  selected,
  onSelect,
}: {
  stall: WorldStall;
  color: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const sold = stall.status !== "active" || stall.stock <= 0;
  const canopy = useMemo(() => canopyGeometry(), []);
  const tex = useMemo(() => awning(color), [color]);
  const label = stall.title.length > 18 ? stall.title.slice(0, 17) + "…" : stall.title;

  return (
    <group
      position={[stall.x, 0, stall.z]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Counter */}
      <RoundedBox args={[2.2, 0.86, 1.15]} radius={0.05} smoothness={3} position={[0, 0.43, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={WOOD} roughness={0.75} />
      </RoundedBox>
      <RoundedBox args={[2.36, 0.08, 1.3]} radius={0.03} smoothness={2} position={[0, 0.9, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#b88d63" roughness={0.6} />
      </RoundedBox>
      {/* Plank lines on the front */}
      {[0.22, 0.44, 0.66].map((y) => (
        <mesh key={y} position={[0, y, 0.58]}>
          <boxGeometry args={[2.18, 0.015, 0.01]} />
          <meshStandardMaterial color={WOOD_DARK} />
        </mesh>
      ))}

      {/* Posts + awning */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx * 1.12, 1.15, sz * 0.6]} castShadow>
            <cylinderGeometry args={[0.045, 0.055, 2.3, 12]} />
            <meshStandardMaterial color={WOOD_DARK} roughness={0.8} />
          </mesh>
        ))
      )}
      {!sold && (
        <mesh geometry={canopy} position={[0, 2.3, 0.08]} rotation={[-Math.PI / 2 + 0.22, 0, 0]} castShadow receiveShadow>
          <meshStandardMaterial map={tex} side={THREE.DoubleSide} roughness={0.85} />
        </mesh>
      )}

      {/* Wares */}
      {!sold && (
        <group position={[0, -0.04, 0]}>
          <ProductMesh category={stall.category} title={stall.title} sold={false} />
        </group>
      )}
      {/* Crates of stock */}
      {Array.from({ length: Math.min(3, Math.max(0, stall.stock)) }, (_, i) => (
        <RoundedBox
          key={i}
          args={[0.42, 0.34, 0.42]}
          radius={0.03}
          smoothness={2}
          position={[1.45, 0.17 + (i === 2 ? 0.34 : 0), -0.25 + (i % 2) * 0.48]}
          rotation={[0, i * 0.4, 0]}
          castShadow
        >
          <meshStandardMaterial color="#a8805a" roughness={0.85} />
        </RoundedBox>
      ))}

      {/* Chalkboard price */}
      <group position={[-1.32, 0, 0.62]} rotation={[0, 0.35, 0]}>
        <mesh position={[0, 0.42, 0]} rotation={[-0.12, 0, 0]} castShadow>
          <boxGeometry args={[0.62, 0.78, 0.05]} />
          <meshStandardMaterial color="#1f2a24" roughness={0.9} />
        </mesh>
        <Text position={[0, 0.5, 0.04]} rotation={[-0.12, 0, 0]} fontSize={0.2} anchorX="center" anchorY="middle" color={sold ? "#e7b4b4" : "#f2f2e6"}>
          {sold ? "SOLD" : `£${Math.round(stall.price)}`}
        </Text>
      </group>

      <Billboard position={[0, 3.05, 0]}>
        <Text fontSize={0.3} color="#fffdf6" anchorX="center" anchorY="bottom" outlineWidth={0.022} outlineColor="#1c2a20">
          {label}
        </Text>
      </Billboard>

      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <ringGeometry args={[1.7, 1.82, 64]} />
          <meshBasicMaterial color="#d1fae2" transparent opacity={0.75} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

/* ── Plazas, signposts, lamps ───────────────────────────────────────────── */

export function Plazas({ districts }: { districts: District[] }) {
  // One repeat-scaled copy of the cobble texture per district, made once
  const textures = useMemo(
    () =>
      new Map(
        districts.map((d) => {
          const t = cobblestones().clone();
          t.repeat.set(d.w / 2.6, d.d / 2.6);
          t.needsUpdate = true;
          return [d.id, t] as const;
        })
      ),
    [districts]
  );
  return (
    <>
      {districts.map((d) => {
        const t = textures.get(d.id)!;
        return (
          <group key={d.id} position={[d.x, 0, d.z]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
              <planeGeometry args={[d.w, d.d]} />
              <meshStandardMaterial map={t} roughness={0.9} polygonOffset polygonOffsetFactor={-2} />
            </mesh>
            {/* Kerb in the district colour */}
            {(
              [
                [0, -d.d / 2, d.w + 0.12, 0.12],
                [0, d.d / 2, d.w + 0.12, 0.12],
                [-d.w / 2, 0, 0.12, d.d],
                [d.w / 2, 0, 0.12, d.d],
              ] as const
            ).map(([x, z, w, dd], i) => (
              <mesh key={i} position={[x, 0.035, z]} receiveShadow>
                <boxGeometry args={[w, 0.07, dd]} />
                <meshStandardMaterial color={new THREE.Color(d.color).lerp(new THREE.Color("#9d9583"), 0.7)} roughness={0.85} />
              </mesh>
            ))}
            {/* Signpost */}
            <group position={[-d.w / 2 + 0.4, 0, -d.d / 2 - 0.5]}>
              <mesh position={[0, 1.1, 0]} castShadow>
                <cylinderGeometry args={[0.07, 0.08, 2.2, 12]} />
                <meshStandardMaterial color={WOOD_DARK} roughness={0.85} />
              </mesh>
              <RoundedBox args={[2.2, 0.5, 0.08]} radius={0.05} smoothness={2} position={[1.05, 1.95, 0]} castShadow>
                <meshStandardMaterial color="#7d5a3e" roughness={0.8} />
              </RoundedBox>
              <Text position={[1.05, 1.95, 0.05]} fontSize={0.24} letterSpacing={0.08} anchorX="center" anchorY="middle" color="#fff6e3">
                {d.label.toUpperCase()}
              </Text>
              <mesh position={[1.05, 1.95, -0.05]} rotation={[0, Math.PI, 0]}>
                <planeGeometry args={[2.1, 0.42]} />
                <meshStandardMaterial color={d.color} roughness={0.7} />
              </mesh>
            </group>
          </group>
        );
      })}
    </>
  );
}

export function Lamps() {
  const posts = useMemo(() => {
    const out: { x: number; z: number }[] = [];
    const n = 20;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.08;
      const r = ZONES.roadRadius - ZONES.roadHalfWidth - 0.45;
      out.push({ x: VILLAGE.cx + Math.cos(a) * r, z: VILLAGE.cz + Math.sin(a) * r });
    }
    return out;
  }, []);
  return (
    <>
      {posts.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]}>
          <mesh position={[0, 1.35, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.08, 2.7, 12]} />
            <meshStandardMaterial color="#2d3530" metalness={0.6} roughness={0.45} />
          </mesh>
          <mesh position={[0, 2.82, 0]}>
            <cylinderGeometry args={[0.16, 0.12, 0.3, 6]} />
            <meshStandardMaterial color="#2d3530" metalness={0.6} roughness={0.45} />
          </mesh>
          <mesh position={[0, 2.66, 0]}>
            <sphereGeometry args={[0.13, 18, 14]} />
            <meshStandardMaterial color="#ffd89a" emissive="#ffc46b" emissiveIntensity={2.2} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </>
  );
}

/* ── Court hall ─────────────────────────────────────────────────────────── */

export function CourtHall({ x, z }: { x: number; z: number }) {
  const rot = Math.atan2(VILLAGE.cx - x, VILLAGE.cz - z);
  const pediment = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-4.4, 0);
    s.lineTo(4.4, 0);
    s.lineTo(0, 1.6);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 6.6, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2 });
    g.translate(0, 0, -3.3);
    return g;
  }, []);
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      {/* Steps */}
      {[0, 1, 2].map((i) => (
        <RoundedBox key={i} args={[9.2 - i * 0.5, 0.22, 7.6 - i * 0.5]} radius={0.04} smoothness={2} position={[0, 0.11 + i * 0.22, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#c2baa6" roughness={0.8} />
        </RoundedBox>
      ))}
      {/* Inner hall */}
      <RoundedBox args={[6.6, 3.2, 4.4]} radius={0.06} smoothness={2} position={[0, 0.66 + 1.6, -0.7]} castShadow receiveShadow>
        <meshStandardMaterial color="#d6cdb8" roughness={0.85} />
      </RoundedBox>
      {/* Columns */}
      {[-3.4, -2.04, -0.68, 0.68, 2.04, 3.4].map((cx) => (
        <group key={cx} position={[cx, 0.66, 2.75]}>
          <mesh position={[0, 1.7, 0]} castShadow>
            <cylinderGeometry args={[0.24, 0.28, 3.4, 28]} />
            <meshStandardMaterial color="#ddd4bf" roughness={0.7} />
          </mesh>
          <RoundedBox args={[0.7, 0.18, 0.7]} radius={0.03} smoothness={2} position={[0, 3.45, 0]} castShadow>
            <meshStandardMaterial color="#d1c7b1" roughness={0.75} />
          </RoundedBox>
        </group>
      ))}
      {/* Entablature + copper roof */}
      <RoundedBox args={[8.8, 0.45, 6.6]} radius={0.05} smoothness={2} position={[0, 4.35, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#d1c7b1" roughness={0.75} />
      </RoundedBox>
      <mesh geometry={pediment} position={[0, 4.58, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#5f9e86" roughness={0.55} metalness={0.25} />
      </mesh>
      <Text position={[0, 4.35, 3.32]} fontSize={0.34} letterSpacing={0.3} anchorX="center" anchorY="middle" color="#5b5240">
        COURT
      </Text>
    </group>
  );
}
