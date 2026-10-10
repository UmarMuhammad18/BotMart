"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  ContactShadows,
  Text,
  Billboard,
  OrthographicCamera,
} from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { ROLE_BY_ID } from "@/lib/agents/roles";
import type { WorldAgent, WorldStall, WorldSnapshot } from "@/lib/types";

function Floor() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[48, 48]} />
        <meshStandardMaterial color="#0c0f14" metalness={0.2} roughness={0.85} />
      </mesh>
      <gridHelper args={[48, 24, "#1f2937", "#111827"]} position={[0, 0.01, 0]} />
    </group>
  );
}

function StallMesh({ stall }: { stall: WorldStall }) {
  const sold = stall.status !== "active" || stall.stock <= 0;
  const label = `${stall.title.slice(0, 18)}${stall.title.length > 18 ? "…" : ""}`;

  return (
    <group position={[stall.x, 0, stall.z]}>
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[1.6, 0.7, 1.2]} />
        <meshStandardMaterial
          color={sold ? "#3f3f46" : "#14532d"}
          metalness={0.3}
          roughness={0.5}
        />
      </mesh>
      <mesh position={[0, 0.95, 0]} castShadow>
        <boxGeometry args={[1.8, 0.12, 1.4]} />
        <meshStandardMaterial color={sold ? "#52525b" : "#10b981"} />
      </mesh>
      <mesh position={[0, 1.3, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.5, 8]} />
        <meshStandardMaterial color="#a1a1aa" />
      </mesh>
      {/* 3D text — no DOM portal, avoids React unmount race with Html */}
      <Billboard position={[0, 2.05, 0]} follow lockX={false} lockY={false} lockZ={false}>
        <Text
          fontSize={0.28}
          color="#f4f4f5"
          anchorX="center"
          anchorY="bottom"
          maxWidth={3}
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {label}
        </Text>
        <Text
          position={[0, -0.32, 0]}
          fontSize={0.24}
          color="#6ee7b7"
          anchorX="center"
          anchorY="top"
          outlineWidth={0.015}
          outlineColor="#000000"
        >
          {`£${stall.price}`}
        </Text>
      </Billboard>
    </group>
  );
}

function AgentMesh({
  agent,
  stalls,
}: {
  agent: WorldAgent;
  stalls: WorldStall[];
}) {
  const group = useRef<THREE.Group>(null);
  const pos = useRef(new THREE.Vector3(agent.x, 0.55, agent.z));
  const targetRef = useRef(new THREE.Vector3(agent.x, 0.55, agent.z));
  const color = ROLE_BY_ID[agent.role]?.hex || "#94a3b8";
  const bob = useMemo(() => Math.random() * Math.PI * 2, []);

  useEffect(() => {
    let tx = agent.x;
    let tz = agent.z;
    if (agent.activity === "negotiating" && stalls.length > 0) {
      let h = 0;
      for (let i = 0; i < agent.id.length; i++) h = (h + agent.id.charCodeAt(i)) | 0;
      const stall = stalls[Math.abs(h) % stalls.length];
      tx = stall.x + 1.2;
      tz = stall.z + 0.8;
    } else if (agent.activity === "scouting") {
      tx = agent.x + 2.5;
      tz = agent.z - 1.5;
    } else if (agent.activity === "jury") {
      tx = 0;
      tz = 8;
    }
    targetRef.current.set(tx, 0.55, tz);
  }, [agent.x, agent.z, agent.activity, agent.id, stalls]);

  useFrame(({ clock }, dt) => {
    if (!group.current) return;
    pos.current.lerp(targetRef.current, Math.min(1, dt * 1.4));
    const t = clock.getElapsedTime();
    group.current.position.set(
      pos.current.x,
      0.55 + Math.sin(t * 2.2 + bob) * 0.05,
      pos.current.z
    );
    const dir = targetRef.current.clone().sub(pos.current);
    if (dir.lengthSq() > 0.01) {
      const ang = Math.atan2(dir.x, dir.z);
      group.current.rotation.y = THREE.MathUtils.lerp(
        group.current.rotation.y,
        ang,
        0.1
      );
    } else if (agent.activity === "negotiating") {
      group.current.rotation.y = t * 0.6;
    }
  });

  const shortName =
    agent.name.length > 12 ? agent.name.slice(0, 11) + "…" : agent.name;

  return (
    <group ref={group} position={[agent.x, 0.55, agent.z]}>
      <mesh castShadow>
        <capsuleGeometry args={[0.28, 0.45, 4, 8]} />
        <meshStandardMaterial color={color} metalness={0.55} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.58, 0.16]}>
        <boxGeometry args={[0.28, 0.1, 0.06]} />
        <meshStandardMaterial
          color="#67e8f9"
          emissive="#22d3ee"
          emissiveIntensity={0.8}
        />
      </mesh>
      <Billboard position={[0, 1.2, 0]}>
        <Text
          fontSize={0.22}
          color="#e4e4e7"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.015}
          outlineColor="#000000"
        >
          {shortName}
        </Text>
        <Text
          position={[0, -0.26, 0]}
          fontSize={0.16}
          color="#a1a1aa"
          anchorX="center"
          anchorY="top"
          outlineWidth={0.01}
          outlineColor="#000000"
        >
          {agent.activity}
        </Text>
      </Billboard>
    </group>
  );
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[12, 18, 8]}
        intensity={1.15}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[-8, 6, -6]} intensity={0.4} color="#34d399" />
      <pointLight position={[8, 5, 6]} intensity={0.35} color="#22d3ee" />
    </>
  );
}

function IsoCameraRig() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(18, 18, 18);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera]);
  return null;
}

function SceneContent({ snapshot }: { snapshot: WorldSnapshot }) {
  return (
    <>
      <OrthographicCamera
        makeDefault
        zoom={28}
        position={[18, 18, 18]}
        near={-80}
        far={200}
      />
      <IsoCameraRig />
      <Lights />
      <Floor />
      {snapshot.stalls.map((s) => (
        <StallMesh key={s.id} stall={s} />
      ))}
      {snapshot.agents.map((a) => (
        <AgentMesh key={a.id} agent={a} stalls={snapshot.stalls} />
      ))}
      <ContactShadows
        position={[0, 0, 0]}
        opacity={0.45}
        scale={40}
        blur={2.5}
        far={12}
      />
      <Text
        position={[0, 0.02, 14]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.8}
        color="#27272a"
        anchorX="center"
        anchorY="middle"
      >
        BOTMART LIVE FLOOR
      </Text>
      <OrbitControls
        makeDefault
        enablePan
        minPolarAngle={0.4}
        maxPolarAngle={Math.PI / 2.2}
        minZoom={12}
        maxZoom={60}
        target={[0, 0, 0]}
      />
    </>
  );
}

export function IsoScene({ snapshot }: { snapshot: WorldSnapshot }) {
  return (
    <div className="w-full h-full min-h-[420px] rounded-2xl overflow-hidden border border-white/10 bg-[#050507]">
      <Canvas
        shadows
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        // Keep one WebGL context; parent re-renders should not tear down the root
        frameloop="always"
      >
        <color attach="background" args={["#050507"]} />
        <fog attach="fog" args={["#050507", 30, 70]} />
        <SceneContent snapshot={snapshot} />
      </Canvas>
    </div>
  );
}
