"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { WorldSnapshot } from "@/lib/types";
import type { CameraMode } from "@/components/world/WorldCanvas";
import type { WorldDirector } from "@/lib/world/director";
import { COURT_POS, VILLAGE } from "@/lib/world/districts";

/** Where the camera looks by default, and how much of the village to fit. */
export const VILLAGE_VIEW = {
  target: new THREE.Vector3(VILLAGE.cx, 0, VILLAGE.cz + 1),
  radius: VILLAGE.ringRadius + 5,
  elevation: THREE.MathUtils.degToRad(36),
  azimuth: THREE.MathUtils.degToRad(38),
};

/** Distance that fits a sphere of `radius` in a perspective view. */
function fitDistance(cam: THREE.PerspectiveCamera, radius: number) {
  const vFov = THREE.MathUtils.degToRad(cam.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * cam.aspect);
  return radius / Math.sin(Math.min(vFov, hFov) / 2);
}

export function overviewPosition(cam: THREE.PerspectiveCamera) {
  const { target, radius, elevation, azimuth } = VILLAGE_VIEW;
  const d = fitDistance(cam, radius) * 0.78;
  return new THREE.Vector3(
    target.x + d * Math.cos(elevation) * Math.sin(azimuth),
    target.y + d * Math.sin(elevation),
    target.z + d * Math.cos(elevation) * Math.cos(azimuth)
  );
}

/** Frames the whole village once the real camera exists (and on resize). */
export function FrameCamera() {
  const { camera, size } = useThree();
  const framed = useRef(false);

  useEffect(() => {
    framed.current = false;
  }, [camera, size.width, size.height]);

  useEffect(() => {
    if (framed.current || !(camera as THREE.PerspectiveCamera).isPerspectiveCamera) return;
    const cam = camera as THREE.PerspectiveCamera;
    cam.position.copy(overviewPosition(cam));
    cam.lookAt(VILLAGE_VIEW.target);
    cam.updateProjectionMatrix();
    framed.current = true;
  }, [camera, size.height, size.width]);

  return null;
}

const _pos = new THREE.Vector3();
const _look = new THREE.Vector3();

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
    controls.enabled = false;
    if (mode === "court") {
      // Stand in the square, square-on to the portico, looking between the
      // middle columns at the judge, the jury and the two parties
      const ang = Math.atan2(VILLAGE.cz - COURT_POS.z, VILLAGE.cx - COURT_POS.x);
      _pos.set(COURT_POS.x + Math.cos(ang) * 13.5 + 1.2, 5.2, COURT_POS.z + Math.sin(ang) * 13.5);
      _look.set(COURT_POS.x, 1.9, COURT_POS.z);
    } else if (mode === "follow" && followAgentId) {
      // Track where the robot actually is, not its home slot
      const a =
        director.livePos.get(followAgentId) ??
        snapshot.agents.find((x) => x.id === followAgentId);
      if (!a) return;
      // High enough to clear cottage roofs (~4.8) while staying close
      _pos.set(a.x + 6, 8.5, a.z + 8);
      _look.set(a.x, 1.1, a.z);
    } else return;
    camera.position.lerp(_pos, 0.06);
    controls.target.lerp(_look, 0.08);
    controls.update();
  });

  return null;
}
