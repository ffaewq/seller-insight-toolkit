import { classifyCompetitor, type Competitor, type TargetProfileId } from "@/lib/competitor-analysis";

type Fixture = { profile: TargetProfileId; title: string; expected: "direct" | "adjacent" | "excluded" };

export const competitorClassificationFixtures: Fixture[] = [
  { profile: "solar-y-branch", title: "12AWG Solar Y Branch Connector 2 to 1 Parallel Adapter MFF FMM", expected: "direct" },
  { profile: "solar-y-branch", title: "Solar Connector Extension Cable for RV", expected: "adjacent" },
  { profile: "solar-y-branch", title: "20W Solar Panel Battery Charger Maintainer with Controller", expected: "excluded" },
  { profile: "sae-quick-connect", title: "12AWG SAE Quick Disconnect Extension Cable 2 Pin", expected: "direct" },
  { profile: "sae-quick-connect", title: "SAE Polarity Reverse Adapter Connector", expected: "adjacent" },
  { profile: "sae-quick-connect", title: "Solar Y Branch Parallel Connector 2 to 1", expected: "excluded" },
];

export const verifyCompetitorClassificationFixtures = () => competitorClassificationFixtures.every((fixture, index) => {
  const row: Competitor = { id: String(index), asin: "", brand: "", title: fixture.title, price: 0, rating: 0, reviews: 0, monthlySales: 0, bsr: 0 };
  return classifyCompetitor(row, fixture.profile).kind === fixture.expected;
});
