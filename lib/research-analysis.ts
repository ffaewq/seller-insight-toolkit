import type { SellerSpriteKeyword, SellerSpriteRankPoint, SellerSpriteReview, SellerSpriteSalesPoint } from "@/lib/sellersprite-import";

const themeRules: Array<{ id: string; label: string; terms: string[] }> = [
  { id: "quality", label: "质量与耐用", terms: ["quality", "durable", "broke", "broken", "cheap", "sturdy", "lasted"] },
  { id: "length", label: "长度", terms: ["length", "long", "short", "extension", "reach"] },
  { id: "fit", label: "兼容与插合", terms: ["fit", "compatible", "connection", "connector", "plug", "polarity"] },
  { id: "install", label: "安装体验", terms: ["easy", "install", "disconnect", "quick", "simple"] },
  { id: "wire", label: "线材与线规", terms: ["wire", "gauge", "awg", "copper", "thick", "thin"] },
  { id: "weather", label: "防水与户外", terms: ["water", "weather", "outdoor", "rain", "seal"] },
  { id: "value", label: "价格与价值", terms: ["price", "value", "worth", "money", "expensive"] },
];

export function analyzeReviews(reviews: SellerSpriteReview[]) {
  const valid = reviews.filter((review) => review.title || review.content);
  const averageRating = valid.length ? valid.reduce((sum, review) => sum + review.rating, 0) / valid.length : 0;
  const negative = valid.filter((review) => review.rating > 0 && review.rating <= 3);
  const themes = themeRules.map((rule) => {
    const matched = valid.filter((review) => rule.terms.some((term) => `${review.title} ${review.content}`.toLowerCase().includes(term)));
    const negativeCount = matched.filter((review) => review.rating <= 3).length;
    return { ...rule, count: matched.length, negativeCount, negativeShare: matched.length ? negativeCount / matched.length : 0 };
  }).filter((theme) => theme.count).sort((a, b) => b.count - a.count);
  return {
    count: valid.length,
    averageRating,
    verifiedShare: valid.length ? valid.filter((review) => review.verifiedPurchase).length / valid.length : 0,
    mediaCount: valid.filter((review) => review.imageUrls.length || review.hasVideo).length,
    negativeCount: negative.length,
    themes,
    negativeExamples: negative.sort((a, b) => a.rating - b.rating || b.helpfulVotes - a.helpfulVotes).slice(0, 8),
  };
}

export function analyzeRankHistory(points: SellerSpriteRankPoint[]) {
  const sorted = [...points].sort((a, b) => a.observedAt.localeCompare(b.observedAt));
  const categories = Array.from(new Set(sorted.flatMap((point) => Object.keys(point.ranks))));
  const series = categories.map((category) => {
    const values = sorted.map((point) => point.ranks[category]).filter((value): value is number => typeof value === "number" && value > 0);
    const latest = [...sorted].reverse().map((point) => point.ranks[category]).find((value): value is number => typeof value === "number" && value > 0) || 0;
    const best = values.length ? Math.min(...values) : 0;
    const worst = values.length ? Math.max(...values) : 0;
    return { category, latest, best, worst, observations: values.length };
  }).filter((item) => item.observations).sort((a, b) => b.observations - a.observations);
  return { start: sorted[0]?.observedAt || "", end: sorted.at(-1)?.observedAt || "", observations: sorted.length, series };
}

export function analyzeSalesHistory(points: SellerSpriteSalesPoint[]) {
  const monthly = points.filter((point) => point.granularity === "month").sort((a, b) => a.period.localeCompare(b.period));
  const latest = monthly.at(-1);
  const previous = monthly.at(-2);
  const growth = latest && previous && previous.sales ? (latest.sales - previous.sales) / previous.sales : 0;
  const annual = points.filter((point) => point.granularity === "year").sort((a, b) => b.period.localeCompare(a.period));
  return { monthly, annual, latest, growth, totalSales: monthly.reduce((sum, point) => sum + point.sales, 0), totalRevenue: monthly.reduce((sum, point) => sum + point.revenue, 0) };
}

export function analyzeKeywordMining(keywords: SellerSpriteKeyword[]) {
  const valid = keywords.filter((keyword) => keyword.keyword);
  const opportunities = [...valid].map((keyword) => {
    const demand = Math.log10(Math.max(10, keyword.monthlySearchVolume));
    const conversion = Math.min(1, keyword.purchaseRate * 4);
    const competition = Math.log10(Math.max(10, keyword.products || 10));
    const score = Math.max(0, Math.min(100, Math.round((demand * 18 + conversion * 30 - competition * 10) * 1.5)));
    return { ...keyword, opportunityScore: score };
  }).sort((a, b) => b.opportunityScore - a.opportunityScore || b.monthlySearchVolume - a.monthlySearchVolume);
  return { count: valid.length, totalSearchVolume: valid.reduce((sum, keyword) => sum + keyword.monthlySearchVolume, 0), opportunities };
}
