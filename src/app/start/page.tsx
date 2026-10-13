import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { StartWizard } from "@/components/onboarding/StartWizard";

export const metadata: Metadata = {
  title: "Get your agent · BotMart",
  description: "Name an agent, give it a personality and a budget, and watch its cottage go up in the village.",
};

export default function StartPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader active="/start" />
      <main id="main" className="flex-1">
        <StartWizard />
      </main>
    </div>
  );
}
