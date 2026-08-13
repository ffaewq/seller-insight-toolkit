import * as XLSX from "xlsx";
import type { Competitor } from "@/lib/competitor-analysis";

export type SellerSpriteKeyword = {
  keyword: string;
  translation: string;
  trafficShare: number;
  weeklyImpressions: number;
  keywordType: string;
  trafficType: string;
  organicRank: number | null;
  adRank: number | null;
  abaRank: number | null;
  monthlySearchVolume: number;
  purchases: number;
  purchaseRate: number;
  impressions: number;
  clicks: number;
  products: number;
  supplyDemandRatio: number;
  adCompetitors: number;
  ppcPrice: number;
  bidRange: string;
  topAsins: string[];
  raw: Record<string, unknown>;
};

export type SellerSpriteReview = {
  asin: string;
  title: string;
  content: string;
  verifiedPurchase: boolean;
  vine: boolean;
  variation: string;
  rating: number;
  helpfulVotes: number;
  imageUrls: string[];
  hasVideo: boolean;
  videoUrls: string[];
  reviewUrl: string;
  reviewer: string;
  country: string;
  reviewedAt: string;
  raw: Record<string, unknown>;
};

export type SellerSpriteRankPoint = {
  observedAt: string;
  ranks: Record<string, number | null>;
  raw: Record<string, unknown>;
};

export type SellerSpriteSalesPoint = {
  period: string;
  sales: number;
  revenue: number;
  granularity: "month" | "year";
  raw: Record<string, unknown>;
};

export type SellerSpriteImport = {
  fileName: string;
  kind: "products" | "keywords" | "keyword_mining" | "reviews" | "bsr_history" | "sales_history" | "unknown";
  sheetName: string;
  sourceAsin: string | null;
  products: Competitor[];
  keywords: SellerSpriteKeyword[];
  reviews: SellerSpriteReview[];
  rankHistory: SellerSpriteRankPoint[];
  salesHistory: SellerSpriteSalesPoint[];
  warnings: string[];
};

const text = (value: unknown) => String(value ?? "").trim();

const numberValue = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const source = text(value);
  if (!source) return 0;
  const isPercent = source.endsWith("%");
  const parsed = Number(source.replace(/[$,%\s]/g, ""));
  if (!Number.isFinite(parsed)) return 0;
  return isPercent ? parsed / 100 : parsed;
};

const nullableRank = (value: unknown) => {
  const source = text(value);
  if (!source || source.includes("无排名")) return null;
  const match = source.match(/\d+/);
  return match ? Number(match[0]) : null;
};

const isoDate = (value: unknown) => {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString().slice(0, 10);
  return text(value);
};

const splitBullets = (value: unknown) => text(value).split(/\r?\n/).map((item) => item.trim()).filter(Boolean);

function rowsFromSheet(sheet: XLSX.WorkSheet) {
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null, raw: true });
}

function productRows(rows: Record<string, unknown>[], fileName: string): Competitor[] {
  return rows.filter((row) => /^B[A-Z0-9]{9}$/i.test(text(row["ASIN"]))).map((row, index) => ({
    id: `${fileName}-product-${index}`,
    asin: text(row["ASIN"]).toUpperCase(),
    parentAsin: text(row["父ASIN"]).toUpperCase(),
    brand: text(row["品牌"]),
    title: text(row["商品标题"]),
    bullets: splitBullets(row["产品卖点"]),
    imageUrl: text(row["商品主图"]),
    productUrl: text(row["商品详情页链接"]),
    category: text(row["小类目"] || row["大类目"]),
    price: numberValue(row["价格($)"]),
    rating: numberValue(row["评分"]),
    reviews: numberValue(row["评分数"]),
    monthlySales: numberValue(row["月销量"]),
    monthlyRevenue: numberValue(row["月销售额($)"]),
    bsr: numberValue(row["小类BSR"] || row["大类BSR"]),
    listedAt: isoDate(row["上架时间"]),
    raw: row,
  }));
}

function keywordRows(rows: Record<string, unknown>[]): SellerSpriteKeyword[] {
  return rows.filter((row) => text(row["流量词"] || row["关键词"])).map((row) => ({
    keyword: text(row["流量词"] || row["关键词"]).toLowerCase(),
    translation: text(row["关键词翻译"]),
    trafficShare: numberValue(row["流量占比"]),
    weeklyImpressions: numberValue(row["预估周曝光量"]),
    keywordType: text(row["关键词类型"]),
    trafficType: text(row["流量词类型"]),
    organicRank: nullableRank(row["自然排名"]),
    adRank: nullableRank(row["广告排名"]),
    abaRank: nullableRank(row["ABA周排名"]),
    monthlySearchVolume: numberValue(row["月搜索量"]),
    purchases: numberValue(row["购买量"]),
    purchaseRate: numberValue(row["购买率"]),
    impressions: numberValue(row["展示量"]),
    clicks: numberValue(row["点击量"]),
    products: numberValue(row["商品数"]),
    supplyDemandRatio: numberValue(row["需供比"]),
    adCompetitors: numberValue(row["广告竞品数"]),
    ppcPrice: numberValue(row["PPC价格"]),
    bidRange: text(row["建议竞价范围"]),
    topAsins: text(row["前十ASIN"]).split(",").map((asin) => asin.trim().toUpperCase()).filter(Boolean),
    raw: row,
  }));
}

function reviewRows(rows: Record<string, unknown>[]): SellerSpriteReview[] {
  const splitUrls = (value: unknown) => text(value).split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
  return rows.filter((row) => text(row["ASIN"]) && (text(row["标题"]) || text(row["内容"]))).map((row) => ({
    asin: text(row["ASIN"]).toUpperCase(), title: text(row["标题"]), content: text(row["内容"]),
    verifiedPurchase: text(row["VP评论"]).toUpperCase() === "Y", vine: Boolean(text(row["Vine Voice评论"])),
    variation: text(row["型号"]), rating: numberValue(row["星级"]), helpfulVotes: numberValue(row["赞同数"]),
    imageUrls: splitUrls(row["图片地址"]), hasVideo: Boolean(text(row["是否有视频"])), videoUrls: splitUrls(row["视频地址"]),
    reviewUrl: text(row["评论链接"]), reviewer: text(row["评论人"]), country: text(row["所属国家"]),
    reviewedAt: isoDate(row["评论时间"]), raw: row,
  }));
}

function rankRows(rows: Record<string, unknown>[], headers: string[]): SellerSpriteRankPoint[] {
  const rankHeaders = headers.filter((header) => header.startsWith("BSR排名["));
  return rows.filter((row) => text(row["时间"])).map((row) => ({
    observedAt: isoDate(row["时间"]),
    ranks: Object.fromEntries(rankHeaders.map((header) => [header.slice(6, -1), text(row[header]) ? numberValue(row[header]) : null])),
    raw: row,
  }));
}

function salesRows(rows: Record<string, unknown>[], granularity: "month" | "year"): SellerSpriteSalesPoint[] {
  const periodHeader = granularity === "month" ? "月份" : "年份";
  return rows.filter((row) => text(row[periodHeader])).map((row) => ({
    period: text(row[periodHeader]), sales: numberValue(row["销量"]), revenue: numberValue(row["销售额($)"]), granularity, raw: row,
  }));
}

export function parseSellerSpriteWorkbook(buffer: ArrayBuffer, fileName: string): SellerSpriteImport {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const warnings: string[] = [];
  const empty = { products: [] as Competitor[], keywords: [] as SellerSpriteKeyword[], reviews: [] as SellerSpriteReview[], rankHistory: [] as SellerSpriteRankPoint[], salesHistory: [] as SellerSpriteSalesPoint[] };
  for (const sheetName of workbook.SheetNames) {
    if (/^(Brands|Sellers|Unique Words|Note)$/i.test(sheetName)) continue;
    const sheet = workbook.Sheets[sheetName];
    const headers = (XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, range: 0, blankrows: false })[0] || []).map(text);
    const rows = rowsFromSheet(sheet);
    if (headers.includes("ASIN") && headers.includes("商品标题")) {
      const products = productRows(rows, fileName);
      if (!products.length) warnings.push("识别到产品表头，但没有有效 ASIN 行。");
      return { fileName, kind: "products", sheetName, sourceAsin: null, ...empty, products, warnings };
    }
    if (headers.includes("流量词") && headers.includes("自然排名")) {
      const match = sheetName.match(/(B[A-Z0-9]{9})/i);
      const keywords = keywordRows(rows);
      if (!match) warnings.push("关键词表未在工作表名称中找到来源 ASIN，导入时需要手工选择对应竞品。");
      return { fileName, kind: "keywords", sheetName, sourceAsin: match?.[1].toUpperCase() || null, ...empty, keywords, warnings };
    }
    if (headers.includes("关键词") && headers.includes("月搜索量")) {
      return { fileName, kind: "keyword_mining", sheetName, sourceAsin: null, ...empty, keywords: keywordRows(rows), warnings };
    }
    if (headers.includes("ASIN") && headers.includes("内容") && headers.includes("星级")) {
      const match = sheetName.match(/(B[A-Z0-9]{9})/i);
      return { fileName, kind: "reviews", sheetName, sourceAsin: match?.[1].toUpperCase() || text(rows[0]?.["ASIN"]).toUpperCase() || null, ...empty, reviews: reviewRows(rows), warnings };
    }
    if (headers.includes("时间") && headers.some((header) => header.startsWith("BSR排名["))) {
      const match = sheetName.match(/(B[A-Z0-9]{9})/i);
      return { fileName, kind: "bsr_history", sheetName, sourceAsin: match?.[1].toUpperCase() || null, ...empty, rankHistory: rankRows(rows, headers), warnings };
    }
    if (headers.includes("月份") && headers.includes("销量") && headers.includes("销售额($)")) {
      const match = sheetName.match(/(B[A-Z0-9]{9})/i);
      const monthly = salesRows(rows, "month");
      const yearSheetName = workbook.SheetNames.find((name) => name.includes("年数据"));
      const yearly = yearSheetName ? salesRows(rowsFromSheet(workbook.Sheets[yearSheetName]), "year") : [];
      return { fileName, kind: "sales_history", sheetName, sourceAsin: match?.[1].toUpperCase() || null, ...empty, salesHistory: [...monthly, ...yearly], warnings };
    }
  }
  return { fileName, kind: "unknown", sheetName: workbook.SheetNames[0] || "", sourceAsin: null, ...empty, warnings: ["没有识别到支持的卖家精灵表头。"] };
}
