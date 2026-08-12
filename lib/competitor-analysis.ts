export type Competitor = {
  id: string;
  asin: string;
  brand: string;
  title: string;
  price: number;
  rating: number;
  reviews: number;
  monthlySales: number;
  bsr: number;
  imageUrl?: string;
  parentAsin?: string;
  category?: string;
  bullets?: string[];
  productUrl?: string;
  monthlyRevenue?: number;
  listedAt?: string;
  raw?: Record<string, unknown>;
};

export type CompetitorClass = "direct" | "adjacent" | "excluded";
export type TargetProfileId = "solar-y-branch" | "sae-quick-connect" | "custom";

export type CompetitorClassification = {
  kind: CompetitorClass;
  confidence: number;
  reasons: string[];
};

export type TargetProfile = {
  id: TargetProfileId;
  label: string;
  description: string;
};

export const targetProfiles: TargetProfile[] = [
  { id: "solar-y-branch", label: "太阳能 Y 型并联线", description: "Y Branch、2-to-1、4-to-1、MFF/FMM 等并联连接线" },
  { id: "sae-quick-connect", label: "SAE 快速连接线", description: "SAE Quick Disconnect、Extension Cable、单插连接线" },
  { id: "custom", label: "自定义分析对象", description: "按你填写的产品名称与关键词判断相关性" },
];

export type MarketAnalysis = {
  averagePrice: number;
  medianPrice: number;
  averageRating: number;
  medianReviews: number;
  monthlySales: number;
  monthlyRevenue: number;
  topThreeShare: number;
  entryBarrier: "Low" | "Medium" | "High";
  commonTerms: Array<{ term: string; count: number; share: number }>;
  gaps: string[];
  insights: Array<{ type: "risk" | "signal" | "opportunity"; title: string; detail: string }>;
};

const stopwords = new Set(["and","for","with","the","a","an","of","to","in","on","kit","pair","pcs","pack","connector","connectors","solar"]);

const median = (values: number[]) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const money = (value: number) => Math.round(value * 100) / 100;

const termsFrom = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g," ").split(" ").filter((term) => term.length > 2 && !stopwords.has(term) && !/^\d+$/.test(term));

const includesAny = (source: string, terms: string[]) => terms.some((term) => source.includes(term));

export function classifyCompetitor(row: Competitor, profileId: TargetProfileId, customTarget = ""): CompetitorClassification {
  const source = `${row.title} ${row.category || ""}`.toLowerCase().replace(/[_–—-]+/g, " ");
  const hardExclusions = ["solar panel kit", "solar panel charger", "charge controller", "battery maintainer", "diesel heater", "battery tender", "inverter", "mounting bracket"];
  if (includesAny(source, hardExclusions)) {
    return { kind: "excluded", confidence: 96, reasons: ["商品主体属于面板、电池、控制器或其他非连接线产品"] };
  }

  if (profileId === "solar-y-branch") {
    const solar = includesAny(source, ["solar", "photovoltaic", "pv "]);
    const parallel = includesAny(source, ["y branch", "y splitter", "parallel", "2 to 1", "2to1", "4 to 1", "4to1", "4 to 2", "4to2", "mff", "fmm"]);
    const connector = includesAny(source, ["connector", "adapter", "branch", "splitter"]);
    const wrongFamily = includesAny(source, ["sae extension", "sae quick", "xt60", "anderson", "cigarette lighter", "extension cord"]);
    if (solar && parallel && connector && !wrongFamily) return { kind: "direct", confidence: 94, reasons: ["同时匹配太阳能、并联拓扑和连接器结构"] };
    if ((solar && connector) || (parallel && connector)) return { kind: "adjacent", confidence: 78, reasons: ["属于太阳能连接配件，但结构或用途未完全匹配"] };
    return { kind: "excluded", confidence: wrongFamily ? 94 : 82, reasons: [wrongFamily ? "属于 SAE 或其他接口产品族" : "未匹配太阳能并联连接线的核心结构"] };
  }

  if (profileId === "sae-quick-connect") {
    const sae = /(^|\s)sae(\s|$)/.test(source);
    const cable = includesAny(source, ["cable", "wire", "cord", "connector", "plug", "pigtail"]);
    const quick = includesAny(source, ["quick disconnect", "quick connect", "extension", "single plug", "2 pin", "2pin"]);
    const wrongFamily = includesAny(source, ["y branch", "parallel connector", "mc4", "4 to 1", "4to1", "2 to 1", "2to1"]);
    if (sae && cable && quick && !wrongFamily) return { kind: "direct", confidence: 93, reasons: ["同时匹配 SAE 接口、线材和快速连接用途"] };
    if (sae && cable) return { kind: "adjacent", confidence: 76, reasons: ["属于 SAE 连接配件，但形态或用途需要人工确认"] };
    return { kind: "excluded", confidence: wrongFamily ? 95 : 84, reasons: [wrongFamily ? "属于太阳能并联接口产品族" : "未匹配 SAE 快速连接线的核心特征"] };
  }

  const targetTerms = Array.from(new Set(termsFrom(customTarget)));
  if (!targetTerms.length) return { kind: "adjacent", confidence: 40, reasons: ["尚未填写自定义分析对象，等待人工分类"] };
  const matched = targetTerms.filter((term) => source.includes(term));
  const ratio = matched.length / targetTerms.length;
  if (ratio >= .65) return { kind: "direct", confidence: Math.round(70 + ratio * 25), reasons: [`匹配 ${matched.length}/${targetTerms.length} 个目标特征词：${matched.slice(0, 4).join("、")}`] };
  if (ratio >= .3) return { kind: "adjacent", confidence: Math.round(55 + ratio * 30), reasons: [`部分匹配目标特征词：${matched.slice(0, 4).join("、")}`] };
  return { kind: "excluded", confidence: 80, reasons: ["与自定义分析对象的核心特征重合度较低"] };
}

export function analyzeMarket(rows: Competitor[], ownTitle: string): MarketAnalysis {
  const valid = rows.filter((row) => row.title.trim() || row.asin.trim());
  if (!valid.length) return { averagePrice:0, medianPrice:0, averageRating:0, medianReviews:0, monthlySales:0, monthlyRevenue:0, topThreeShare:0, entryBarrier:"Low", commonTerms:[], gaps:[], insights:[] };
  const prices = valid.map((row) => Number(row.price) || 0).filter(Boolean);
  const ratings = valid.map((row) => Number(row.rating) || 0).filter(Boolean);
  const reviews = valid.map((row) => Number(row.reviews) || 0).filter((value) => value >= 0);
  const sales = valid.reduce((sum,row) => sum + (Number(row.monthlySales) || 0),0);
  const revenue = valid.reduce((sum,row) => sum + (Number(row.monthlySales) || 0) * (Number(row.price) || 0),0);
  const topSales = [...valid].sort((a,b) => b.monthlySales - a.monthlySales).slice(0,3).reduce((sum,row) => sum + row.monthlySales,0);
  const counts = new Map<string,number>();
  valid.forEach((row) => Array.from(new Set(termsFrom(row.title))).forEach((term) => counts.set(term,(counts.get(term) || 0) + 1)));
  const commonTerms = Array.from(counts.entries()).map(([term,count]) => ({term,count,share:Math.round(count / valid.length * 100)})).sort((a,b) => b.count - a.count || a.term.localeCompare(b.term)).slice(0,12);
  const ownTerms = new Set(termsFrom(ownTitle));
  const gaps = commonTerms.filter((item) => item.count >= Math.max(2,Math.ceil(valid.length * .35)) && !ownTerms.has(item.term)).map((item) => item.term);
  const avgRating = ratings.length ? ratings.reduce((a,b) => a + b,0) / ratings.length : 0;
  const medReviews = median(reviews);
  const concentration = sales ? topSales / sales * 100 : 0;
  const entryPoints = (avgRating >= 4.5 ? 1 : 0) + (medReviews >= 500 ? 1 : 0) + (concentration >= 65 ? 1 : 0);
  const entryBarrier = entryPoints >= 3 ? "High" : entryPoints >= 1 ? "Medium" : "Low";
  const insights: MarketAnalysis["insights"] = [];
  if (concentration >= 65) insights.push({type:"risk",title:"头部销量集中",detail:`前三个样本贡献约 ${Math.round(concentration)}% 的样本销量，新品需要更清晰的差异点。`});
  else insights.push({type:"signal",title:"市场相对分散",detail:`前三个样本约占 ${Math.round(concentration)}% 销量，流量并未完全被少数链接垄断。`});
  if (medReviews >= 500) insights.push({type:"risk",title:"评价门槛较高",detail:`样本评价中位数为 ${Math.round(medReviews)}，新品早期应降低直接硬碰头部词的比例。`});
  else insights.push({type:"opportunity",title:"评价壁垒可进入",detail:`样本评价中位数为 ${Math.round(medReviews)}，仍有低评价链接获得销量。`});
  if (gaps.length) insights.push({type:"opportunity",title:"发现标题关键词缺口",detail:`高频但自有标题未覆盖：${gaps.slice(0,5).join("、")}。先核实相关性再决定埋词。`});
  if (prices.length && Math.max(...prices) / Math.max(1,Math.min(...prices)) > 1.45) insights.push({type:"signal",title:"价格带存在分层",detail:`样本从 $${Math.min(...prices).toFixed(2)} 到 $${Math.max(...prices).toFixed(2)}，可按线规、长度、数量或认证拆分价值层级。`});
  return {
    averagePrice: money(prices.length ? prices.reduce((a,b) => a + b,0) / prices.length : 0),
    medianPrice: money(median(prices)),
    averageRating: Math.round(avgRating * 100) / 100,
    medianReviews: Math.round(medReviews),
    monthlySales: sales,
    monthlyRevenue: money(revenue),
    topThreeShare: Math.round(concentration),
    entryBarrier,
    commonTerms,
    gaps,
    insights,
  };
}

export const demoCompetitors: Competitor[] = [
  { id:"c1",asin:"B01M7RQBTL",brand:"EcoLink",title:"Solar Y Branch Connector 2 to 1 Parallel Adapter Cable 12AWG Waterproof",price:13.99,rating:4.6,reviews:1820,monthlySales:860,bsr:46 },
  { id:"c2",asin:"B0753X68PS",brand:"SunPort",title:"12AWG Solar Panel Y Connector Cable MFF FMM Parallel Branch Pair",price:15.99,rating:4.7,reviews:947,monthlySales:630,bsr:72 },
  { id:"c3",asin:"B0CQX9F4BK",brand:"PV Works",title:"Solar Y Splitter Cable 2 to 1 IP68 Tinned Copper Parallel Adapter",price:11.99,rating:4.4,reviews:236,monthlySales:410,bsr:118 },
  { id:"c4",asin:"B0DRC1TKD2",brand:"GridMate",title:"Solar Branch Connector Cable 12 Gauge 30A Waterproof for RV Roof",price:16.99,rating:4.5,reviews:89,monthlySales:265,bsr:183 },
  { id:"c5",asin:"B0G1NCLD89",brand:"VoltPath",title:"2 to 1 Solar Parallel Connector Kit 12AWG for RV Boat Off Grid",price:12.49,rating:4.3,reviews:41,monthlySales:190,bsr:251 },
  { id:"c6",asin:"B0CJ9DND29",brand:"RayLine",title:"Solar Y Branch Extension Cable Red Black 12AWG Panel Adapter",price:18.99,rating:4.6,reviews:318,monthlySales:155,bsr:316 },
];
