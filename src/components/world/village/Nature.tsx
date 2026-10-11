"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { VILLAGE, COURT_POS } from "@/lib/world/districts";
import {
  canGrow,
  fbm,
  heightAt,
  inMarket,
  inPond,
  pathAmount,
  radiusFromCentre,
  seeded,
  ZONES,
  type Footprint,
} from "@/lib/world/terrain";

const SIZE = 200;
const SEGMENTS = 240;
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const _e = new THREE.Euler();
const _c = new THREE.Color();

const GRASS = ["#3c7029", "#4a8233", "#57913d", "#5f9842", "#467b31"].map((c) => new THREE.Color(c));
const DRY = new THREE.Color("#93a85b");
const DIRT = new THREE.Color("#8a7252");
const DIRT_DARK = new THREE.Color("#6f5a40");
const STONE = new THREE.Color("#a99f87");
const STONE_DARK = new THREE.Color("#8d846f");

/* ── Ground ─────────────────────────────────────────────────────────────── */

export function Terrain({ homes }: { homes: Footprint[] }) {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS);
    g.rotateX(-Math.PI / 2);
    g.translate(VILLAGE.cx, 0, VILLAGE.cz);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, heightAt(x, z));

      const n = fbm(x * 0.08, z * 0.08);
      const n2 = fbm(x * 0.6 + 7, z * 0.6 - 3);
      // meadow: blend of greens with a few dry patches
      const gi = Math.min(GRASS.length - 1, Math.floor(n * GRASS.length));
      _c.copy(GRASS[gi]).lerp(GRASS[(gi + 1) % GRASS.length], n2 * 0.6);
      _c.lerp(DRY, Math.max(0, fbm(x * 0.03 + 11, z * 0.03) - 0.62) * 1.6);
      // darker towards the hilltops for depth
      _c.multiplyScalar(1 - Math.min(0.25, heightAt(x, z) * 0.025));
      // market floor: worn stone
      const r = radiusFromCentre(x, z);
      const market = 1 - Math.min(1, Math.max(0, (r - (ZONES.marketRadius - 1.2)) / 1.4));
      if (market > 0) _c.lerp(STONE.clone().lerp(STONE_DARK, n2), market);
      // damp earth around the pond
      if (inPond(x, z, 1.2)) _c.lerp(DIRT_DARK, 0.55);
      // roads and footpaths: packed dirt
      const path = pathAmount(x, z, homes);
      if (path > 0) _c.lerp(DIRT.clone().lerp(DIRT_DARK, n2 * 0.8), path * 0.95);
      colors.set([_c.r, _c.g, _c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, [homes]);

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.96} metalness={0} />
    </mesh>
  );
}

/* ── Wind-blown grass ───────────────────────────────────────────────────── */

const windUniform = { value: 0 };

function grassMaterial() {
  const m = new THREE.MeshStandardMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    roughness: 0.85,
  });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windUniform;
    shader.vertexShader = "uniform float uTime;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader
      // Light grass from above so back faces don't go black
      .replace("#include <beginnormal_vertex>", "vec3 objectNormal = vec3(0.0, 1.0, 0.0);")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
         float bend = position.y * position.y * 2.6;
         vec4 root = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
         float gust = sin(uTime * 1.5 + root.x * 0.42 + root.z * 0.31) + 0.45 * sin(uTime * 2.9 + root.x * 1.7 - root.z * 0.9);
         transformed.x += gust * 0.075 * bend;
         transformed.z += gust * 0.045 * bend;`
      );
  };
  return m;
}

export function Grass({ homes, count }: { homes: Footprint[]; count: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const { geometry, material } = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.075, 0.62, 1, 5);
    g.translate(0, 0.31, 0);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const base = new THREE.Color("#284f1d");
    const tip = new THREE.Color("#8fbf58");
    for (let i = 0; i < pos.count; i++) {
      const t = pos.getY(i) / 0.62;
      pos.setX(i, pos.getX(i) * (1 - t * 0.85)); // taper to a point
      _c.copy(base).lerp(tip, t);
      colors.set([_c.r, _c.g, _c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return { geometry: g, material: grassMaterial() };
  }, []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const rand = seeded(7);
    let placed = 0;
    let tries = 0;
    while (placed < count && tries < count * 6) {
      tries++;
      const a = rand() * Math.PI * 2;
      // denser near the cottages, thinning out up the hills
      const r = ZONES.marketRadius + 0.5 + Math.pow(rand(), 1.35) * 46;
      const x = VILLAGE.cx + Math.cos(a) * r;
      const z = VILLAGE.cz + Math.sin(a) * r;
      if (!canGrow(x, z, homes, COURT_POS)) continue;
      if (fbm(x * 0.22, z * 0.22) < 0.33) continue; // natural clumping
      _p.set(x, heightAt(x, z), z);
      _q.setFromEuler(_e.set(0, rand() * Math.PI, (rand() - 0.5) * 0.25));
      const h = 0.6 + rand() * 0.75;
      _s.set(1, h, 1);
      mesh.setMatrixAt(placed++, _m.compose(_p, _q, _s));
    }
    mesh.count = placed;
    mesh.instanceMatrix.needsUpdate = true;
  }, [homes, count]);

  useFrame((_, dt) => {
    windUniform.value += Math.min(dt, 0.1);
  });

  return <instancedMesh ref={ref} args={[geometry, material, count]} receiveShadow frustumCulled={false} />;
}

/* ── Trees, bushes, flowers, rocks ──────────────────────────────────────── */

/** Smooth, slightly lumpy canopy blob (high detail, not low poly). */
function canopyGeometry() {
  // Polyhedra are non-indexed (flat normals): weld vertices so shading is smooth
  const g = mergeVertices(new THREE.IcosahedronGeometry(1, 4).deleteAttribute("normal").deleteAttribute("uv"));
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const k = 1 + (fbm(v.x * 1.6 + 3, v.y * 1.6 + v.z * 1.3) - 0.5) * 0.35;
    v.multiplyScalar(k);
    pos.setXYZ(i, v.x, v.y * 0.86, v.z);
  }
  g.computeVertexNormals();
  return g;
}

function rockGeometry() {
  const g = mergeVertices(new THREE.DodecahedronGeometry(1, 2).deleteAttribute("normal").deleteAttribute("uv"));
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    v.multiplyScalar(1 + (fbm(v.x * 2 + 9, v.z * 2 + v.y) - 0.5) * 0.5);
    pos.setXYZ(i, v.x, v.y * 0.6, v.z);
  }
  g.computeVertexNormals();
  return g;
}

type TreeSpot = { x: number; z: number; y: number; s: number; kind: "broad" | "pine"; hue: number };

function scatterTrees(homes: Footprint[]): TreeSpot[] {
  const rand = seeded(1234);
  const spots: TreeSpot[] = [];
  const far = (x: number, z: number, d: number) => spots.every((t) => Math.hypot(t.x - x, t.z - z) > d);
  let tries = 0;
  while (spots.length < 130 && tries < 6000) {
    tries++;
    const a = rand() * Math.PI * 2;
    const r = 29 + Math.pow(rand(), 0.8) * 40;
    const x = VILLAGE.cx + Math.cos(a) * r;
    const z = VILLAGE.cz + Math.sin(a) * r;
    if (!canGrow(x, z, homes, COURT_POS) || !far(x, z, 3.6)) continue;
    // leave a few clearings
    if (fbm(x * 0.05 + 21, z * 0.05) < 0.36) continue;
    spots.push({
      x,
      z,
      y: heightAt(x, z),
      s: 0.85 + rand() * 0.6,
      kind: rand() < 0.32 ? "pine" : "broad",
      hue: rand(),
    });
  }
  return spots;
}

const LEAVES = ["#4f8f3a", "#5d9c40", "#3f7a2f", "#6aa84a", "#477f35"];
const PINE = ["#2f6b3a", "#2a5f35", "#346f3f"];

export function Trees({ homes }: { homes: Footprint[] }) {
  const trunks = useRef<THREE.InstancedMesh>(null);
  const crowns = useRef<THREE.InstancedMesh>(null);
  const cones = useRef<THREE.InstancedMesh>(null);
  const spots = useMemo(() => scatterTrees(homes), [homes]);
  const broad = spots.filter((s) => s.kind === "broad");
  const pines = spots.filter((s) => s.kind === "pine");

  const geo = useMemo(
    () => ({
      trunk: new THREE.CylinderGeometry(0.16, 0.28, 2.6, 14, 3).translate(0, 1.3, 0),
      crown: canopyGeometry(),
      cone: new THREE.ConeGeometry(1, 1.9, 28, 2).translate(0, 0.95, 0),
    }),
    []
  );

  useLayoutEffect(() => {
    const rand = seeded(99);
    let ti = 0;
    let ci = 0;
    let ki = 0;
    for (const t of spots) {
      const trunkH = t.kind === "pine" ? 0.7 : 1;
      _q.setFromEuler(_e.set((rand() - 0.5) * 0.06, rand() * Math.PI, (rand() - 0.5) * 0.06));
      trunks.current!.setMatrixAt(ti++, _m.compose(_p.set(t.x, t.y, t.z), _q, _s.set(t.s, t.s * trunkH, t.s)));
      if (t.kind === "broad") {
        const blobs: [number, number, number, number][] = [
          [0, 3.25, 0, 1.45],
          [0.85, 2.75, 0.2, 1.0],
          [-0.75, 2.85, 0.35, 1.05],
          [0.1, 2.7, -0.85, 1.0],
          [0.2, 3.95, 0.1, 0.95],
        ];
        for (const [bx, by, bz, br] of blobs) {
          _q.setFromEuler(_e.set(0, rand() * Math.PI * 2, 0));
          crowns.current!.setMatrixAt(
            ci,
            _m.compose(_p.set(t.x + bx * t.s, t.y + by * t.s, t.z + bz * t.s), _q, _s.setScalar(br * t.s))
          );
          _c.set(LEAVES[Math.floor(t.hue * LEAVES.length)]).offsetHSL(0, 0, (rand() - 0.5) * 0.06);
          crowns.current!.setColorAt(ci++, _c);
        }
      } else {
        const tiers: [number, number][] = [
          [1.0, 1.55],
          [2.1, 1.2],
          [3.1, 0.85],
        ];
        for (const [ty, tr] of tiers) {
          cones.current!.setMatrixAt(
            ki,
            _m.compose(_p.set(t.x, t.y + ty * t.s, t.z), _q.identity(), _s.set(tr * t.s, t.s * 1.15, tr * t.s))
          );
          _c.set(PINE[Math.floor(t.hue * PINE.length)]);
          cones.current!.setColorAt(ki++, _c);
        }
      }
    }
    for (const m of [trunks.current!, crowns.current!, cones.current!]) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  }, [spots]);

  return (
    <group>
      <instancedMesh ref={trunks} args={[geo.trunk, undefined, spots.length]} castShadow receiveShadow>
        <meshStandardMaterial color="#5a4330" roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[geo.crown, undefined, broad.length * 5]} castShadow receiveShadow>
        <meshStandardMaterial roughness={0.78} />
      </instancedMesh>
      <instancedMesh ref={cones} args={[geo.cone, undefined, Math.max(1, pines.length * 3)]} castShadow receiveShadow>
        <meshStandardMaterial roughness={0.82} />
      </instancedMesh>
    </group>
  );
}

/** Bushes along cottages and the road, wildflowers in the meadow, rocks on the hills. */
export function Undergrowth({ homes }: { homes: Footprint[] }) {
  const bushes = useRef<THREE.InstancedMesh>(null);
  const flowers = useRef<THREE.InstancedMesh>(null);
  const rocks = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(
    () => ({ bush: canopyGeometry(), flower: new THREE.IcosahedronGeometry(1, 2), rock: rockGeometry() }),
    []
  );
  const counts = { bush: 140, flower: 1100, rock: 46 };

  useLayoutEffect(() => {
    const rand = seeded(5150);
    // bushes: two beside each cottage, the rest along the road's outer edge
    let bi = 0;
    for (const h of homes) {
      for (const side of [-1, 1]) {
        const sx = h.x + Math.cos(h.rot) * side * 3.2 + Math.sin(h.rot) * 1.6;
        const sz = h.z - Math.sin(h.rot) * side * 3.2 + Math.cos(h.rot) * 1.6;
        bushes.current!.setMatrixAt(bi, _m.compose(_p.set(sx, 0.35, sz), _q.identity(), _s.set(0.75, 0.6, 0.75)));
        bushes.current!.setColorAt(bi++, _c.set("#3f7a30"));
      }
    }
    let tries = 0;
    while (bi < counts.bush && tries < 4000) {
      tries++;
      const a = rand() * Math.PI * 2;
      const r = ZONES.roadRadius + ZONES.roadHalfWidth + 0.9 + rand() * 1.6;
      const x = VILLAGE.cx + Math.cos(a) * r;
      const z = VILLAGE.cz + Math.sin(a) * r;
      if (!canGrow(x, z, homes, COURT_POS) || rand() < 0.45) continue;
      const s = 0.35 + rand() * 0.45;
      bushes.current!.setMatrixAt(bi, _m.compose(_p.set(x, s * 0.5, z), _q.identity(), _s.set(s, s * 0.8, s)));
      bushes.current!.setColorAt(bi++, _c.set(LEAVES[Math.floor(rand() * LEAVES.length)]).offsetHSL(0, 0, -0.04));
    }
    bushes.current!.count = bi;

    const petals = ["#fff8e7", "#ffe38a", "#f7b7d2", "#c9b6ff", "#ffffff"];
    let fi = 0;
    tries = 0;
    while (fi < counts.flower && tries < 20000) {
      tries++;
      const a = rand() * Math.PI * 2;
      const r = ZONES.roadRadius + 2 + rand() * 30;
      const x = VILLAGE.cx + Math.cos(a) * r;
      const z = VILLAGE.cz + Math.sin(a) * r;
      if (!canGrow(x, z, homes, COURT_POS) || fbm(x * 0.12 + 5, z * 0.12) < 0.55) continue;
      const s = 0.05 + rand() * 0.04;
      flowers.current!.setMatrixAt(fi, _m.compose(_p.set(x, heightAt(x, z) + 0.42 + rand() * 0.2, z), _q.identity(), _s.setScalar(s)));
      flowers.current!.setColorAt(fi++, _c.set(petals[Math.floor(rand() * petals.length)]));
    }
    flowers.current!.count = fi;

    let ri = 0;
    tries = 0;
    while (ri < counts.rock && tries < 3000) {
      tries++;
      const a = rand() * Math.PI * 2;
      const r = 30 + rand() * 38;
      const x = VILLAGE.cx + Math.cos(a) * r;
      const z = VILLAGE.cz + Math.sin(a) * r;
      if (!canGrow(x, z, homes, COURT_POS) || inMarket(x, z)) continue;
      const s = 0.3 + rand() * 0.9;
      _q.setFromEuler(_e.set(rand(), rand() * 6, rand()));
      rocks.current!.setMatrixAt(ri, _m.compose(_p.set(x, heightAt(x, z) + s * 0.15, z), _q, _s.set(s, s * 0.8, s * 1.1)));
      rocks.current!.setColorAt(ri++, _c.set("#8c9086").offsetHSL(0, 0, (rand() - 0.5) * 0.1));
    }
    rocks.current!.count = ri;

    for (const m of [bushes.current!, flowers.current!, rocks.current!]) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
    // counts is constant; homes drives placement
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homes]);

  return (
    <group>
      <instancedMesh ref={bushes} args={[geo.bush, undefined, counts.bush]} castShadow receiveShadow>
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={flowers} args={[geo.flower, undefined, counts.flower]}>
        <meshStandardMaterial roughness={0.6} emissive="#2a2a1a" emissiveIntensity={0.2} />
      </instancedMesh>
      <instancedMesh ref={rocks} args={[geo.rock, undefined, counts.rock]} castShadow receiveShadow>
        <meshStandardMaterial roughness={0.92} />
      </instancedMesh>
    </group>
  );
}
