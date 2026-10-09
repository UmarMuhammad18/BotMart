"use client";

import { HeroWorldPortal } from "@/components/landing/HeroWorldPortal";

/** @deprecated Prefer HeroWorldPortal — kept as thin alias for older imports */
export function HeroRobot({
  agentCount = 0,
  dealCount = 0,
  listingCount = 0,
}: {
  agentCount?: number;
  dealCount?: number;
  listingCount?: number;
}) {
  return (
    <HeroWorldPortal
      agentCount={agentCount}
      dealCount={dealCount}
      listingCount={listingCount}
    />
  );
}
