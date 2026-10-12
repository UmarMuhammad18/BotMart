"use client";

import { Line } from "@react-three/drei";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { VILLAGE } from "@/lib/world/districts";
import { seeded, ZONES } from "@/lib/world/terrain";
import { cobbleMaps } from "./Market";

/** The market square: cobbles up to the road, a fountain, barrels, bunting. */
export function MarketSquare() {
  const tex = useMemo(() => {
    const r = (ZONES.marketRadius * 2) / 2.2;
    return cobbleMaps(r, r);
  }, []);
  return (
    <group position={[VILLAGE.cx, 0, VILLAGE.cz]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} receiveShadow>
        <circleGeometry args={[ZONES.marketRadius, 128]} />
        <meshStandardMaterial map={tex.map} bumpMap={tex.bump} bumpScale={2.2} color="#e6dcc4" roughness={0.92} polygonOffset polygonOffsetFactor={-1} />
      </mesh>
      {/* Kerb stones at the edge of the square */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
        <ringGeometry args={[ZONES.marketRadius - 0.32, ZONES.marketRadius, 160]} />
        <meshStandardMaterial color="#9d9583" roughness={0.9} />
      </mesh>
      <Fountain />
      <Barrels />
    </group>
  );
}

function Fountain() {
  const stone = "#c8bfa8";
  return (
    <group>
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.55, 1.7, 0.6, 64]} />
        <meshStandardMaterial color="#b9b09a" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[1.36, 1.36, 0.06, 64]} />
        <meshPhysicalMaterial color="#3f8f8a" roughness={0.06} metalness={0.1} clearcoat={1} clearcoatRoughness={0.05} envMapIntensity={1.4} />
      </mesh>
      <mesh position={[0, 1.15, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.32, 1.3, 64]} />
        <meshStandardMaterial color={stone} roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.82, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.72, 0.38, 0.22, 48]} />
        <meshStandardMaterial color={stone} roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.93, 0]}>
        <cylinderGeometry args={[0.62, 0.62, 0.03, 48]} />
        <meshPhysicalMaterial color="#5fb3a8" roughness={0.05} clearcoat={1} envMapIntensity={1.4} />
      </mesh>
      <mesh position={[0, 2.18, 0]} castShadow>
        <sphereGeometry args={[0.16, 32, 24]} />
        <meshStandardMaterial color={stone} roughness={0.75} />
      </mesh>
    </group>
  );
}

function Barrels() {
  const spots = useMemo(() => {
    const rand = seeded(808);
    return Array.from({ length: 14 }, (_, i) => {
      const a = (i / 14) * Math.PI * 2 + rand() * 0.2 + 0.18;
      const r = ZONES.marketRadius - 1.3 - rand() * 0.6;
      return { x: Math.cos(a) * r, z: Math.sin(a) * r, rot: rand() * Math.PI };
    });
  }, []);
  return (
    <>
      {spots.map((b, i) => (
        <group key={i} position={[b.x, 0, b.z]} rotation={[0, b.rot, 0]}>
          <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.3, 0.3, 0.84, 64]} />
            <meshStandardMaterial color="#8b6342" roughness={0.75} />
          </mesh>
          {[0.14, 0.7].map((y) => (
            <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.305, 0.025, 8, 32]} />
              <meshStandardMaterial color="#3b3f3c" metalness={0.6} roughness={0.4} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  );
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _axis = new THREE.Vector3(0, 1, 0);
const _one = new THREE.Vector3(1, 1, 1);
const _c = new THREE.Color();
const FLAGS = ["#42d886", "#f4ecd8", "#139c57", "#e9c46a", "#74e9a5"];

/** Strings of pennants hung between neighbouring lamp posts. */
export function Bunting() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const { lines, flags } = useMemo(() => {
    const n = 20;
    const r = ZONES.roadRadius - ZONES.roadHalfWidth - 0.45;
    const lines: THREE.Vector3[][] = [];
    const flags: { p: THREE.Vector3; yaw: number }[] = [];
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2 + 0.08;
      const a1 = ((i + 1) / n) * Math.PI * 2 + 0.08;
      const p0 = new THREE.Vector3(VILLAGE.cx + Math.cos(a0) * r, 2.55, VILLAGE.cz + Math.sin(a0) * r);
      const p1 = new THREE.Vector3(VILLAGE.cx + Math.cos(a1) * r, 2.55, VILLAGE.cz + Math.sin(a1) * r);
      const yaw = Math.atan2(p1.x - p0.x, p1.z - p0.z);
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 16; k++) {
        const t = k / 16;
        const p = p0.clone().lerp(p1, t);
        p.y -= Math.sin(t * Math.PI) * 0.45; // sag
        pts.push(p);
        if (k > 0 && k < 16 && k % 2 === 0) flags.push({ p, yaw });
      }
      lines.push(pts);
    }
    return { lines, flags };
  }, []);
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.14, 0);
    s.lineTo(0.14, 0);
    s.lineTo(0, -0.34);
    s.closePath();
    return new THREE.ShapeGeometry(s);
  }, []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    flags.forEach((f, i) => {
      _q.setFromAxisAngle(_axis, f.yaw + Math.PI / 2);
      mesh.setMatrixAt(i, _m.compose(f.p, _q, _one));
      mesh.setColorAt(i, _c.set(FLAGS[i % FLAGS.length]));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [flags]);

  return (
    <>
      {lines.map((pts, i) => (
        <Line key={i} points={pts} color="#3b3328" lineWidth={1.2} />
      ))}
      <instancedMesh ref={ref} args={[geo, undefined, flags.length]} castShadow>
        <meshStandardMaterial side={THREE.DoubleSide} roughness={0.8} />
      </instancedMesh>
    </>
  );
}
