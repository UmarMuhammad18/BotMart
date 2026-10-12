import * as THREE from "three";

/**
 * Loop subdivision for indexed triangle meshes. Each pass splits every
 * triangle into four and smooths the surface (Loop's vertex and edge rules,
 * with boundary rules at open edges and UV seams so nothing cracks).
 *
 * Unlike a plain subdivider it keeps skinned meshes working: skin weights on
 * new vertices blend their neighbours' weights (top four, renormalised), and
 * morph targets (e.g. facial expressions) are subdivided with the same rules.
 */
export function loopSubdivide(geometry: THREE.BufferGeometry, passes = 1): THREE.BufferGeometry {
  let g = geometry.index ? geometry : indexed(geometry);
  for (let i = 0; i < passes; i++) g = subdivideOnce(g, "loop");
  return g;
}

/**
 * Phong tessellation (Boubekeur & Alexa): the same 1→4 split, but original
 * vertices stay put and each new edge point is lifted onto the curved
 * surface implied by the vertex normals. Silhouettes round off without the
 * shrinkage Loop causes, which matters for models built from many small,
 * separate parts (limbs keep their thickness and joints don't open up).
 */
export function phongSubdivide(geometry: THREE.BufferGeometry, passes = 1, alpha = 0.6): THREE.BufferGeometry {
  let g = geometry.index ? geometry : indexed(geometry);
  // Normals come from the input mesh once and are interpolated from then on,
  // so later passes follow the original smooth surface instead of amplifying
  // the bumps of the previous pass.
  let normals = seamlessNormals(g);
  for (let i = 0; i < passes; i++) {
    const { edgeA, edgeB } = edgesOf(g);
    g = subdivideOnce(g, "phong", alpha, normals);
    normals = interpolateNormals(normals, edgeA, edgeB);
  }
  return g;
}

function edgesOf(geo: THREE.BufferGeometry) {
  // Same edge order as subdivideOnce: first appearance while walking faces
  const index = geo.index!.array;
  const nV = geo.attributes.position.count;
  const seen = new Set<number>();
  const edgeA: number[] = [];
  const edgeB: number[] = [];
  for (let f = 0; f < index.length; f += 3) {
    for (let k = 0; k < 3; k++) {
      const a = index[f + k];
      const b = index[f + ((k + 1) % 3)];
      const key = a < b ? a * nV + b : b * nV + a;
      if (seen.has(key)) continue;
      seen.add(key);
      edgeA.push(Math.min(a, b));
      edgeB.push(Math.max(a, b));
    }
  }
  return { edgeA, edgeB };
}

function interpolateNormals(n: Float32Array, edgeA: number[], edgeB: number[]) {
  const nV = n.length / 3;
  const out = new Float32Array((nV + edgeA.length) * 3);
  out.set(n);
  for (let e = 0; e < edgeA.length; e++) {
    const a = edgeA[e] * 3;
    const b = edgeB[e] * 3;
    const x = n[a] + n[b];
    const y = n[a + 1] + n[b + 1];
    const z = n[a + 2] + n[b + 2];
    const len = Math.hypot(x, y, z) || 1;
    const o = (nV + e) * 3;
    out[o] = x / len;
    out[o + 1] = y / len;
    out[o + 2] = z / len;
  }
  return out;
}

/**
 * Vertex normals averaged by position, so vertices duplicated along UV seams
 * share one normal and the surface doesn't crack there.
 */
function seamlessNormals(geo: THREE.BufferGeometry) {
  const pos = geo.attributes.position;
  const index = geo.index!.array;
  const key = (i: number) =>
    `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;
  const slot = new Map<string, number>();
  const slotOf = new Uint32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const k = key(i);
    let sIdx = slot.get(k);
    if (sIdx === undefined) slot.set(k, (sIdx = slot.size));
    slotOf[i] = sIdx;
  }
  const acc = new Float32Array(slot.size * 3);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let f = 0; f < index.length; f += 3) {
    a.fromBufferAttribute(pos, index[f]);
    b.fromBufferAttribute(pos, index[f + 1]);
    c.fromBufferAttribute(pos, index[f + 2]);
    c.sub(b);
    b.sub(a);
    c.cross(b); // area-weighted face normal (winding: (c-b)×(b-a))
    for (let k = 0; k < 3; k++) {
      const sI = slotOf[index[f + k]] * 3;
      acc[sI] -= c.x;
      acc[sI + 1] -= c.y;
      acc[sI + 2] -= c.z;
    }
  }
  const out = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const sI = slotOf[i] * 3;
    const len = Math.hypot(acc[sI], acc[sI + 1], acc[sI + 2]) || 1;
    out[i * 3] = acc[sI] / len;
    out[i * 3 + 1] = acc[sI + 1] / len;
    out[i * 3 + 2] = acc[sI + 2] / len;
  }
  return out;
}

function indexed(geometry: THREE.BufferGeometry) {
  const g = geometry.clone();
  const n = g.attributes.position.count;
  g.setIndex(Array.from({ length: n }, (_, i) => i));
  return g;
}

type Stencil = { idx: Uint32Array; w: Float32Array; start: Uint32Array };

/** Build per-vertex weighted sums (CSR layout) from (index, weight) lists. */
function packStencil(lists: [number, number][][]): Stencil {
  const start = new Uint32Array(lists.length + 1);
  let total = 0;
  lists.forEach((l, i) => {
    start[i] = total;
    total += l.length;
  });
  start[lists.length] = total;
  const idx = new Uint32Array(total);
  const w = new Float32Array(total);
  let k = 0;
  for (const l of lists)
    for (const [i, wt] of l) {
      idx[k] = i;
      w[k++] = wt;
    }
  return { idx, w, start };
}

function applyStencil(src: ArrayLike<number>, itemSize: number, st: Stencil) {
  const n = st.start.length - 1;
  const out = new Float32Array(n * itemSize);
  for (let v = 0; v < n; v++) {
    for (let k = st.start[v]; k < st.start[v + 1]; k++) {
      const s = st.idx[k] * itemSize;
      const wt = st.w[k];
      for (let c = 0; c < itemSize; c++) out[v * itemSize + c] += src[s + c] * wt;
    }
  }
  return out;
}

function subdivideOnce(
  geo: THREE.BufferGeometry,
  mode: "loop" | "phong",
  alpha = 0.6,
  normals?: Float32Array
): THREE.BufferGeometry {
  const index = geo.index!.array;
  const nV = geo.attributes.position.count;
  const nF = index.length / 3;

  // ── Topology: unique edges, the vertices opposite them, neighbours
  const edgeOf = new Map<number, number>();
  const edgeA: number[] = [];
  const edgeB: number[] = [];
  const edgeOpp: number[][] = [];
  const faceEdge = new Uint32Array(nF * 3);
  for (let f = 0; f < nF; f++) {
    for (let k = 0; k < 3; k++) {
      const a = index[f * 3 + k];
      const b = index[f * 3 + ((k + 1) % 3)];
      const c = index[f * 3 + ((k + 2) % 3)];
      const key = a < b ? a * nV + b : b * nV + a;
      let e = edgeOf.get(key);
      if (e === undefined) {
        e = edgeA.length;
        edgeOf.set(key, e);
        edgeA.push(Math.min(a, b));
        edgeB.push(Math.max(a, b));
        edgeOpp.push([]);
      }
      edgeOpp[e].push(c);
      faceEdge[f * 3 + k] = e;
    }
  }
  const nE = edgeA.length;
  const neighbours: Set<number>[] = Array.from({ length: nV }, () => new Set());
  const boundary: number[][] = Array.from({ length: nV }, () => []);
  for (let e = 0; e < nE; e++) {
    const a = edgeA[e];
    const b = edgeB[e];
    neighbours[a].add(b);
    neighbours[b].add(a);
    if (edgeOpp[e].length === 1) {
      boundary[a].push(b);
      boundary[b].push(a);
    }
  }

  // ── Stencils: smooth (positions, morphs) and linear (uv, colour…)
  const smooth: [number, number][][] = [];
  const linear: [number, number][][] = [];
  for (let v = 0; v < nV; v++) {
    linear.push([[v, 1]]);
    if (boundary[v].length === 2) {
      smooth.push([[v, 0.75], [boundary[v][0], 0.125], [boundary[v][1], 0.125]]);
    } else if (boundary[v].length > 0) {
      smooth.push([[v, 1]]); // corner / non-manifold: pin it
    } else {
      const n = neighbours[v].size;
      if (n === 0) {
        smooth.push([[v, 1]]);
        continue;
      }
      const beta = n > 3 ? 3 / (8 * n) : 3 / 16;
      const l: [number, number][] = [[v, 1 - n * beta]];
      for (const u of neighbours[v]) l.push([u, beta]);
      smooth.push(l);
    }
  }
  for (let e = 0; e < nE; e++) {
    const a = edgeA[e];
    const b = edgeB[e];
    linear.push([[a, 0.5], [b, 0.5]]);
    if (edgeOpp[e].length === 2) {
      smooth.push([[a, 0.375], [b, 0.375], [edgeOpp[e][0], 0.125], [edgeOpp[e][1], 0.125]]);
    } else {
      smooth.push([[a, 0.5], [b, 0.5]]);
    }
  }
  const S = packStencil(smooth);
  const L = packStencil(linear);

  // ── New faces: each triangle → four
  const outIndex = new Uint32Array(nF * 12);
  for (let f = 0; f < nF; f++) {
    const a = index[f * 3];
    const b = index[f * 3 + 1];
    const c = index[f * 3 + 2];
    const ab = nV + faceEdge[f * 3];
    const bc = nV + faceEdge[f * 3 + 1];
    const ca = nV + faceEdge[f * 3 + 2];
    outIndex.set([a, ab, ca, b, bc, ab, c, ca, bc, ab, bc, ca], f * 12);
  }

  const out = new THREE.BufferGeometry();
  out.setIndex(new THREE.BufferAttribute(outIndex, 1));

  for (const [name, attr] of Object.entries(geo.attributes)) {
    if (name === "normal") continue; // recomputed below
    const a = attr as THREE.BufferAttribute;
    if (name === "skinIndex" || name === "skinWeight") continue; // handled together
    const data =
      name === "position" && mode === "phong"
        ? phongPositions(geo, edgeA, edgeB, alpha, normals ?? seamlessNormals(geo))
        : applyStencil(a.array, a.itemSize, name === "position" ? S : L);
    out.setAttribute(name, new THREE.BufferAttribute(data, a.itemSize, a.normalized));
  }

  // Skinning: originals keep theirs; edge points blend both ends
  const si = geo.attributes.skinIndex as THREE.BufferAttribute | undefined;
  const sw = geo.attributes.skinWeight as THREE.BufferAttribute | undefined;
  if (si && sw) {
    const total = nV + nE;
    const IndexArray = si.array.constructor as new (n: number) => THREE.TypedArray;
    const outI = new IndexArray(total * 4);
    const outW = new Float32Array(total * 4);
    for (let v = 0; v < nV; v++) {
      for (let c = 0; c < 4; c++) {
        outI[v * 4 + c] = si.array[v * 4 + c];
        outW[v * 4 + c] = sw.array[v * 4 + c];
      }
    }
    const acc = new Map<number, number>();
    for (let e = 0; e < nE; e++) {
      acc.clear();
      for (const v of [edgeA[e], edgeB[e]]) {
        for (let c = 0; c < 4; c++) {
          const w = sw.array[v * 4 + c] * 0.5;
          if (w > 0) {
            const bone = si.array[v * 4 + c];
            acc.set(bone, (acc.get(bone) ?? 0) + w);
          }
        }
      }
      const top = [...acc.entries()].sort((x, y) => y[1] - x[1]).slice(0, 4);
      const sum = top.reduce((s, [, w]) => s + w, 0) || 1;
      const o = (nV + e) * 4;
      top.forEach(([bone, w], c) => {
        outI[o + c] = bone;
        outW[o + c] = w / sum;
      });
    }
    out.setAttribute("skinIndex", new THREE.BufferAttribute(outI, 4, si.normalized));
    out.setAttribute("skinWeight", new THREE.BufferAttribute(outW, 4));
  }

  // Morph targets (relative deltas are linear, so the same rules apply)
  for (const name of ["position", "color"] as const) {
    const list = geo.morphAttributes[name];
    if (!list) continue;
    out.morphAttributes[name] = list.map((a) => {
      const attr = a as THREE.BufferAttribute;
      const m = new THREE.BufferAttribute(applyStencil(attr.array, attr.itemSize, mode === "loop" ? S : L), attr.itemSize);
      m.name = attr.name;
      return m;
    });
  }
  out.morphTargetsRelative = geo.morphTargetsRelative;

  for (const g of geo.groups) out.addGroup(g.start * 4, g.count * 4, g.materialIndex);
  out.computeVertexNormals();
  out.computeBoundingBox();
  out.computeBoundingSphere();
  return out;
}

/** Originals unchanged; each edge midpoint pulled toward both endpoints' tangent planes. */
function phongPositions(geo: THREE.BufferGeometry, edgeA: number[], edgeB: number[], alpha: number, n: Float32Array) {
  const p = geo.attributes.position.array;
  const nV = geo.attributes.position.count;
  const out = new Float32Array((nV + edgeA.length) * 3);
  out.set(p as ArrayLike<number>);
  const m = [0, 0, 0];
  for (let e = 0; e < edgeA.length; e++) {
    const a = edgeA[e] * 3;
    const b = edgeB[e] * 3;
    for (let c = 0; c < 3; c++) m[c] = (p[a + c] + p[b + c]) / 2;
    // Project the midpoint onto each endpoint's tangent plane
    let da = 0;
    let db = 0;
    for (let c = 0; c < 3; c++) {
      da += (m[c] - p[a + c]) * n[a + c];
      db += (m[c] - p[b + c]) * n[b + c];
    }
    const o = (nV + e) * 3;
    for (let c = 0; c < 3; c++) {
      const proj = (m[c] - da * n[a + c] + m[c] - db * n[b + c]) / 2;
      out[o + c] = (1 - alpha) * m[c] + alpha * proj;
    }
  }
  return out;
}
