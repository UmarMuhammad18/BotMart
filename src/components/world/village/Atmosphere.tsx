"use client";

import { useFrame } from "@react-three/fiber";
import { Environment, Lightformer, Sky, Stars } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { SkyPhase, Weather } from "@/lib/world/options";
import { VILLAGE } from "@/lib/world/districts";

/** Late-afternoon sun: warm, low enough for long soft shadows. */
const SUN = new THREE.Vector3(55, 34, -28);
/** Golden hour: the sun sits just over the hills. */
const DUSK_SUN = new THREE.Vector3(70, 7, -18);
/** At night a cool moon stands in for the sun, from the other side. */
const MOON = new THREE.Vector3(-48, 42, -36);

type Look = {
  hemi: [string, string, number];
  key: { pos: THREE.Vector3; intensity: number; color: string };
  fog: { color: string; near: number; far: number };
  bloom: { intensity: number; threshold: number };
};

const LOOKS: Record<SkyPhase, Look> = {
  day: {
    hemi: ["#dcefff", "#3e5c2c", 0.65],
    key: { pos: SUN, intensity: 2.6, color: "#ffeccc" },
    fog: { color: "#c9dccf", near: 85, far: 210 },
    bloom: { intensity: 0.6, threshold: 1.05 },
  },
  dusk: {
    hemi: ["#ffd2a8", "#3a3626", 0.5],
    key: { pos: DUSK_SUN, intensity: 1.9, color: "#ffad6b" },
    fog: { color: "#e2b394", near: 70, far: 200 },
    bloom: { intensity: 0.9, threshold: 0.95 },
  },
  night: {
    hemi: ["#5a74b0", "#0c1710", 0.42],
    key: { pos: MOON, intensity: 0.75, color: "#b4c8ff" },
    fog: { color: "#0b1626", near: 70, far: 200 },
    bloom: { intensity: 1.1, threshold: 0.9 },
  },
};

/** The phase's look, adjusted for weather. Pure, so it's easy to reason about. */
export function lookFor(phase: SkyPhase, weather: Weather): Look {
  const base = LOOKS[phase];
  if (weather === "clear") return base;
  const grey = phase === "night" ? "#0a121b" : phase === "dusk" ? "#8f8580" : "#a9b5b0";
  const fogColor = new THREE.Color(base.fog.color).lerp(new THREE.Color(grey), 0.6).getStyle();
  if (weather === "rain") {
    return {
      ...base,
      hemi: [base.hemi[0], base.hemi[1], base.hemi[2] * 0.85],
      key: { ...base.key, intensity: base.key.intensity * 0.4 },
      fog: { color: fogColor, near: base.fog.near * 0.55, far: base.fog.far * 0.7 },
    };
  }
  return {
    ...base,
    key: { ...base.key, intensity: base.key.intensity * 0.7 },
    fog: { color: fogColor, near: 32, far: 150 },
  };
}

export function Atmosphere({ phase, weather, shadowMap }: { phase: SkyPhase; weather: Weather; shadowMap: number }) {
  const look = lookFor(phase, weather);
  const overcast = weather !== "clear";
  return (
    <>
      <hemisphereLight args={look.hemi} />
      <directionalLight
        position={look.key.pos}
        intensity={look.key.intensity}
        color={look.key.color}
        castShadow
        shadow-mapSize={[shadowMap, shadowMap]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.035}
        shadow-camera-near={10}
        shadow-camera-far={180}
        shadow-camera-left={-48}
        shadow-camera-right={48}
        shadow-camera-top={48}
        shadow-camera-bottom={-48}
      />
      {phase === "night" ? (
        <NightSky overcast={overcast} />
      ) : (
        <DaySky sun={look.key.pos} dusk={phase === "dusk"} overcast={overcast} />
      )}
      <fog attach="fog" args={[look.fog.color, look.fog.near, look.fog.far]} />
      {weather === "rain" && <Rain night={phase === "night"} />}
    </>
  );
}

export function bloomFor(phase: SkyPhase, weather: Weather) {
  return lookFor(phase, weather).bloom;
}

function DaySky({ sun, dusk, overcast }: { sun: THREE.Vector3; dusk: boolean; overcast: boolean }) {
  const sky = {
    sunPosition: sun,
    turbidity: overcast ? 14 : dusk ? 8 : 5,
    rayleigh: overcast ? 0.6 : dusk ? 2.8 : 1.4,
    mieCoefficient: dusk ? 0.008 : 0.004,
    mieDirectionalG: dusk ? 0.92 : 0.86,
  };
  return (
    <>
      <Sky distance={4500} {...sky} />
      {/* Re-render the environment when the sky changes */}
      <Environment key={`${dusk}-${overcast}`} resolution={256} frames={1}>
        <Sky distance={400} {...sky} />
      </Environment>
    </>
  );
}

/** Deep blue sky, stars, a moon and a faint cool environment for reflections. */
function NightSky({ overcast }: { overcast: boolean }) {
  const moon = MOON.clone().normalize().multiplyScalar(380);
  return (
    <>
      <color attach="background" args={[overcast ? "#0b121b" : "#0a1426"]} />
      {!overcast && <Stars radius={420} depth={60} count={5000} factor={7} saturation={0.15} fade speed={0.4} />}
      {!overcast && (
        <mesh position={moon}>
          <sphereGeometry args={[11, 64, 48]} />
          <meshBasicMaterial color="#eef2ff" toneMapped={false} />
        </mesh>
      )}
      <Environment resolution={128} frames={1}>
        <color attach="background" args={["#0e1a2e"]} />
        <Lightformer form="circle" intensity={1.2} color="#a9bfff" position={[-30, 30, -20]} scale={22} />
        <Lightformer form="rect" intensity={0.5} color="#ffb870" position={[0, -6, 0]} rotation-x={Math.PI / 2} scale={[60, 60, 1]} />
      </Environment>
    </>
  );
}

const DROPS = 4500;
const BOX = { w: 130, h: 42 };

/**
 * Rain: thin streaks falling through a box over the village. Each drop is a
 * line segment; the vertex shader moves it, so the CPU does nothing per frame
 * beyond one uniform.
 */
function Rain({ night }: { night: boolean }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const geo = useMemo(() => {
    const start = new Float32Array(DROPS * 2 * 3);
    const tip = new Float32Array(DROPS * 2);
    const speed = new Float32Array(DROPS * 2);
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < DROPS; i++) {
      const x = VILLAGE.cx + (rand() - 0.5) * BOX.w;
      const y = rand() * BOX.h;
      const z = VILLAGE.cz + (rand() - 0.5) * BOX.w;
      const s = 0.8 + rand() * 0.5;
      for (let k = 0; k < 2; k++) {
        start.set([x, y, z], (i * 2 + k) * 3);
        tip[i * 2 + k] = k;
        speed[i * 2 + k] = s;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(start, 3));
    g.setAttribute("aTip", new THREE.BufferAttribute(tip, 1));
    g.setAttribute("aSpeed", new THREE.BufferAttribute(speed, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(VILLAGE.cx, BOX.h / 2, VILLAGE.cz), BOX.w);
    return g;
  }, []);
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uColor: { value: new THREE.Color(night ? "#7f93b5" : "#dfe8f0") } }),
    [night]
  );
  useFrame((_, dt) => {
    if (mat.current) mat.current.uniforms.uTime.value += Math.min(dt, 0.1);
  });
  return (
    <lineSegments geometry={geo} frustumCulled={false}>
      <shaderMaterial
        ref={mat}
        transparent
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={`
          attribute float aTip;
          attribute float aSpeed;
          uniform float uTime;
          varying float vTip;
          void main() {
            vec3 p = position;
            p.y = mod(position.y - uTime * 26.0 * aSpeed, ${BOX.h.toFixed(1)});
            // The tail trails up and slightly upwind
            p += aTip * vec3(0.12, 0.85, 0.05);
            vTip = aTip;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
          }
        `}
        fragmentShader={`
          uniform vec3 uColor;
          varying float vTip;
          void main() {
            gl_FragColor = vec4(uColor, mix(0.55, 0.0, vTip));
          }
        `}
      />
    </lineSegments>
  );
}
