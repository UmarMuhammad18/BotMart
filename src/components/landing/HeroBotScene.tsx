"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, RoundedBox, Sparkles, Text, useAnimations, useGLTF } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { smoothModel } from "@/components/world/village/RobotAgent";
import { fbm, seeded } from "@/lib/world/terrain";
import { useResolvedTheme } from "@/lib/theme";

/** "RobotExpressive" by Tomás Laulhé, CC0 (see public/models/CREDITS.md). */
const MODEL = "/models/robot.glb";

export type BotCueKind = "wave" | "thumbs" | "no" | "dance" | "yes" | "jump";
export type BotCue = { id: number; kind: BotCueKind };

const CLIP: Record<BotCueKind, string> = {
  wave: "Wave",
  thumbs: "ThumbsUp",
  no: "No",
  dance: "Dance",
  yes: "Yes",
  jump: "Jump",
};

type Actions = Record<string, THREE.AnimationAction | null>;

/** Where the pointer is, in page coordinates, shared by the frame loop. */
type PointerState = { x: number; y: number; lastMove: number; speed: number; active: boolean };

/* ── The bot ───────────────────────────────────────────────────────────── */

const HEIGHT = 2.25;
const _q1 = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _q3 = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();

function playOnce(actions: Actions, name: string) {
  const clip = actions[name];
  const idle = actions.Idle;
  if (!clip) return 0;
  for (const a of Object.values(actions)) if (a && a !== clip && a.isRunning()) a.fadeOut(0.2);
  clip.reset().setLoop(THREE.LoopOnce, 1);
  clip.clampWhenFinished = true;
  clip.fadeIn(0.2).play();
  const dur = clip.getClip().duration;
  // Ease back into the idle loop as the gesture ends
  window.setTimeout(() => {
    clip.fadeOut(0.35);
    idle?.reset().fadeIn(0.35).play();
  }, Math.max(0, dur * 1000 - 350));
  return dur;
}

/**
 * Per-bone memory so the look-at never compounds: clips like Idle don't drive
 * the head, so without this each frame's offset would stack on the last.
 */
const aimMemory = new WeakMap<THREE.Object3D, { before: THREE.Quaternion; after: THREE.Quaternion }>();

/** Turn a bone in world space by (pitch, yaw), on top of its animated pose. */
function aimBone(bone: THREE.Object3D, pitch: number, yaw: number) {
  if (!bone.parent) return;
  const mem = aimMemory.get(bone);
  // Untouched by the mixer since our last frame: start from the clean pose
  if (mem && bone.quaternion.equals(mem.after)) bone.quaternion.copy(mem.before);
  const before = bone.quaternion.clone();

  bone.parent.updateWorldMatrix(true, false);
  bone.updateWorldMatrix(false, false);
  bone.getWorldQuaternion(_q2);
  _q3.setFromEuler(_e.set(pitch, yaw, 0, "YXZ"));
  _q2.premultiply(_q3);
  bone.parent.getWorldQuaternion(_q1).invert();
  bone.quaternion.copy(_q1.multiply(_q2));

  aimMemory.set(bone, { before, after: bone.quaternion.clone() });
}

type Rig = { head: THREE.Object3D | null; neck: THREE.Object3D | null; face: THREE.Mesh | null };

type Look = {
  yaw: number;
  pitch: number;
  body: number;
  surprise: number;
  sad: number;
  nextWave: number;
  busyUntil: number;
};

function startIdle(actions: Actions, still: boolean) {
  const idle = actions.Idle;
  if (!idle) return;
  idle.reset().play();
  if (still) idle.timeScale = 0;
}

function applyCue(actions: Actions, st: Look, kind: BotCueKind) {
  st.busyUntil = performance.now() + playOnce(actions, CLIP[kind]) * 1000;
  if (kind === "no") st.sad = 1;
  if (kind === "thumbs" || kind === "dance") st.sad = 0;
}

/** One frame: aim head and neck at the pointer, wave hello, set the face. */
function stepBot(
  st: Look,
  p: PointerState,
  actions: Actions,
  rig: Rig,
  body: THREE.Group,
  canvas: HTMLCanvasElement,
  camera: THREE.Camera,
  t: number,
  dt: number
) {
  const now = performance.now();

  // Pointer relative to the bot's head on screen
  const rect = canvas.getBoundingClientRect();
  _v.set(0, HEIGHT * 0.9, 0).project(camera);
  const hx = rect.left + ((_v.x + 1) / 2) * rect.width;
  const hy = rect.top + ((1 - _v.y) / 2) * rect.height;
  const dx = (p.x - hx) / (rect.width * 0.55);
  const dy = (p.y - hy) / (rect.height * 0.6);
  const idle = !p.active || now - p.lastMove > 4000;

  // Capped so it always reads as looking at you, never side-on
  let yawT = THREE.MathUtils.clamp(dx, -1, 1) * 0.62;
  let pitchT = THREE.MathUtils.clamp(dy, -0.8, 1) * 0.26;
  if (idle) {
    // Nobody around: look about the meadow
    yawT = Math.sin(t * 0.45) * 0.55 + Math.sin(t * 1.3) * 0.08;
    pitchT = Math.sin(t * 0.3) * 0.08 + 0.05;
  }
  const k = 1 - Math.exp(-dt * 7);
  st.yaw += (yawT - st.yaw) * k;
  st.pitch += (pitchT - st.pitch) * k;
  // Big turns bring the shoulders along
  const bodyT = THREE.MathUtils.clamp(st.yaw * 0.45, -0.32, 0.32);
  st.body += (bodyT - st.body) * (1 - Math.exp(-dt * 3));
  body.rotation.y = st.body;

  const rest = st.yaw - st.body;
  if (rig.neck) aimBone(rig.neck, st.pitch * 0.35, rest * 0.35);
  if (rig.head) aimBone(rig.head, st.pitch * 0.65, rest * 0.65);

  // Close by: a wave hello (with a cooldown)
  const near = Math.hypot(dx * 0.55 * rect.width, dy * 0.6 * rect.height) < Math.min(rect.width, rect.height) * 0.28;
  if (near && !idle && now > st.nextWave && now > st.busyUntil) {
    st.nextWave = now + 9000;
    st.busyUntil = now + playOnce(actions, "Wave") * 1000;
  }

  // Expressions: surprised by a flick of the mouse, sad after a walk-away
  if (p.speed > 2.6 && !idle) st.surprise = 1;
  st.surprise = Math.max(0, st.surprise - dt * 1.4);
  st.sad = Math.max(0, st.sad - dt * 0.35);
  const face = rig.face;
  if (face?.morphTargetDictionary && face.morphTargetInfluences) {
    const d = face.morphTargetDictionary;
    const inf = face.morphTargetInfluences;
    inf[d.Surprised] = THREE.MathUtils.lerp(inf[d.Surprised], st.surprise, 0.3);
    inf[d.Sad] = THREE.MathUtils.lerp(inf[d.Sad], st.sad, 0.2);
  }
}

function Bot({
  pointer,
  cue,
  onPoke,
  still,
}: {
  pointer: React.RefObject<PointerState>;
  cue: BotCue | null;
  onPoke: () => void;
  still: boolean;
}) {
  const { scene, animations } = useGLTF(MODEL);
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const { gl, camera } = useThree();

  const { model, scale, rig } = useMemo(() => {
    smoothModel(scene);
    const copy = cloneSkinned(scene) as THREE.Group;
    const rig: Rig = { head: null, neck: null, face: null };
    copy.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if ((o as THREE.Bone).isBone && o.name === "Head") rig.head = o;
      if ((o as THREE.Bone).isBone && o.name === "Neck") rig.neck = o;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
      if (mat.name === "Main") {
        mat.color = new THREE.Color("#4fa35a");
        mat.roughness = 0.38;
        mat.metalness = 0.12;
      }
      mesh.material = mat;
      if (mesh.morphTargetDictionary && "Surprised" in mesh.morphTargetDictionary) rig.face = mesh;
    });
    const box = new THREE.Box3().setFromObject(scene);
    return { model: copy, scale: HEIGHT / Math.max(0.001, box.max.y - box.min.y), rig };
  }, [scene]);

  // Mixer first, so the look-at below runs on top of the animated pose
  const { actions } = useAnimations(animations, root);
  const look = useRef<Look>({ yaw: 0, pitch: 0, body: 0, surprise: 0, sad: 0, nextWave: 0, busyUntil: 0 });

  useEffect(() => startIdle(actions, still), [actions, still]);

  // Gestures cued by the page (demo narration)
  useEffect(() => {
    if (cue && !still) applyCue(actions, look.current, cue.kind);
  }, [cue, actions, still]);

  useFrame(({ clock }, dt) => {
    if (!root.current || !body.current || still) return;
    stepBot(look.current, pointer.current, actions, rig, body.current, gl.domElement, camera, clock.getElapsedTime(), dt);
  });

  return (
    <group
      ref={root}
      onClick={(e) => {
        e.stopPropagation();
        if (still) return onPoke();
        look.current.surprise = 1;
        const kind = Math.random() < 0.5 ? "Jump" : "ThumbsUp";
        look.current.busyUntil = performance.now() + playOnce(actions, kind) * 1000;
        onPoke();
      }}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      <group ref={body}>
        <primitive object={model} scale={scale} />
      </group>
    </group>
  );
}

/* ── The island ────────────────────────────────────────────────────────── */

const windUniform = { value: 0 };

function Island({ night }: { night: boolean }) {
  const tufts = useRef<THREE.InstancedMesh>(null);
  const { top, underside, blade, bladeMat } = useMemo(() => {
    // Grass top: a soft dome with colour variation
    const top = new THREE.CylinderGeometry(2.35, 2.2, 0.32, 160, 8);
    const pos = top.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      if (pos.getY(i) > 0.15) pos.setY(i, 0.16 + (1 - Math.hypot(x, z) / 2.35) * 0.08);
      c.set("#5a9a3f").lerp(new THREE.Color("#7cb655"), fbm(x * 1.4 + 3, z * 1.4));
      colors.set([c.r, c.g, c.b], i * 3);
    }
    top.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    top.computeVertexNormals();

    // Earthy underside: a lumpy inverted cone
    const profile: THREE.Vector2[] = [];
    for (let i = 0; i <= 14; i++) {
      const tt = i / 14;
      const r = 2.2 * Math.pow(1 - tt, 0.75) + 0.05;
      profile.push(new THREE.Vector2(r, -tt * 1.9));
    }
    const underside = new THREE.LatheGeometry(profile, 160);
    const up = underside.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < up.count; i++) {
      v.fromBufferAttribute(up, i);
      const n = 1 + (fbm(v.x * 1.6 + 7, v.z * 1.6 + v.y) - 0.5) * 0.28;
      up.setXYZ(i, v.x * n, v.y, v.z * n);
    }
    underside.computeVertexNormals();

    // Grass blade + wind
    const blade = new THREE.PlaneGeometry(0.05, 0.36, 1, 4).translate(0, 0.18, 0);
    const bp = blade.attributes.position as THREE.BufferAttribute;
    const bc = new Float32Array(bp.count * 3);
    for (let i = 0; i < bp.count; i++) {
      const h = bp.getY(i) / 0.36;
      bp.setX(i, bp.getX(i) * (1 - h * 0.85));
      c.set("#3f7a2c").lerp(new THREE.Color("#9ccd63"), h);
      bc.set([c.r, c.g, c.b], i * 3);
    }
    blade.setAttribute("color", new THREE.BufferAttribute(bc, 3));
    const bladeMat = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.85 });
    bladeMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = windUniform;
      shader.vertexShader = "uniform float uTime;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader
        .replace("#include <beginnormal_vertex>", "vec3 objectNormal = vec3(0.0, 1.0, 0.0);")
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
           vec4 root = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
           float g = sin(uTime * 1.8 + root.x * 1.7 + root.z * 1.3);
           transformed.x += g * 0.05 * position.y * position.y * 6.0;`
        );
    };
    return { top, underside, blade, bladeMat };
  }, []);

  useLayoutEffect(() => {
    const mesh = tufts.current;
    if (!mesh) return;
    const rand = seeded(77);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    let n = 0;
    while (n < 900) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * 2.2;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (Math.hypot(x, z) < 0.55) continue; // keep the bot's feet clear
      if (x < -0.6 && x > -1.9 && z < -0.2 && z > -1.4) continue; // desk
      q.setFromEuler(e.set(0, rand() * Math.PI, (rand() - 0.5) * 0.3));
      const y = 0.16 + (1 - r / 2.35) * 0.08;
      // Short meadow grass: ankle height on the bot
      mesh.setMatrixAt(n++, m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 0.45 + rand() * 0.45, 1)));
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame((_, dt) => {
    windUniform.value += Math.min(dt, 0.1);
  });

  const flowers: [number, number, string][] = [
    [1.4, 0.9, "#fff8e7"],
    [1.7, -0.3, "#ffe38a"],
    [-1.2, 1.3, "#f7b7d2"],
    [0.9, 1.6, "#ffffff"],
    [-1.8, 0.4, "#ffe38a"],
    [0.2, -1.9, "#c9b6ff"],
  ];

  return (
    <group>
      <mesh geometry={top} receiveShadow castShadow>
        <meshStandardMaterial vertexColors roughness={0.9} />
      </mesh>
      <mesh geometry={underside} position={[0, 0, 0]} castShadow>
        <meshStandardMaterial color="#7a5a3c" roughness={0.95} />
      </mesh>
      <instancedMesh ref={tufts} args={[blade, bladeMat, 900]} receiveShadow />
      {flowers.map(([x, z, c], i) => (
        <group key={i} position={[x, 0.22, z]}>
          <mesh position={[0, 0.16, 0]}>
            <cylinderGeometry args={[0.012, 0.015, 0.32, 16]} />
            <meshStandardMaterial color="#4f7f30" />
          </mesh>
          <mesh position={[0, 0.34, 0]}>
            <sphereGeometry args={[0.07, 48, 32]} />
            <meshStandardMaterial color={c} roughness={0.6} />
          </mesh>
        </group>
      ))}
      {/* The bot's desktop station, as in the village */}
      <group position={[-1.25, 0.2, -0.85]} rotation={[0, 0.55, 0]}>
        <RoundedBox args={[1.15, 0.06, 0.55]} radius={0.02} smoothness={4} position={[0, 0.62, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#a57b52" roughness={0.6} />
        </RoundedBox>
        {[-0.5, 0.5].map((x) => (
          <mesh key={x} position={[x, 0.31, 0]} castShadow>
            <boxGeometry args={[0.06, 0.62, 0.48]} />
            <meshStandardMaterial color="#7b5a3c" roughness={0.7} />
          </mesh>
        ))}
        <RoundedBox args={[0.78, 0.48, 0.04]} radius={0.02} smoothness={4} position={[0, 1.0, -0.08]} castShadow>
          <meshStandardMaterial color="#14191d" roughness={0.35} metalness={0.4} />
        </RoundedBox>
        <mesh position={[0, 1.0, -0.055]}>
          <planeGeometry args={[0.7, 0.4]} />
          <meshStandardMaterial color="#0f2416" emissive="#3a8f3b" emissiveIntensity={night ? 1.4 : 0.55} />
        </mesh>
        <Text position={[0, 1.0, -0.05]} fontSize={0.07} anchorX="center" anchorY="middle" color="#eafff1">
          {"DEAL £45 ✓"}
        </Text>
        <mesh position={[0, 0.74, -0.08]}>
          <boxGeometry args={[0.04, 0.22, 0.04]} />
          <meshStandardMaterial color="#14191d" />
        </mesh>
      </group>
    </group>
  );
}

/* ── Scene ─────────────────────────────────────────────────────────────── */

export default function HeroBotScene({
  cue,
  onPoke,
  still,
}: {
  cue: BotCue | null;
  onPoke: () => void;
  still: boolean;
}) {
  const pointer = useRef<PointerState>({ x: 0, y: 0, lastMove: 0, speed: 0, active: false });
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const night = useResolvedTheme() === "dark";

  // Track the pointer across the whole page, not just the canvas
  useEffect(() => {
    let last = { x: 0, y: 0, t: performance.now() };
    const onMove = (e: PointerEvent) => {
      const now = performance.now();
      const dist = Math.hypot(e.clientX - last.x, e.clientY - last.y);
      const p = pointer.current;
      p.speed = dist / Math.max(1, now - last.t);
      p.x = e.clientX;
      p.y = e.clientY;
      p.lastMove = now;
      p.active = true;
      last = { x: e.clientX, y: e.clientY, t: now };
    };
    const onLeave = () => {
      pointer.current.active = false;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  // Stop rendering when the hero is scrolled away
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrap} className="absolute inset-0">
      <Canvas
        shadows
        dpr={[1, 1.6]}
        frameloop={visible ? "always" : "never"}
        camera={{ fov: 33, position: [0.4, 2.8, 9.4], near: 0.1, far: 60 }}
        gl={{ alpha: true, antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
        onCreated={({ camera }) => camera.lookAt(0, 1.0, 0)}
      >
        {/* Day: warm sun and soft sky. Night: moonlight, a glowing desk, fireflies */}
        <hemisphereLight args={night ? ["#6d86c4", "#142418", 0.55] : ["#eaf6ff", "#5f8f3e", 0.9]} />
        <directionalLight
          position={night ? [-4, 7.5, 4.5] : [4.5, 8, 5]}
          intensity={night ? 1.25 : 2.3}
          color={night ? "#b7c9ff" : "#fff1d6"}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-4}
          shadow-camera-right={4}
          shadow-camera-top={4}
          shadow-camera-bottom={-4}
          shadow-bias={-0.0005}
          shadow-normalBias={0.03}
        />
        {night ? (
          <>
            <Environment key="night" resolution={64} frames={1}>
              <Lightformer intensity={0.9} position={[0, 6, -6]} scale={[14, 6, 1]} color="#8ea6e6" />
              <Lightformer intensity={0.5} position={[-6, 2, 3]} scale={[6, 4, 1]} color="#6f86c8" />
              <Lightformer intensity={0.6} position={[6, 1, 2]} scale={[6, 3, 1]} color="#ffcf94" />
            </Environment>
            <pointLight position={[-1.05, 1.45, -0.45]} color="#7fe08a" intensity={3} distance={4} decay={1.8} />
            <Sparkles count={46} scale={[5.5, 2.4, 4.5]} position={[0, 1.4, 0]} size={4} speed={still ? 0 : 0.35} noise={0.6} color="#eaff9c" opacity={0.9} />
          </>
        ) : (
          <Environment key="day" resolution={64} frames={1}>
            <Lightformer intensity={2.2} position={[0, 6, -6]} scale={[14, 6, 1]} color="#ffffff" />
            <Lightformer intensity={1.2} position={[-6, 2, 3]} scale={[6, 4, 1]} color="#e3f4d6" />
            <Lightformer intensity={0.8} position={[6, 1, 2]} scale={[6, 3, 1]} color="#fff2d6" />
          </Environment>
        )}
        <group position={[0, 0.15, 0]}>
          <Island night={night} />
          <group position={[0.15, 0.22, 0.25]}>
            <Bot pointer={pointer} cue={cue} onPoke={onPoke} still={still} />
          </group>
        </group>
      </Canvas>
    </div>
  );
}

useGLTF.preload(MODEL);
