"use client";

import { useMemo, useState } from "react";
import { analyzeKeywordMining, analyzeRankHistory, analyzeReviews, analyzeSalesHistory } from "@/lib/research-analysis";
import type { SellerSpriteKeyword, SellerSpriteRankPoint, SellerSpriteReview, SellerSpriteSalesPoint } from "@/lib/sellersprite-import";

type InsightTab = "reviews" | "trends" | "mining";
const number = (value: number) => new Intl.NumberFormat("zh-CN").format(Math.round(value || 0));

export default function ResearchInsights({ reviews, rankHistory, salesHistory, minedKeywords }: { reviews: SellerSpriteReview[]; rankHistory: SellerSpriteRankPoint[]; salesHistory: SellerSpriteSalesPoint[]; minedKeywords: SellerSpriteKeyword[] }) {
  const [tab, setTab] = useState<InsightTab>(reviews.length ? "reviews" : rankHistory.length || salesHistory.length ? "trends" : "mining");
  const review = useMemo(() => analyzeReviews(reviews), [reviews]);
  const ranks = useMemo(() => analyzeRankHistory(rankHistory), [rankHistory]);
  const sales = useMemo(() => analyzeSalesHistory(salesHistory), [salesHistory]);
  const mining = useMemo(() => analyzeKeywordMining(minedKeywords), [minedKeywords]);
  if (!reviews.length && !rankHistory.length && !salesHistory.length && !minedKeywords.length) return null;

  return <section className="research-card card">
    <div className="section-heading"><div><span className="eyebrow">深度调研模块</span><h2>评论、历史趋势与关键词机会</h2></div><div className="research-tabs">
      <button className={tab === "reviews" ? "active" : ""} disabled={!reviews.length} onClick={() => setTab("reviews")}>评论洞察 {reviews.length}</button>
      <button className={tab === "trends" ? "active" : ""} disabled={!rankHistory.length && !salesHistory.length} onClick={() => setTab("trends")}>趋势 {rankHistory.length + salesHistory.length}</button>
      <button className={tab === "mining" ? "active" : ""} disabled={!minedKeywords.length} onClick={() => setTab("mining")}>关键词挖掘 {minedKeywords.length}</button>
    </div></div>

    {tab === "reviews" && <div className="research-panel">
      <div className="research-metrics"><span><b>{review.count}</b>评论样本</span><span><b>{review.averageRating.toFixed(2)}</b>平均星级</span><span><b>{(review.verifiedShare * 100).toFixed(0)}%</b>VP 评论</span><span><b>{review.negativeCount}</b>三星及以下</span></div>
      <div className="review-layout"><div><h3>高频客户主题</h3><div className="theme-list">{review.themes.map((theme) => <div key={theme.id}><span>{theme.label}</span><i><em style={{ width: `${Math.max(4, theme.count / Math.max(1, review.count) * 100)}%` }} /></i><b>{theme.count} 次{theme.negativeCount ? ` · ${theme.negativeCount} 条负面` : ""}</b></div>)}</div></div><div><h3>优先阅读的低星评论</h3><div className="review-examples">{review.negativeExamples.length ? review.negativeExamples.map((item, index) => <article key={`${item.reviewUrl}-${index}`}><b>{"★".repeat(item.rating)}{"☆".repeat(Math.max(0, 5 - item.rating))} · {item.title || "无标题"}</b><p>{item.content}</p><small>{item.variation || "未记录变体"} · {item.reviewedAt || "未记录日期"}</small></article>) : <p className="empty-copy">当前样本没有三星及以下评论。</p>}</div></div></div>
    </div>}

    {tab === "trends" && <div className="research-panel trend-layout">
      <div><h3>销量历史</h3>{sales.latest ? <><div className="trend-hero"><b>{number(sales.latest.sales)}</b><span>{sales.latest.period} 月销量</span><em className={sales.growth >= 0 ? "up" : "down"}>{sales.growth >= 0 ? "+" : ""}{(sales.growth * 100).toFixed(1)}%</em></div><div className="mini-bars">{sales.monthly.slice(-18).map((point) => <span key={point.period} title={`${point.period}: ${point.sales}`}><i style={{ height: `${Math.max(4, point.sales / Math.max(...sales.monthly.map((item) => item.sales), 1) * 100)}%` }} /><small>{point.period.slice(2)}</small></span>)}</div></> : <p className="empty-copy">未导入月销量历史。</p>}</div>
      <div><h3>BSR 历史</h3><p className="range-note">{ranks.start && `${ranks.start} 至 ${ranks.end} · ${number(ranks.observations)} 个时间点`}</p><div className="rank-list">{ranks.series.map((item) => <article key={item.category}><b>{item.category}</b><span>最新 #{number(item.latest)}</span><small>最佳 #{number(item.best)} · 最低 #{number(item.worst)}</small></article>)}</div></div>
    </div>}

    {tab === "mining" && <div className="research-panel"><div className="research-metrics"><span><b>{number(mining.count)}</b>关键词</span><span><b>{number(mining.totalSearchVolume)}</b>月搜索量合计</span><span><b>{mining.opportunities[0]?.opportunityScore || 0}</b>最高机会分</span></div><div className="mining-table-wrap"><table className="keyword-data-table"><thead><tr><th>关键词</th><th>机会分</th><th>月搜索量</th><th>购买率</th><th>商品数</th><th>PPC</th></tr></thead><tbody>{mining.opportunities.slice(0, 100).map((item) => <tr key={item.keyword}><td><b>{item.keyword}</b><small>{item.translation}</small></td><td><strong className={`opportunity-score score-${item.opportunityScore >= 70 ? "high" : item.opportunityScore >= 45 ? "medium" : "low"}`}>{item.opportunityScore}</strong></td><td>{number(item.monthlySearchVolume)}</td><td>{(item.purchaseRate * 100).toFixed(2)}%</td><td>{number(item.products)}</td><td>{item.ppcPrice ? `$${item.ppcPrice.toFixed(2)}` : "—"}</td></tr>)}</tbody></table></div><p className="table-note">机会分基于搜索需求、购买率和商品竞争度计算，只用于排序候选词；与产品不相关的词必须人工排除。</p></div>}
  </section>;
}
