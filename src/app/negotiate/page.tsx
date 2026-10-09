"use client";

import { Suspense } from "react";
import { NegotiateClient } from "@/components/negotiate/NegotiateClient";

export default function NegotiatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="thinking-dots flex gap-2">
            <span />
            <span />
            <span />
          </div>
        </div>
      }
    >
      <NegotiateClient />
    </Suspense>
  );
}
