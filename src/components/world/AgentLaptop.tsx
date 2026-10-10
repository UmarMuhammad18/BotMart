"use client";

import { Text } from "@react-three/drei";

/**
 * Retro laptop floating near an agent.
 * Screen shows what they sell (or buy / status).
 */
export function AgentLaptop({
  screenText,
  accent = "#34d399",
}: {
  screenText: string;
  accent?: string;
}) {
  const line1 =
    screenText.length > 18 ? screenText.slice(0, 17) + "…" : screenText;

  return (
    <group position={[0.55, 0.15, 0.35]} rotation={[0.15, -0.4, 0]}>
      {/* base */}
      <mesh castShadow position={[0, 0, 0]}>
        <boxGeometry args={[0.55, 0.04, 0.4]} />
        <meshStandardMaterial color="#1c1917" metalness={0.5} roughness={0.45} />
      </mesh>
      {/* keyboard deck hint */}
      <mesh position={[0, 0.025, 0.02]}>
        <boxGeometry args={[0.48, 0.01, 0.28]} />
        <meshStandardMaterial color="#292524" metalness={0.3} roughness={0.6} />
      </mesh>
      {/* hinge */}
      <mesh position={[0, 0.03, -0.18]}>
        <boxGeometry args={[0.55, 0.03, 0.04]} />
        <meshStandardMaterial color="#44403c" metalness={0.6} />
      </mesh>
      {/* lid / screen back */}
      <mesh position={[0, 0.28, -0.2]} rotation={[-0.35, 0, 0]} castShadow>
        <boxGeometry args={[0.55, 0.38, 0.03]} />
        <meshStandardMaterial color="#1c1917" metalness={0.55} roughness={0.4} />
      </mesh>
      {/* screen glass */}
      <mesh position={[0, 0.28, -0.18]} rotation={[-0.35, 0, 0]}>
        <planeGeometry args={[0.48, 0.32]} />
        <meshStandardMaterial
          color="#022c22"
          emissive={accent}
          emissiveIntensity={0.35}
          toneMapped={false}
        />
      </mesh>
      {/* glowing bezel line */}
      <mesh position={[0, 0.28, -0.175]} rotation={[-0.35, 0, 0]}>
        <planeGeometry args={[0.5, 0.34]} />
        <meshBasicMaterial color={accent} transparent opacity={0.12} toneMapped={false} />
      </mesh>
      {/* screen text — local to lid plane */}
      <group position={[0, 0.28, -0.17]} rotation={[-0.35, 0, 0]}>
        <Text
          position={[0, 0.06, 0.01]}
          fontSize={0.055}
          color={accent}
          anchorX="center"
          anchorY="middle"
          maxWidth={0.42}
          textAlign="center"
          outlineWidth={0.003}
          outlineColor="#000"
        >
          {line1}
        </Text>
        <Text
          position={[0, -0.06, 0.01]}
          fontSize={0.04}
          color="#a7f3d0"
          anchorX="center"
          anchorY="middle"
        >
          BOTMART OS
        </Text>
      </group>
    </group>
  );
}

export function laptopTextForAgent(
  agent: {
    name: string;
    activity: string;
    role: string;
    goal: string | null;
  },
  stalls: { title: string; seller_name: string | null; seller_id?: string | null; price: number }[],
  agentId: string
): string {
  // Prefer a listing this agent sells
  const mine =
    stalls.find((s) => s.seller_id === agentId) ||
    stalls.find(
      (s) =>
        s.seller_name &&
        s.seller_name.toLowerCase() === agent.name.toLowerCase()
    );
  if (mine) return `SELL · ${mine.title}`;

  if (agent.activity === "negotiating") return "NEGOTIATING…";
  if (agent.activity === "scouting") return "SCOUTING MARKET";
  if (agent.activity === "jury") return "COURT SESSION";
  if (agent.goal) {
    const g = agent.goal.length > 20 ? agent.goal.slice(0, 19) + "…" : agent.goal;
    return g;
  }
  if (agent.role === "buyer") return "LOOKING TO BUY";
  if (agent.role === "seller") return "OPEN FOR OFFERS";
  return agent.role.toUpperCase();
}
