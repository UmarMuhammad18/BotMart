import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { loopSubdivide, phongSubdivide } from "../subdivide";

function closedBox() {
  return mergeVertices(new THREE.BoxGeometry(1, 1, 1).deleteAttribute("normal").deleteAttribute("uv"));
}

describe("loopSubdivide", () => {
  it("quadruples the triangle count per pass", () => {
    const g = closedBox();
    const tris = g.index!.count / 3;
    expect(loopSubdivide(g, 1).index!.count / 3).toBe(tris * 4);
    expect(loopSubdivide(g, 2).index!.count / 3).toBe(tris * 16);
  });

  it("smooths a closed surface inward and stays watertight", () => {
    const g = loopSubdivide(closedBox(), 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      // Loop pulls the box corners in: every point within the original box
      expect(Math.abs(p.getX(i))).toBeLessThanOrEqual(0.5 + 1e-6);
      expect(Math.abs(p.getY(i))).toBeLessThanOrEqual(0.5 + 1e-6);
    }
    // Closed mesh: every edge still has exactly two faces
    const idx = g.index!.array;
    const count = new Map<string, number>();
    for (let f = 0; f < idx.length; f += 3) {
      for (let k = 0; k < 3; k++) {
        const a = idx[f + k];
        const b = idx[f + ((k + 1) % 3)];
        const key = a < b ? `${a}-${b}` : `${b}-${a}`;
        count.set(key, (count.get(key) ?? 0) + 1);
      }
    }
    for (const c of count.values()) expect(c).toBe(2);
  });

  it("carries skin weights (normalised, at most four bones) and morph targets", () => {
    const g = closedBox();
    const n = g.attributes.position.count;
    const si = new Uint16Array(n * 4);
    const sw = new Float32Array(n * 4);
    for (let v = 0; v < n; v++) {
      // half the box on bone 0, half on bone 1
      si[v * 4] = g.attributes.position.getY(v) > 0 ? 1 : 0;
      sw[v * 4] = 1;
    }
    g.setAttribute("skinIndex", new THREE.BufferAttribute(si, 4));
    g.setAttribute("skinWeight", new THREE.BufferAttribute(sw, 4));
    g.morphAttributes.position = [new THREE.BufferAttribute(new Float32Array(n * 3).fill(0.1), 3)];
    g.morphTargetsRelative = true;

    const out = loopSubdivide(g, 1);
    const w = out.attributes.skinWeight;
    for (let v = 0; v < w.count; v++) {
      const sum = w.getX(v) + w.getY(v) + w.getZ(v) + w.getW(v);
      expect(sum).toBeCloseTo(1, 5);
    }
    expect(out.morphAttributes.position![0].count).toBe(out.attributes.position.count);
    // A uniform morph offset stays uniform after subdivision
    expect(out.morphAttributes.position![0].getX(5)).toBeCloseTo(0.1, 5);
  });

  it("keeps open edges in place (no shrinking boundaries)", () => {
    const plane = mergeVertices(new THREE.PlaneGeometry(2, 2, 2, 2).deleteAttribute("normal").deleteAttribute("uv"));
    const out = loopSubdivide(plane, 1);
    const p = out.attributes.position;
    let maxX = 0;
    for (let i = 0; i < p.count; i++) maxX = Math.max(maxX, Math.abs(p.getX(i)));
    expect(maxX).toBeCloseTo(1, 5);
  });

  it("phong keeps original vertices and bulges new ones outward on a sphere", () => {
    const sphere = mergeVertices(new THREE.IcosahedronGeometry(1, 1).deleteAttribute("normal").deleteAttribute("uv"));
    const out = phongSubdivide(sphere, 2);
    const p = out.attributes.position;
    let minR = Infinity;
    for (let i = 0; i < p.count; i++) minR = Math.min(minR, Math.hypot(p.getX(i), p.getY(i), p.getZ(i)));
    // Flat midpoints of an icosphere sit well inside radius 1; Phong lifts them close to it
    expect(minR).toBeGreaterThan(0.95);
    expect(out.index!.count).toBe(sphere.index!.count * 16);
    for (let i = 0; i < sphere.attributes.position.count; i++) {
      expect(p.getX(i)).toBeCloseTo(sphere.attributes.position.getX(i), 6);
    }
  });
});
