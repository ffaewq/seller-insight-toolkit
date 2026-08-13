"use client";

import { useEffect, useMemo, useState } from "react";
import { auditListing, demoListing, type AuditResult, type Finding, type ListingInput, type Severity } from "@/lib/listing-analysis";
import CompetitorLab from "@/components/CompetitorLab";
import AIAnalysisPanel from "@/components/AIAnalysisPanel";
import AuthProvider, { useAuth } from "@/components/AuthProvider";
import ProjectSwitcher from "@/components/ProjectSwitcher";
import WorkspaceProvider from "@/components/WorkspaceProvider";
import UnifiedReportPanel from "@/components/UnifiedReportPanel";

type WorkspaceTab = "audit" | "competitors" | "ai" | "reports";

const scoreLabels = {
  compliance: "合规安全",
  seo: "关键词与 SEO",
  relevance: "类目相关性",
  persuasion: "说服力",
  readability: "可读性",
};

const severityLabels: Record<Severity, string> = {
  critical: "必须修改",
  warning: "需要复核",
  opportunity: "优化机会",
  pass: "已通过",
};

function ScoreRing({ value }: { value: number }) {
  return (
    <div className="score-ring" style={{ "--score": `${value * 3.6}deg` } as React.CSSProperties}>
      <div><strong>{value}</strong><span>/100</span></div>
    </div>
  );
}

function MiniScore({ label, value }: { label: string; value: number }) {
  return (
    <div className="mini-score">
      <div className="mini-score-label"><span>{label}</span><strong>{value}</strong></div>
      <div className="meter"><span style={{ width: `${value}%` }} /></div>
    </div>
  );
}

function FindingCard({ finding }: { finding: Finding }) {
  return (
    <article className={`finding finding-${finding.severity}`}>
      <div className="finding-icon">{finding.severity === "critical" ? "!" : finding.severity === "warning" ? "△" : finding.severity === "pass" ? "✓" : "↗"}</div>
      <div>
        <div className="finding-meta"><span>{severityLabels[finding.severity]}</span><small>{finding.field}</small></div>
        <h4>{finding.title}</h4>
        <p>{finding.detail}</p>
        <div className="action-line"><b>建议</b>{finding.action}</div>
      </div>
    </article>
  );
}

function ListingEditor({ value, onChange, onAnalyze }: { value: ListingInput; onChange: (next: ListingInput) => void; onAnalyze: () => void }) {
  const set = <K extends keyof ListingInput>(key: K, next: ListingInput[K]) => onChange({ ...value, [key]: next });
  return (
    <section className="editor-panel card">
      <div className="section-heading">
        <div><span className="eyebrow">Listing 输入</span><h2>先录入事实，再分析文案</h2></div>
        <button className="text-button" onClick={() => onChange(demoListing)}>载入太阳能示例</button>
      </div>

      <div className="two-col compact-fields">
        <label>站点<select value={value.marketplace} onChange={(e) => set("marketplace", e.target.value)}><option>Amazon US</option><option>Amazon UK</option><option>Amazon DE</option><option>Other Marketplace</option></select></label>
        <label>类目规则<select value={value.category} onChange={(e) => set("category", e.target.value)}><option>Solar Connectors</option><option>Generic Electronics</option><option>Home & Garden</option><option>Custom</option></select></label>
      </div>

      <label className="field-label">标题 <span>{value.title.length}/{value.titleLimit}</span>
        <textarea className="title-input" value={value.title} onChange={(e) => set("title", e.target.value)} placeholder="输入商品标题" rows={3} />
      </label>

      <div className="bullet-block">
        <div className="label-row"><span>五点描述</span><small>建议每点回答一个购买问题</small></div>
        {value.bullets.map((bullet, index) => (
          <label className="bullet-field" key={index}><b>{index + 1}</b><textarea value={bullet} onChange={(e) => { const bullets = [...value.bullets]; bullets[index] = e.target.value; set("bullets", bullets); }} rows={3} placeholder={`Bullet ${index + 1}`} /><span>{bullet.length}</span></label>
        ))}
      </div>

      <details className="advanced-fields" open>
        <summary>关键词、场景与事实依据</summary>
        <div className="two-col">
          <label>目标关键词<textarea value={value.targetKeywords} onChange={(e) => set("targetKeywords", e.target.value)} rows={4} placeholder="逗号或换行分隔" /></label>
          <label>后台 Search Terms<textarea value={value.searchTerms} onChange={(e) => set("searchTerms", e.target.value)} rows={4} /></label>
          <label>目标使用场景<textarea value={value.scenarios} onChange={(e) => set("scenarios", e.target.value)} rows={3} placeholder="RV, rooftop, boat..." /></label>
          <label>已确认的产品事实<textarea value={value.productFacts} onChange={(e) => set("productFacts", e.target.value)} rows={3} placeholder="只填写可验证规格" /></label>
        </div>
        <label>产品描述<textarea value={value.description} onChange={(e) => set("description", e.target.value)} rows={4} /></label>
        <div className="two-col compact-fields limits">
          <label>标题字符上限<input type="number" value={value.titleLimit} onChange={(e) => set("titleLimit", Number(e.target.value) || 75)} /></label>
          <label>单条五点字符上限<input type="number" value={value.bulletLimit} onChange={(e) => set("bulletLimit", Number(e.target.value) || 200)} /></label>
        </div>
      </details>

      <button className="primary-button analyze-button" onClick={onAnalyze}><span>运行完整检查</span><small>合规 → 关键词 → 类目 → 转化</small></button>
    </section>
  );
}

function AuditResults({ result, filter, setFilter }: { result: AuditResult; filter: Severity | "all"; setFilter: (value: Severity | "all") => void }) {
  const filtered = filter === "all" ? result.findings : result.findings.filter((item) => item.severity === filter);
  const blockerCount = result.findings.filter((item) => item.severity === "critical").length;
  const warningCount = result.findings.filter((item) => item.severity === "warning").length;
  const opportunityCount = result.findings.filter((item) => item.severity === "opportunity").length;
  return (
    <section className="results-panel">
      <div className={`gate-banner gate-${result.gate}`}>
        <div className="gate-icon">{result.gate === "blocked" ? "!" : result.gate === "review" ? "△" : "✓"}</div>
        <div><b>{result.gate === "blocked" ? "暂不建议发布" : result.gate === "review" ? "通过基础合规，建议复核" : "未发现明显阻断项"}</b><span>{result.summary}</span></div>
      </div>

      <div className="score-card card">
        <div className="score-overview"><ScoreRing value={result.overall} /><div><span className="eyebrow">Listing 健康度</span><h2>{result.overall >= 85 ? "基础扎实" : result.overall >= 70 ? "具备竞争力" : "仍有明显缺口"}</h2><p>合规项会限制总分，避免高风险文案被漂亮的 SEO 分数掩盖。</p></div></div>
        <div className="score-grid">
          {(Object.keys(result.scores) as Array<keyof typeof result.scores>).map((key) => <MiniScore key={key} label={scoreLabels[key]} value={result.scores[key]} />)}
        </div>
      </div>

      <div className="finding-card card">
        <div className="section-heading findings-title"><div><span className="eyebrow">诊断清单</span><h2>按风险顺序处理</h2></div><div className="issue-totals"><span className="red-dot">{blockerCount} 阻断</span><span className="amber-dot">{warningCount} 复核</span><span className="blue-dot">{opportunityCount} 机会</span></div></div>
        <div className="filter-row">
          {(["all", "critical", "warning", "opportunity", "pass"] as const).map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item === "all" ? "全部" : severityLabels[item]}</button>)}
        </div>
        <div className="finding-list">{filtered.map((finding, index) => <FindingCard finding={finding} key={`${finding.title}-${index}`} />)}</div>
      </div>

      <div className="keyword-card card">
        <div className="section-heading"><div><span className="eyebrow">关键词覆盖</span><h2>埋词位置不是越多越好</h2></div><span className="privacy-pill">本地分析</span></div>
        {result.keywords.length ? <div className="keyword-table"><div className="keyword-row header"><span>目标词</span><span>标题</span><span>五点</span><span>ST</span><span>状态</span></div>{result.keywords.map((keyword) => <div className="keyword-row" key={keyword.keyword}><b>{keyword.keyword}</b><span>{keyword.title ? "✓" : "—"}</span><span>{keyword.bullets ? "✓" : "—"}</span><span>{keyword.searchTerms ? "✓" : "—"}</span><span className={keyword.covered ? "covered" : "missing"}>{keyword.covered ? "已覆盖" : "缺失"}</span></div>)}</div> : <div className="empty-state">添加目标关键词后，这里会显示每个词的埋词位置。</div>}
      </div>
    </section>
  );
}

function SellerInsightApp() {
  const { configured } = useAuth();
  const [tab, setTab] = useState<WorkspaceTab>("audit");
  const [listing, setListing] = useState<ListingInput>(demoListing);
  const [result, setResult] = useState<AuditResult>(() => auditListing(demoListing));
  const [filter, setFilter] = useState<Severity | "all">("all");
  const [savedAt, setSavedAt] = useState("刚刚");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.localStorage.setItem("seller-insight-listing", JSON.stringify(listing));
      setSavedAt(new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [listing]);

  const nav = useMemo(() => [
    { id: "audit" as const, icon: "01", label: "Listing 检查", note: "合规与转化" },
    { id: "competitors" as const, icon: "02", label: "竞品分析", note: "市场与差异" },
    { id: "ai" as const, icon: "03", label: "AI 分析", note: "解释与行动" },
    { id: "reports" as const, icon: "04", label: "分析报告", note: "保存与导出" },
  ], []);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">S</div><div><strong>Seller Insight</strong><span>开源运营工具箱</span></div></div>
        <nav>{nav.map((item) => <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}><i>{item.icon}</i><span><b>{item.label}</b><small>{item.note}</small></span></button>)}</nav>
        <div className="sidebar-note"><span>数据边界</span><p>导入文件先在浏览器解析；只有点击云端保存后，结构化数据才会进入你的私有项目。</p></div>
        <div className="open-source"><span className="status-dot" /><div><b>Open source first</b><small>v0.3 · 通用电商版</small></div></div>
      </aside>

      <div className="workspace">
        <header className="topbar"><div><span className="mobile-brand">Seller Insight</span><h1>{tab === "audit" ? "Listing 质量检查" : tab === "competitors" ? "竞品与市场研究" : tab === "ai" ? "AI 分析中心" : "分析报告"}</h1><p>{tab === "audit" ? "适用于不同平台与类目：先排除合规风险，再优化搜索与转化。" : tab === "competitors" ? "清洗多来源数据，判断市场结构、客户需求与文案缺口。" : tab === "ai" ? "基于结构化证据生成结论和下一步行动。" : "导出带有依据和修改动作的可复核结果。"}</p></div><div className="top-actions"><span className="saved-state"><i>✓</i> 已自动保存 · {savedAt}</span>{configured ? <ProjectSwitcher /> : <span className="privacy-pill">Browser-local</span>}</div></header>

        {tab === "audit" ? <div className="audit-layout"><ListingEditor value={listing} onChange={setListing} onAnalyze={() => { setResult(auditListing(listing)); setFilter("all"); }} /><AuditResults result={result} filter={filter} setFilter={setFilter} /></div> : tab === "competitors" ? <CompetitorLab ownTitle={listing.title}/> : tab === "ai" ? <AIAnalysisPanel listing={listing} result={result}/> : <UnifiedReportPanel listing={listing} result={result}/>} 
      </div>
    </main>
  );
}

export default function Home() {
  return <AuthProvider><WorkspaceProvider><SellerInsightApp /></WorkspaceProvider></AuthProvider>;
}
