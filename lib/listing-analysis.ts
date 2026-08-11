export type Severity = "critical" | "warning" | "opportunity" | "pass";

export type ListingInput = {
  marketplace: string;
  category: string;
  title: string;
  bullets: string[];
  description: string;
  searchTerms: string;
  targetKeywords: string;
  scenarios: string;
  productFacts: string;
  titleLimit: number;
  bulletLimit: number;
};

export type Finding = {
  severity: Severity;
  field: string;
  title: string;
  detail: string;
  action: string;
};

export type KeywordCoverage = {
  keyword: string;
  title: boolean;
  bullets: boolean;
  searchTerms: boolean;
  covered: boolean;
};

export type AuditResult = {
  overall: number;
  gate: "blocked" | "review" | "clear";
  scores: {
    compliance: number;
    seo: number;
    relevance: number;
    persuasion: number;
    readability: number;
  };
  findings: Finding[];
  keywords: KeywordCoverage[];
  summary: string;
};

const riskyPatterns = [
  { pattern: /\b(best|#1|number one|top[- ]rated)\b/i, label: "Unverifiable superiority claim" },
  { pattern: /\b(guaranteed|100% guaranteed|risk[- ]free)\b/i, label: "Absolute guarantee claim" },
  { pattern: /\b(free shipping|limited time|sale|discount|coupon)\b/i, label: "Promotional language" },
  { pattern: /\b(cure|treats?|prevents? disease|medical grade)\b/i, label: "Potential medical claim" },
  { pattern: /\b(contact us|email us|call us|www\.|https?:\/\/)\b/i, label: "External contact or URL" },
  { pattern: /[™®©]/, label: "Trademark symbol in customer-facing copy" },
];

const evidenceTerms = ["because", "with", "features", "made of", "built with", "tested", "rated", "certified", "double", "tinned", "copper", "ip68", "tüv", "tuv"];
const benefitTerms = ["helps", "keeps", "protects", "prevents", "reduces", "improves", "extends", "easy", "reliable", "secure", "quick"];
const compatibilityTerms = ["compatible", "works with", "fits", "awg", "mm²", "connector", "adapter"];
const installTerms = ["install", "plug and play", "connect", "disconnect", "lock", "unlock", "tool"];
const specTerms = ["amp", "voltage", "dc", "ac", "inch", "cm", "temperature", "awg", "ip68"];

const clean = (value: string) => value.toLowerCase().replace(/[–—]/g, "-").replace(/[^a-z0-9+#.\-]+/g, " ").replace(/\s+/g, " ").trim();

const splitItems = (value: string) => Array.from(new Set(value.split(/[,;\n|]+/).map((item) => item.trim()).filter(Boolean)));

const containsAny = (text: string, terms: string[]) => terms.some((term) => clean(text).includes(clean(term)));

function scoreReadability(text: string) {
  const sentences = text.split(/[.!?]+/).map((item) => item.trim()).filter(Boolean);
  if (!sentences.length) return 0;
  const average = sentences.reduce((sum, sentence) => sum + sentence.split(/\s+/).length, 0) / sentences.length;
  if (average <= 20) return 100;
  if (average <= 28) return 82;
  if (average <= 36) return 64;
  return 42;
}

export function auditListing(input: ListingInput): AuditResult {
  const fullText = [input.title, ...input.bullets, input.description].join(" ");
  const normalizedFull = clean(fullText);
  const findings: Finding[] = [];
  let compliance = 100;

  riskyPatterns.forEach(({ pattern, label }) => {
    if (pattern.test(fullText)) {
      compliance -= 20;
      findings.push({
        severity: "critical",
        field: "Compliance",
        title: label,
        detail: "This phrase may trigger a policy review or requires evidence that is not present in the listing.",
        action: "Remove the claim or replace it with a precise, verifiable product fact.",
      });
    }
  });

  if (/[!]{2,}|[?]{2,}/.test(fullText)) {
    compliance -= 12;
    findings.push({ severity: "warning", field: "Compliance", title: "Repeated punctuation", detail: "Repeated exclamation or question marks can look promotional.", action: "Use standard punctuation once." });
  }

  if (/\b[A-Z]{5,}\b/.test(input.title.replace(/\b(AWG|PVC|PPO|IP68|TUV|CE|DC|AC|RV)\b/g, ""))) {
    compliance -= 8;
    findings.push({ severity: "warning", field: "Title", title: "Possible all-caps phrase", detail: "The title contains a long all-caps token outside common specifications.", action: "Use normal title capitalization unless the term is an accepted abbreviation." });
  }

  if (input.title.length > input.titleLimit) {
    compliance -= 18;
    findings.push({ severity: "critical", field: "Title", title: `Title exceeds ${input.titleLimit} characters`, detail: `Current title length is ${input.title.length} characters.`, action: `Shorten the title by ${input.title.length - input.titleLimit} characters and keep the core product phrase near the front.` });
  } else if (input.title.length < Math.max(35, input.titleLimit * 0.55)) {
    findings.push({ severity: "opportunity", field: "Title", title: "Title may be underutilized", detail: `Only ${input.title.length} of ${input.titleLimit} available characters are used.`, action: "Add one high-intent differentiator or compatibility phrase without keyword stuffing." });
  }

  input.bullets.forEach((bullet, index) => {
    if (!bullet.trim()) {
      findings.push({ severity: "warning", field: `Bullet ${index + 1}`, title: "Missing bullet content", detail: "An empty bullet leaves a major decision question unanswered.", action: "Use this bullet for compatibility, benefit evidence, installation, use case, or specifications." });
    } else if (bullet.length > input.bulletLimit) {
      findings.push({ severity: "warning", field: `Bullet ${index + 1}`, title: `Bullet exceeds ${input.bulletLimit} characters`, detail: `Current length is ${bullet.length} characters.`, action: "Keep one customer question and one supporting proof point in this bullet." });
    }
  });

  const keywords = splitItems(input.targetKeywords).map((keyword) => {
    const normalized = clean(keyword);
    const title = clean(input.title).includes(normalized);
    const bullets = clean(input.bullets.join(" ")).includes(normalized);
    const searchTerms = clean(input.searchTerms).includes(normalized);
    return { keyword, title, bullets, searchTerms, covered: title || bullets || searchTerms };
  });

  const keywordCoverage = keywords.length ? keywords.filter((item) => item.covered).length / keywords.length : 0;
  const titleKeywordCoverage = keywords.length ? keywords.filter((item) => item.title).length / keywords.length : 0;
  let seo = Math.round(42 + keywordCoverage * 42 + Math.min(titleKeywordCoverage, 0.35) * 46);
  seo = Math.min(100, seo);

  keywords.filter((item) => !item.covered).slice(0, 5).forEach((item) => {
    findings.push({ severity: "opportunity", field: "Keywords", title: `Missing target phrase: “${item.keyword}”`, detail: "The exact target phrase is not present in the title, bullets, or search terms.", action: "Add it only where it reads naturally and matches the product." });
  });

  const searchTermTokens = clean(input.searchTerms).split(" ").filter(Boolean);
  const visibleTokens = new Set(clean([input.title, ...input.bullets].join(" ")).split(" "));
  const duplicatedBackend = searchTermTokens.filter((token) => token.length > 3 && visibleTokens.has(token));
  if (duplicatedBackend.length > 4) {
    findings.push({ severity: "opportunity", field: "Search Terms", title: "Backend space is repeating visible copy", detail: `${Array.from(new Set(duplicatedBackend)).slice(0, 6).join(", ")} already appear in visible fields.`, action: "Use backend space for relevant synonyms, alternate phrasing, abbreviations, and use cases not already covered." });
  }

  const scenarios = splitItems(input.scenarios);
  const scenarioCoverage = scenarios.length ? scenarios.filter((scenario) => normalizedFull.includes(clean(scenario))).length / scenarios.length : 0;
  const relevanceSignals = [containsAny(fullText, compatibilityTerms), containsAny(fullText, installTerms), containsAny(fullText, specTerms), scenarioCoverage >= 0.5];
  const relevance = Math.round(38 + relevanceSignals.filter(Boolean).length * 12 + scenarioCoverage * 14);

  if (!containsAny(fullText, compatibilityTerms)) findings.push({ severity: "opportunity", field: "Content", title: "Compatibility is not explicit", detail: "The copy does not clearly state what the product works with or fits.", action: "Name the compatible connector, size, range, or system and any important limitation." });
  if (!containsAny(fullText, installTerms)) findings.push({ severity: "opportunity", field: "Content", title: "Installation experience is missing", detail: "Customers cannot quickly tell how the product connects or disconnects.", action: "Add a short, accurate installation sequence and required-tool note." });
  if (scenarios.length && scenarioCoverage < 0.5) findings.push({ severity: "opportunity", field: "Use Cases", title: "Target scenarios are underrepresented", detail: `Only ${Math.round(scenarioCoverage * 100)}% of the planned scenarios appear in customer-facing copy.`, action: "Add the most credible two or three use cases to a benefit-led bullet." });

  const hasBenefit = containsAny(fullText, benefitTerms);
  const hasEvidence = containsAny(fullText, evidenceTerms) || /\d/.test(fullText);
  const persuasion = Math.min(100, 44 + (hasBenefit ? 22 : 0) + (hasEvidence ? 24 : 0) + (input.bullets.filter((bullet) => /:/.test(bullet)).length >= 3 ? 10 : 0));
  if (!hasBenefit || !hasEvidence) findings.push({ severity: "opportunity", field: "Persuasion", title: "Features need a clearer customer outcome", detail: "Strong bullets connect a feature to an outcome and then support it with a material, rating, measurement, or mechanism.", action: "Use the pattern: benefit → how it works → verifiable proof." });

  const readability = Math.round((scoreReadability(fullText) + (input.bullets.filter(Boolean).length / 5) * 100) / 2);
  const criticalCount = findings.filter((item) => item.severity === "critical").length;
  const weighted = Math.round(compliance * 0.3 + seo * 0.22 + relevance * 0.18 + persuasion * 0.18 + readability * 0.12);
  const overall = criticalCount ? Math.min(weighted, 69) : weighted;
  const gate = criticalCount ? "blocked" : findings.some((item) => item.severity === "warning") ? "review" : "clear";

  if (!criticalCount) findings.unshift({ severity: "pass", field: "Compliance", title: "No high-risk phrase detected", detail: "The rule-based scan found no obvious policy-sensitive phrase in the supplied copy.", action: "Continue with a human policy review before publishing; automated checks cannot guarantee compliance." });

  return {
    overall,
    gate,
    scores: { compliance: Math.max(0, compliance), seo, relevance: Math.min(100, relevance), persuasion, readability: Math.min(100, readability) },
    findings,
    keywords,
    summary: criticalCount
      ? `${criticalCount} compliance blocker${criticalCount > 1 ? "s" : ""} should be resolved before optimization.`
      : `No obvious blocker found. Focus next on ${Object.entries({ SEO: seo, relevance, persuasion, readability }).sort((a, b) => a[1] - b[1])[0][0].toLowerCase()}.`,
  };
}

export const demoListing: ListingInput = {
  marketplace: "Amazon US",
  category: "Solar Connectors",
  title: "12AWG Solar Y Branch Connectors, 2-to-1 Parallel Adapter, 1 Pair MFF/FMM",
  bullets: [
    "Y Branch Parallel Connectors: Includes one M/FF and one F/MM adapter to connect two compatible solar panels in parallel.",
    "Wide Compatibility: 12AWG tinned copper cable works with compatible 14–10AWG solar connector systems.",
    "IP68 Waterproof: Double sealing rings help block water and dust, reducing corrosion and extending service life.",
    "Plug and Play: Match the male and female ends, push until locked, and press both tabs to disconnect.",
    "Technical Specifications: 12.6in cable, 30A, DC1500V/AC1000V, -40°F to 221°F for RV, rooftop, boat, and off-grid systems.",
  ],
  description: "A compact parallel connection kit for expanding compatible solar arrays with less cable clutter.",
  searchTerms: "pv branch coupler photovoltaic panel splitter roof cabin marine power system",
  targetKeywords: "solar y branch connector, solar parallel adapter, 12awg solar cable, solar panel connectors, mff fmm",
  scenarios: "RV, rooftop, boat, cabin, off-grid",
  productFacts: "12AWG tinned copper; PPO housing; PVC jacket; IP68; TUV/CE; 30A; DC1500V; AC1000V; 12.6in",
  titleLimit: 75,
  bulletLimit: 200,
};
