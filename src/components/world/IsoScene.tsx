"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  ContactShadows,
  Text,
  Billboard,
  OrthographicCamera,
  Environment,
  Float,
} from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  Vignette,
  SMAA,
} from "@react-three/postprocessing";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { WorldStall, WorldSnapshot } from "@/lib/types";
import type { WorldDirector } from "@/lib/world/director";
import type { CameraMode, WorldSelection } from "@/components/world/WorldCanvas";
import { ProductMesh } from "@/components/world/ProductMesh";
import { SceneDressing } from "@/components/world/SceneDressing";
import { WorldAgentMesh } from "@/components/world/WorldAgent";
import {
  contentCenter,
  FrameCamera,
  CameraDirector,
} from "@/components/world/WorldCamera";

function Floor() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[96, 96]} />
        <meshStandardMaterial
          color="#080b12"
          metalness={0.35}
          roughness={0.75}
          envMapIntensity={0.4}
        />
      </mesh>
      <gridHelper args={[80, 40, "#1e293b", "#0f172a"]} position={[0, 0.025, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[28, 28.3, 64]} />
        <meshBasicMaterial
          color="#10b981"
          transparent
          opacity={0.28}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function StallMesh({
  stall,
  selected,
  onSelect,
}: {
  stall: WorldStall;
  selected: boolean;
  onSelect: () => void;
}) {
  const sold = stall.status !== "active" || stall.stock <= 0;
  const stockPct = Math.min(1, Math.max(0, stall.stock / 10));
  const label =
    stall.title.length > 16 ? stall.title.slice(0, 15) + "…" : stall.title;

  return (
    <group
      position={[stall.x, 0, stall.z]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <mesh position={[0, 0.28, 0]} castShadow>
        <boxGeometry args={[1.9, 0.55, 1.45]} />
        <meshPhysicalMaterial
          color={sold ? "#3f3f46" : "#0c2e24"}
          metalness={0.45}
          roughness={0.35}
          clearcoat={0.3}
          emissive={selected ? "#10b981" : "#000000"}
          emissiveIntensity={selected ? 0.35 : 0}
        />
      </mesh>
      <mesh position={[0, 0.58, 0]} castShadow>
        <boxGeometry args={[2.05, 0.08, 1.55]} />
        <meshPhysicalMaterial
          color={sold ? "#52525b" : "#115e45"}
          metalness={0.55}
          roughness={0.3}
          clearcoat={0.4}
        />
      </mesh>
      {!sold && (
        <mesh position={[0, 1.2, 0.1]} castShadow>
          <boxGeometry args={[2.15, 0.07, 1.65]} />
          <meshStandardMaterial
            color="#10b981"
            emissive="#10b981"
            emissiveIntensity={1.4}
            toneMapped={false}
          />
        </mesh>
      )}
      {sold && (
        <mesh position={[0, 0.95, 0.75]}>
          <boxGeometry args={[1.8, 1.15, 0.05]} />
          <meshStandardMaterial color="#27272a" metalness={0.7} roughness={0.25} />
        </mesh>
      )}
      {!sold && (
        <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.25}>
          <ProductMesh category={stall.category} title={stall.title} sold={false} />
        </Float>
      )}
      <mesh position={[-0.75, 0.1, 0.78]}>
        <boxGeometry args={[0.5, 0.07, 0.05]} />
        <meshBasicMaterial color="#27272a" />
      </mesh>
      <mesh
        position={[-0.75 - 0.25 * (1 - stockPct), 0.1, 0.79]}
        scale={[stockPct || 0.05, 1, 1]}
      >
        <boxGeometry args={[0.5, 0.05, 0.04]} />
        <meshBasicMaterial
          color={stockPct > 0.3 ? "#34d399" : "#f59e0b"}
          toneMapped={false}
        />
      </mesh>
      <Billboard position={[0, 2.2, 0]}>
        <Text
          fontSize={0.24}
          color="#fafafa"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.018}
          outlineColor="#000"
        >
          {label}
        </Text>
        <Text
          position={[0, -0.26, 0]}
          fontSize={0.2}
          color={sold ? "#a1a1aa" : "#6ee7b7"}
          anchorX="center"
          anchorY="top"
          outlineWidth={0.014}
          outlineColor="#000"
        >
          {sold ? "SOLD" : `£${stall.price}`}
        </Text>
      </Billboard>
    </group>
  );
}

/** Advances the director on the render clock (sim time scales with speed). */
function DirectorClock({ director }: { director: WorldDirector }) {
  useFrame((_, dt) => director.tick(dt * 1000));
  return null;
}

/** Live price tag + pulsing floor ring over each stall being negotiated. */
function NegotiationTags({
  snapshot,
  director,
}: {
  snapshot: WorldSnapshot;
  director: WorldDirector;
}) {
  const stallMap = useMemo(
    () => new Map(snapshot.stalls.map((s) => [s.id, s])),
    [snapshot.stalls]
  );

  return (
    <>
      {director.links.map((link) => {
        const s = stallMap.get(link.stallId);
        if (!s) return null;
        return (
          <NegotiationTag
            key={`${link.buyerId}-${link.stallId}`}
            stall={s}
            price={link.price}
          />
        );
      })}
    </>
  );
}

function NegotiationTag({
  stall,
  price,
}: {
  stall: WorldStall;
  price: number | null;
}) {
  const ring = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ring.current) return;
    const k = 1 + ((clock.getElapsedTime() * 0.8) % 1) * 0.35;
    ring.current.scale.set(k, k, 1);
    (ring.current.material as THREE.MeshBasicMaterial).opacity = 1.35 - k;
  });

  return (
    <group position={[stall.x, 0, stall.z]}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0.6]}>
        <ringGeometry args={[1.7, 1.82, 48]} />
        <meshBasicMaterial color="#fbbf24" transparent toneMapped={false} />
      </mesh>
      {price != null && (
        <Billboard position={[0, 2.95, 0]}>
          <Text
            fontSize={0.34}
            color="#fde68a"
            anchorX="center"
            outlineWidth={0.024}
            outlineColor="#422006"
          >
            {`⇄ £${Math.round(price)}`}
          </Text>
        </Billboard>
      )}
    </group>
  );
}

/** Deal / no-deal bursts: rising label, shockwave ring, coin spray. */
function DealBursts({ director }: { director: WorldDirector }) {
  return (
    <>
      {director.activeBursts.map((b) => (
        <DealBurst key={b.id} burst={b} director={director} />
      ))}
    </>
  );
}

const COINS = 10;

function DealBurst({
  burst,
  director,
}: {
  burst: { x: number; z: number; label: string; tone: "deal" | "walk"; bornAt: number };
  director: WorldDirector;
}) {
  const label = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const coins = useRef<(THREE.Mesh | null)[]>([]);
  const deal = burst.tone === "deal";
  const color = deal ? "#34d399" : "#fb7185";

  useFrame(() => {
    // Seconds since birth on the director clock (respects playback speed)
    const age = (director.now - burst.bornAt) / 1000;
    if (label.current) label.current.position.y = 2.6 + Math.min(age, 1.2) * 0.9;
    if (ring.current) {
      const k = 0.3 + age * 2.2;
      ring.current.scale.set(k, k, 1);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = Math.max(
        0,
        0.9 - age * 0.6
      );
    }
    coins.current.forEach((c, i) => {
      if (!c) return;
      const a = (i / COINS) * Math.PI * 2;
      const r = age * 1.6;
      c.position.set(
        Math.cos(a) * r,
        1.4 + age * 3.2 - age * age * 3.4,
        Math.sin(a) * r
      );
      c.rotation.y = age * 8 + i;
      c.visible = deal && c.position.y > 0;
    });
  });

  return (
    <group position={[burst.x, 0, burst.z]}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[1, 1.15, 48]} />
        <meshBasicMaterial color={color} transparent toneMapped={false} />
      </mesh>
      {Array.from({ length: COINS }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            coins.current[i] = el;
          }}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.1, 0.1, 0.03, 16]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#f59e0b"
            emissiveIntensity={1.6}
            metalness={0.9}
            roughness={0.2}
            toneMapped={false}
          />
        </mesh>
      ))}
      <group ref={label}>
        <Billboard>
          <Text
            fontSize={deal ? 0.5 : 0.36}
            color={deal ? "#6ee7b7" : "#fda4af"}
            anchorX="center"
            outlineWidth={0.03}
            outlineColor={deal ? "#052e16" : "#4c0519"}
          >
            {burst.label}
          </Text>
        </Billboard>
      </group>
    </group>
  );
}

function CourtDais() {
  return (
    <group position={[0, 0, 16]}>
      <mesh position={[0, 0.15, 0]} receiveShadow>
        <cylinderGeometry args={[2.8, 3.0, 0.32, 32]} />
        <meshPhysicalMaterial
          color="#1e1b4b"
          metalness={0.5}
          roughness={0.4}
          clearcoat={0.3}
        />
      </mesh>
      <mesh position={[0, 0.38, 0]}>
        <cylinderGeometry args={[2.0, 2.0, 0.14, 32]} />
        <meshStandardMaterial
          color="#6d28d9"
          emissive="#7c3aed"
          emissiveIntensity={1.2}
          toneMapped={false}
        />
      </mesh>
      <Billboard position={[0, 1.35, 0]}>
        <Text
          fontSize={0.32}
          color="#e9d5ff"
          anchorX="center"
          outlineWidth={0.02}
          outlineColor="#000"
        >
          COURT IN SESSION
        </Text>
      </Billboard>
    </group>
  );
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <hemisphereLight args={["#1e293b", "#020617", 0.45]} />
      <directionalLight
        position={[16, 28, 14]}
        intensity={1.35}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={80}
        shadow-camera-left={-35}
        shadow-camera-right={35}
        shadow-camera-top={35}
        shadow-camera-bottom={-35}
        color="#e2e8f0"
      />
      <pointLight position={[-14, 7, -8]} intensity={1.2} color="#34d399" distance={36} />
      <pointLight position={[14, 6, 8]} intensity={1.0} color="#22d3ee" distance={36} />
      <pointLight position={[0, 7, 16]} intensity={1.4} color="#a78bfa" distance={28} />
    </>
  );
}

function SceneContent({
  snapshot,
  selection,
  onSelect,
  cameraMode,
  followAgentId,
  director,
}: {
  snapshot: WorldSnapshot;
  selection: WorldSelection;
  onSelect: (s: WorldSelection) => void;
  cameraMode: CameraMode;
  followAgentId: string | null;
  director: WorldDirector;
}) {
  const center = contentCenter(snapshot);

  return (
    <>
      <OrthographicCamera makeDefault near={-100} far={250} zoom={36} />
      <FrameCamera snapshot={snapshot} />
      <Lights />
      <Environment preset="night" environmentIntensity={0.55} />
      <Floor />
      <SceneDressing />
      <CourtDais />
      <DirectorClock director={director} />
      <NegotiationTags snapshot={snapshot} director={director} />
      <DealBursts director={director} />
      {snapshot.stalls.map((s) => (
        <StallMesh
          key={s.id}
          stall={s}
          selected={selection?.kind === "stall" && selection.id === s.id}
          onSelect={() => onSelect({ kind: "stall", id: s.id })}
        />
      ))}
      {snapshot.agents.map((a) => (
        <WorldAgentMesh
          key={a.id}
          agent={a}
          stalls={snapshot.stalls}
          selected={selection?.kind === "agent" && selection.id === a.id}
          onSelect={() => onSelect({ kind: "agent", id: a.id })}
          director={director}
        />
      ))}
      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.55}
        scale={70}
        blur={2.8}
        far={16}
        color="#000000"
      />
      <OrbitControls
        makeDefault
        enablePan
        minPolarAngle={0.4}
        maxPolarAngle={Math.PI / 2.25}
        minZoom={18}
        maxZoom={75}
        target={[center.x, 0, center.z]}
      />
      <CameraDirector
        mode={cameraMode}
        followAgentId={followAgentId}
        snapshot={snapshot}
        director={director}
      />
      <EffectComposer multisampling={0}>
        <SMAA />
        <Bloom
          intensity={0.85}
          luminanceThreshold={0.35}
          luminanceSmoothing={0.7}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.15} darkness={0.55} />
      </EffectComposer>
    </>
  );
}

export function IsoScene({
  snapshot,
  selection,
  onSelect,
  cameraMode,
  followAgentId,
  director,
}: {
  snapshot: WorldSnapshot;
  selection: WorldSelection;
  onSelect: (s: WorldSelection) => void;
  cameraMode: CameraMode;
  followAgentId: string | null;
  director: WorldDirector;
}) {
  return (
    <div
      className="w-full rounded-2xl overflow-hidden border border-white/10 bg-[#050507] relative"
      style={{ height: "min(70vh, 640px)", minHeight: 520 }}
    >
      <Canvas
        className="!w-full !h-full"
        style={{ width: "100%", height: "100%" }}
        shadows
        dpr={[1, 1.75]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
        onPointerMissed={() => onSelect(null)}
      >
        <color attach="background" args={["#06080f"]} />
        <fog attach="fog" args={["#06080f", 50, 100]} />
        <SceneContent
          snapshot={snapshot}
          selection={selection}
          onSelect={onSelect}
          cameraMode={cameraMode}
          followAgentId={followAgentId}
          director={director}
        />
      </Canvas>
    </div>
  );
}
