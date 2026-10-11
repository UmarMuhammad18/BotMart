"use client";

import { useFrame } from "@react-three/fiber";
import { Billboard, Text, useAnimations, useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ROLE_BY_ID } from "@/lib/agents/roles";
import type { WorldAgent, WorldStall } from "@/lib/types";
import type { WorldDirector } from "@/lib/world/director";
import { wanderTarget } from "@/components/world/busyMotion";

/** "RobotExpressive" by Tomás Laulhé, CC0 (see public/models/CREDITS.md). */
const MODEL = "/models/robot.glb";
useGLTF.preload(MODEL);

/**
 * The source model is flat-shaded (unwelded triangles). Weld each mesh's
 * vertices once and recompute normals so the robots read smooth, not faceted.
 * Clones share geometry, so this runs on the shared GLTF scene.
 */
const smoothed = new WeakSet<THREE.Object3D>();
function smoothModel(scene: THREE.Object3D) {
  if (smoothed.has(scene)) return;
  smoothed.add(scene);
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const welded = mergeVertices(mesh.geometry.clone().deleteAttribute("normal"), 1e-4);
    welded.computeVertexNormals();
    mesh.geometry = welded;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    if (mat.flatShading) {
      mat.flatShading = false;
      mat.needsUpdate = true;
    }
  });
}

/** Rendered height of an agent in world units. */
const HEIGHT = 1.55;

type Base = "Idle" | "Walking" | "Running";
type Emote = "ThumbsUp" | "No" | "Wave";

const _goal = new THREE.Vector3();
const _dir = new THREE.Vector3();

type Actions = Record<string, THREE.AnimationAction | null>;

type RobotState = {
  pos: THREE.Vector3;
  heading: number;
  base: Base;
  emote: { name: Emote; until: number } | null;
  lastBubble: string | null;
};

/** Cross-fade to an animation clip (once = play through and hold). */
function playAction(actions: Actions, name: string, fade = 0.25, once = false) {
  const next = actions[name];
  if (!next) return;
  for (const a of Object.values(actions)) if (a && a !== next && a.isRunning()) a.fadeOut(fade);
  next.reset();
  next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
  next.clampWhenFinished = once;
  next.fadeIn(fade).play();
}

function startIdle(actions: Actions, seed: number) {
  const idle = actions.Idle;
  if (!idle) return;
  idle.reset().play();
  idle.time = (seed % 10) / 4; // agents don't all breathe in sync
}

/** One frame of movement, facing and animation for an agent. */
function stepRobot(
  g: THREE.Group,
  st: RobotState,
  actions: Actions,
  agent: WorldAgent,
  roam: WorldAgent,
  stalls: WorldStall[],
  director: WorldDirector,
  t: number,
  dt: number
) {
  const placement = director.placementFor(agent.id);

  if (placement) _goal.set(placement.x, 0, placement.z);
  else if (roam.activity === "idle" || roam.activity === "blocked") _goal.set(agent.x, 0, agent.z);
  else {
    const w = wanderTarget(roam, t, stalls);
    _goal.set(w.x, 0, w.z);
  }

  _dir.copy(_goal).sub(st.pos);
  const dist = _dir.length();
  const speed = THREE.MathUtils.clamp(dist * 1.1, 1.5, 4.6) * Math.max(1, director.speed);
  const step = Math.min(dist, speed * dt);
  const moving = dist > 0.05;
  if (moving) st.pos.addScaledVector(_dir, step / dist);
  director.livePos.set(agent.id, { x: st.pos.x, z: st.pos.z });
  g.position.set(st.pos.x, 0, st.pos.z);

  // Facing: travel direction, else the deal partner / stall, else the desk
  let face: number | null = null;
  if (moving && dist > 0.15) face = Math.atan2(_dir.x, _dir.z);
  else if (placement) face = Math.atan2(placement.faceX - st.pos.x, placement.faceZ - st.pos.z);
  else if (agent.building) face = agent.building.rot + Math.PI; // back to the square, eyes on the screen
  if (face != null) {
    const d = Math.atan2(Math.sin(face - st.heading), Math.cos(face - st.heading));
    st.heading += d * Math.min(1, dt * 8);
  }
  g.rotation.y = st.heading;

  // Emotes from the negotiation: thumbs up on a deal, a no when walking away
  const bubble = director.bubbleFor(agent.id);
  if (bubble && bubble.key !== st.lastBubble) {
    st.lastBubble = bubble.key;
    const e: Emote | null =
      bubble.tone === "accept" ? "ThumbsUp" : bubble.tone === "reject" ? "No" : bubble.tone === "info" ? "Wave" : null;
    const action = e ? actions[e] : null;
    if (e && action) {
      st.emote = { name: e, until: t + action.getClip().duration / Math.max(1, director.speed) };
      action.timeScale = Math.max(1, director.speed);
      playAction(actions, e, 0.2, true);
    }
  }
  if (st.emote && t < st.emote.until && !moving) return;
  if (st.emote && (t >= st.emote.until || moving)) {
    st.emote = null;
    st.base = "Idle";
    playAction(actions, moving ? "Walking" : "Idle", 0.3);
  }

  // Locomotion: walk / run matched to actual speed
  const actual = moving && dt > 0 ? step / dt : 0;
  const want: Base = actual > 3.6 ? "Running" : actual > 0.3 ? "Walking" : "Idle";
  if (want !== st.base) {
    st.base = want;
    playAction(actions, want, 0.3);
  }
  const loco = actions[st.base];
  if (loco && st.base !== "Idle") {
    loco.timeScale = THREE.MathUtils.clamp(actual / (st.base === "Running" ? 4.2 : 1.7), 0.6, 2.2);
  }
}

export function RobotAgent({
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
  const { scene, animations } = useGLTF(MODEL);
  const root = useRef<THREE.Group>(null);
  const state = useRef<RobotState>({
    pos: new THREE.Vector3(agent.x, 0, agent.z),
    heading: 0,
    base: "Idle",
    emote: null,
    lastBubble: null,
  });
  const color = ROLE_BY_ID[agent.role]?.hex || "#94a3b8";

  // Own skinned copy per agent, tinted by role, scaled to HEIGHT
  const { model, scale } = useMemo(() => {
    smoothModel(scene);
    const copy = cloneSkinned(scene) as THREE.Group;
    const tint = new THREE.Color(color);
    copy.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
      if (mat.name === "Main") {
        mat.color = tint.clone().lerp(new THREE.Color("#ffffff"), 0.12);
        mat.roughness = 0.42;
        mat.metalness = 0.15;
      }
      mesh.material = mat;
    });
    const box = new THREE.Box3().setFromObject(scene);
    return { model: copy, scale: HEIGHT / Math.max(0.001, box.max.y - box.min.y) };
  }, [scene, color]);

  const { actions } = useAnimations(animations, root);

  useEffect(() => startIdle(actions, agent.id.charCodeAt(0)), [actions, agent.id]);

  const roam = useMemo(
    () => (agent.activity === "negotiating" ? { ...agent, activity: "idle" as const } : agent),
    [agent]
  );

  useFrame(({ clock }, dt) => {
    if (!root.current) return;
    stepRobot(root.current, state.current, actions, agent, roam, stalls, director, clock.getElapsedTime(), Math.min(dt, 0.1));
  });

  const short = agent.name.length > 14 ? agent.name.slice(0, 13) + "…" : agent.name;

  return (
    <group
      ref={root}
      position={[agent.x, 0, agent.z]}
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
      <primitive object={model} scale={scale} />
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
          <ringGeometry args={[0.55, 0.64, 48]} />
          <meshBasicMaterial color="#d1fae2" transparent opacity={0.85} toneMapped={false} />
        </mesh>
      )}
      <Billboard position={[0, HEIGHT + 0.35, 0]}>
        <Text fontSize={0.2} color="#fffdf6" anchorX="center" anchorY="bottom" outlineWidth={0.018} outlineColor="#132018">
          {short}
        </Text>
        <mesh position={[0, -0.07, 0]}>
          <circleGeometry args={[0.05, 16]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      </Billboard>
    </group>
  );
}
