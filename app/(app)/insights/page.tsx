import { ChartBar } from "@phosphor-icons/react/dist/ssr";

import { UnderConstruction } from "@/components/organisms/under-construction";

export default function InsightsPage() {
  return (
    <>
      <header className="flex items-center border-b border-foreground/10 px-4 py-3">
        <h1 className="font-heading text-sm font-medium">Insights</h1>
      </header>
      <UnderConstruction
        icon={ChartBar}
        title="Insights"
        description="Spending trends, category breakdowns, and your AI monthly summary will live here."
      />
    </>
  );
}
