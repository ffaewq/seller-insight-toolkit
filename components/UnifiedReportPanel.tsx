"use client";

import { useMemo, useState } from "react";
import { analyzeMarket, classifyCompetitor, type Competitor, type CompetitorClass, type TargetProfileId } from "@/lib/competitor-analysis";
import { analyzeKeywordMining, analyzeRankHistory, analyzeReviews, analyzeSalesHistory } from "@/lib/research-analysis";
import type { AuditResult, ListingInput } from "@/lib/listing-analysis";
import type { SellerSpriteKeyword, SellerSpriteRankPoint, SellerSpriteReview, SellerSpriteSalesPoint } from "@/lib/sellersprite-import";
import { useWorkspace } from "@/components/WorkspaceProvider";

type ResearchPayload = {
  savedAt?: string; rows?: Competitor[]; profileId?: TargetProfileId; customTarget?: string; analysisScope?: "direct" | "direct-adjacent"; manualClasses?: Record<string, CompetitorClass>;
  importState?: { keywords?: SellerSpriteKeyword[]; minedKeywords?: SellerSpriteKeyword[]; reviews?: SellerSpriteReview[]; rankHistory?: SellerSpriteRankPoint[]; salesHistory?: SellerSpriteSalesPoint[] };
};
const severity = { critical: "必须修改", warning: "需要复核", opportunity: "优化机会", pass: "已通过" };
const num = (value: number) => new Intl.NumberFormat("zh-CN").format(Math.round(value || 0));

export default function UnifiedReportPanel({ listing, result }: { listing: ListingInput; result: AuditResult }) {
  const { projectId, loadWorkspace } = useWorkspace();
  const [market, setMarket] = useState<ResearchPayload | null>(null);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const computed = useMemo(() => {
    if (!market) return null;
    const rows = market.rows || [];
    const validRows = rows.filter((row) => { const automatic = classifyCompetitor(row, market.profileId || "custom", market.customTarget || listing.title); const kind = market.manualClasses?.[row.id] || automatic.kind; return kind === "direct" || (market.analysisScope === "direct-adjacent" && kind === "adjacent"); });
    const imports = market.importState || {};
    return { rows, validRows, marketAnalysis: analyzeMarket(validRows, listing.title), review: analyzeReviews(imports.reviews || []), ranks: analyzeRankHistory(imports.rankHistory || []), sales: analyzeSalesHistory(imports.salesHistory || []), mining: analyzeKeywordMining(imports.minedKeywords || []), trafficKeywords: imports.keywords || [] };
  }, [market, listing.title]);
  const report = useMemo(() => {
    const findings = result.findings.map((item, index) => `${index + 1}. [${severity[item.severity]}] ${item.field} — ${item.title}\n   - ${item.detail}\n   - 建议：${item.action}`).join("\n");
    const base = `# Seller Insight 综合电商调研报告\n\n- 生成时间：${new Date().toLocaleString("zh-CN")}\n- 平台：${listing.marketplace}\n- 类目配置：${listing.category}\n- Listing 总分：${result.overall}/100\n- 合规状态：${result.gate}\n\n## Listing 检查\n\n### 标题\n${listing.title}\n\n### 五点\n${listing.bullets.map((item, index) => `${index + 1}. ${item}`).join("\n")}\n\n### 诊断结果\n${findings}`;
    if (!computed) return `${base}\n\n## 市场研究\n尚未载入云端竞品研究数据。`;
    const a = computed.marketAnalysis, latest = computed.sales.latest;
    const terms = a.commonTerms.map((item) => `${item.term} (${item.share}%)`).join("、") || "无";
    const themes = computed.review.themes.slice(0, 8).map((item) => `${item.label}：${item.count} 次${item.negativeCount ? `，其中负面 ${item.negativeCount} 条` : ""}`).join("\n- ") || "无评论主题数据";
    const ranks = computed.ranks.series.map((item) => `${item.category}：最新 #${num(item.latest)}，最佳 #${num(item.best)}`).join("\n- ") || "无 BSR 历史";
    const opportunities = computed.mining.opportunities.slice(0, 20).map((item) => `${item.keyword}｜机会分 ${item.opportunityScore}｜月搜索量 ${num(item.monthlySearchVolume)}｜购买率 ${(item.purchaseRate * 100).toFixed(2)}%`).join("\n") || "无关键词挖掘数据";
    return `${base}\n\n## 市场样本与边界\n- 原始产品：${computed.rows.length}\n- 有效竞品：${computed.validRows.length}\n- 反查关键词：${computed.trafficKeywords.length}\n- 评论样本：${computed.review.count}\n- BSR 时间点：${computed.ranks.observations}\n- 销量历史：${computed.sales.monthly.length} 个月\n- 数据说明：第三方销量、销售额和流量均为估算，仅代表导入样本与采集窗口。\n\n## 市场结构\n- 价格中位数：$${a.medianPrice.toFixed(2)}\n- 平均价格：$${a.averagePrice.toFixed(2)}\n- 样本月销量：${num(a.monthlySales)}\n- 样本月销售额：$${num(a.monthlyRevenue)}\n- 评价中位数：${num(a.medianReviews)}\n- 平均评分：${a.averageRating.toFixed(2)}\n- Top 3 销量占比：${a.topThreeShare}%\n- 进入难度：${a.entryBarrier}\n- 标题共同词：${terms}\n\n## 评论洞察\n- 平均星级：${computed.review.averageRating.toFixed(2)}\n- 三星及以下：${computed.review.negativeCount}\n- VP 评论占比：${(computed.review.verifiedShare * 100).toFixed(0)}%\n- ${themes}\n\n## 销量与 BSR 趋势\n- 最新月份：${latest ? `${latest.period}，销量 ${num(latest.sales)}，销售额 $${num(latest.revenue)}` : "无"}\n- 环比：${latest ? `${computed.sales.growth >= 0 ? "+" : ""}${(computed.sales.growth * 100).toFixed(1)}%` : "无"}\n- ${ranks}\n\n## 关键词机会 Top 20\n${opportunities}\n\n## 下一步复核\n1. 人工确认直接竞品分类，排除跨类目和不同结构产品。\n2. 逐条核对高机会词与产品相关性，不因搜索量高就强行埋词。\n3. 阅读高赞低星评论，确认问题是否能由本品规格或图片证据解决。\n4. 保存采集日期，后续使用相同口径更新销量、BSR 与价格。`;
  }, [computed, listing, result]);
  const download = (content: string, name: string, type: string) => { const url = URL.createObjectURL(new Blob([content], { type })); const link = document.createElement("a"); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url); };
  const load = async () => { setMessage("正在读取云端项目…"); const payload = await loadWorkspace() as ResearchPayload | null; setMarket(payload); setMessage(payload ? "已载入市场数据" : "该项目没有已保存的竞品数据"); };
  return <div className="report-page"><section className="report-hero card"><div><span className="eyebrow">综合调研报告</span><h2>把 Listing、竞品、关键词、评论与趋势放进同一份报告</h2><p>报告明确区分原始样本、计算指标和后续判断，适合复盘、协作和保存历史版本。</p></div><div className="report-load"><button className="primary-button" disabled={!projectId} onClick={load}>载入当前项目数据</button><small>{message || (projectId ? "读取最近一次云端保存" : "请先选择项目")}</small></div></section>{computed && <section className="report-market-grid"><article className="card"><span>有效竞品</span><b>{computed.validRows.length}</b><small>原始 {computed.rows.length} 个</small></article><article className="card"><span>评论样本</span><b>{computed.review.count}</b><small>{computed.review.negativeCount} 条低星</small></article><article className="card"><span>关键词</span><b>{computed.trafficKeywords.length + computed.mining.count}</b><small>反查 + 挖掘</small></article><article className="card"><span>历史数据</span><b>{computed.ranks.observations + computed.sales.monthly.length}</b><small>BSR 点 + 月份</small></article></section>}<section className="export-grid"><article className="export-card card"><span className="file-type">MD</span><h3>综合调研报告</h3><p>包含 Listing、市场、评论、关键词与趋势结论。</p><button className="primary-button" onClick={() => download(report, "seller-insight-full-report.md", "text/markdown")}>下载 Markdown</button></article><article className="export-card card"><span className="file-type json">JSON</span><h3>结构化项目数据</h3><p>保留确定性检查和市场计算结果，方便二次处理。</p><button className="primary-button" onClick={() => download(JSON.stringify({ listing, listingAudit: result, market: computed }, null, 2), "seller-insight-full-data.json", "application/json")}>下载 JSON</button></article><article className="export-card card"><span className="file-type copy">TXT</span><h3>复制完整报告</h3><p>用于聊天、邮件、Notion 或工作任务。</p><button className="ghost-button report-copy" onClick={async () => { await navigator.clipboard.writeText(report); setCopied(true); window.setTimeout(() => setCopied(false), 1600); }}>{copied ? "已复制" : "复制到剪贴板"}</button></article></section><section className="report-preview card"><div className="section-heading"><div><span className="eyebrow">报告预览</span><h2>{listing.title || "未命名产品"}</h2></div><span className={`report-gate gate-label-${result.gate}`}>{result.gate === "blocked" ? "存在合规阻断" : result.gate === "review" ? "建议人工复核" : "基础检查通过"}</span></div><pre>{report}</pre></section></div>;
}
