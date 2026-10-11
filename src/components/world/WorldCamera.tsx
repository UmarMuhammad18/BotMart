"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { WorldSnapshot } from "@/lib/types";
import type { CameraMode } from "@/components/world/WorldCanvas";
import type { WorldDirector } from "@/lib/world/director";

export function contentCenter(snapshot: WorldSnapshot) {
  const pts = [
    ...snapshot.stalls.map((s) => [s.x, s.z] as const),
    ...snapshot.agents.map((a) => [a.x, a.z] as const),
  ];
  if (pts.length === 0) return { x: 0, z: 0, radius: 10 };
  let minX = Infinity,
    maxX = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity;
  for (const [x, z] of pts) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }
  // Slightly pad but keep radius modest so default zoom is close
  const span = Math.max(maxX - minX, maxZ - minZ, 6);
  return {
    x: (minX + maxX) / 2,
    z: (minZ + maxZ) / 2,
    radius: span * 0.5 + 3,
  };
}

/** Frames the market so agents fill the view (not zoomed way out). */
export function FrameCamera({ snapshot }: { snapshot: WorldSnapshot }) {
  const { camera, size } = useThree();
  const framed = useRef(false);

  useEffect(() => {
    framed.current = false;
  }, [snapshot.agents.length, snapshot.stalls.length, size.width, size.height]);

  useEffect(() => {
    if (framed.current) return;
    const c = contentCenter(snapshot);
    const cam = camera as THREE.OrthographicCamera;
    const dist = 14;
    cam.position.set(c.x + dist, dist * 0.8, c.z + dist);
    cam.lookAt(c.x, 0.3, c.z);
    cam.near = -100;
    cam.far = 250;
    // Higher zoom = closer. Tuned for typical 5–15 agents/stalls.
    const fit = Math.max(c.radius, 6);
    const base = Math.min(size.width, size.height);
    cam.zoom = THREE.MathUtils.clamp(base / (fit * 2.1), 28, 70);
    cam.updateProjectionMatrix();
    framed.current = true;
  }, [camera, snapshot, size.height, size.width]);

  return null;
}

export function CameraDirector({
  mode,
  followAgentId,
  snapshot,
  director,
}: {
  mode: CameraMode;
  followAgentId: string | null;
  snapshot: WorldSnapshot;
  director: WorldDirector;
}) {
  useFrame((state) => {
    const { camera } = state;
    const controls = state.controls as unknown as
      | { target: THREE.Vector3; update: () => void; enabled: boolean }
      | null;
    if (!controls) return;
    if (mode === "overview") {
      controls.enabled = true;
      return;
    }
    if (mode === "court") {
      controls.enabled = false;
      camera.position.lerp(new THREE.Vector3(12, 14, 28), 0.07);
      controls.target.lerp(new THREE.Vector3(0, 0.4, 16), 0.07);
      controls.update();
      return;
    }
    if (mode === "follow" && followAgentId) {
      // Track where the robot actually is, not its home slot
      const a =
        director.livePos.get(followAgentId) ??
        snapshot.agents.find((x) => x.id === followAgentId);
      if (!a) return;
      controls.enabled = false;
      camera.position.lerp(new THREE.Vector3(a.x + 8, 10, a.z + 8), 0.1);
      controls.target.lerp(new THREE.Vector3(a.x, 0.5, a.z), 0.1);
      controls.update();
    }
  });

  return null;
}
