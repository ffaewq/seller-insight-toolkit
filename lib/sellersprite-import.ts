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

export type SellerSpriteImport = {
  fileName: string;
  kind: "products" | "keywords" | "unknown";
  sheetName: string;
  sourceAsin: string | null;
  products: Competitor[];
  keywords: SellerSpriteKeyword[];
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
  return rows.filter((row) => text(row["流量词"])).map((row) => ({
    keyword: text(row["流量词"]).toLowerCase(),
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

export function parseSellerSpriteWorkbook(buffer: ArrayBuffer, fileName: string): SellerSpriteImport {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const warnings: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    if (/^(Brands|Sellers|Unique Words|Note)$/i.test(sheetName)) continue;
    const sheet = workbook.Sheets[sheetName];
    const headers = (XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, range: 0, blankrows: false })[0] || []).map(text);
    const rows = rowsFromSheet(sheet);
    if (headers.includes("ASIN") && headers.includes("商品标题")) {
      const products = productRows(rows, fileName);
      if (!products.length) warnings.push("识别到产品表头，但没有有效 ASIN 行。");
      return { fileName, kind: "products", sheetName, sourceAsin: null, products, keywords: [], warnings };
    }
    if (headers.includes("流量词") && headers.includes("自然排名")) {
      const match = sheetName.match(/(B[A-Z0-9]{9})/i);
      const keywords = keywordRows(rows);
      if (!match) warnings.push("关键词表未在工作表名称中找到来源 ASIN，导入时需要手工选择对应竞品。");
      return { fileName, kind: "keywords", sheetName, sourceAsin: match?.[1].toUpperCase() || null, products: [], keywords, warnings };
    }
  }
  return { fileName, kind: "unknown", sheetName: workbook.SheetNames[0] || "", sourceAsin: null, products: [], keywords: [], warnings: ["没有识别到卖家精灵产品或关键词表头。"] };
}
