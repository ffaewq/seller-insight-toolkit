"use client";

import { useMemo, useRef, useState } from "react";
import { analyzeMarket, demoCompetitors, type Competitor } from "@/lib/competitor-analysis";
import type { SellerSpriteImport, SellerSpriteKeyword } from "@/lib/sellersprite-import";

const formatCurrency = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const formatNumber = (value: number) => new Intl.NumberFormat("zh-CN").format(value || 0);

function parseCsv(text: string): Competitor[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((item) => item.trim().toLowerCase().replace(/[^a-z]/g, ""));
  return lines.slice(1).map((line, index) => {
    const cells = line.match(/("[^"]*(?:""[^"]*)*"|[^,]*)(?:,|$)/g)?.map((cell) => cell.replace(/,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"')) || [];
    const find = (...names: string[]) => { const pos = headers.findIndex((header) => names.includes(header)); return pos >= 0 ? cells[pos] || "" : ""; };
    return { id: `csv-${Date.now()}-${index}`, asin: find("asin"), brand: find("brand"), title: find("title", "producttitle"), price: Number(find("price")) || 0, rating: Number(find("rating", "stars")) || 0, reviews: Number(find("reviews", "reviewcount")) || 0, monthlySales: Number(find("monthlysales", "sales")) || 0, bsr: Number(find("bsr", "rank")) || 0 };
  });
}

type ImportState = { files: SellerSpriteImport[]; keywords: SellerSpriteKeyword[]; message: string; error: string };

export default function CompetitorLab({ ownTitle }: { ownTitle: string }) {
  const [rows, setRows] = useState<Competitor[]>(demoCompetitors);
  const [query, setQuery] = useState("");
  const [keywordQuery, setKeywordQuery] = useState("");
  const [importing, setImporting] = useState(false);
  const [importState, setImportState] = useState<ImportState>({ files: [], keywords: [], message: "", error: "" });
  const fileRef = useRef<HTMLInputElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);
  const analysis = useMemo(() => analyzeMarket(rows, ownTitle), [rows, ownTitle]);
  const visible = rows.filter((row) => `${row.asin} ${row.brand} ${row.title} ${row.category || ""}`.toLowerCase().includes(query.toLowerCase()));
  const visibleKeywords = importState.keywords.filter((row) => `${row.keyword} ${row.translation}`.toLowerCase().includes(keywordQuery.toLowerCase())).sort((a, b) => b.trafficShare - a.trafficShare || b.monthlySearchVolume - a.monthlySearchVolume);
  const setCell = <K extends keyof Competitor>(id: string, key: K, value: Competitor[K]) => setRows((current) => current.map((row) => row.id === id ? { ...row, [key]: value } : row));
  const addRow = () => setRows((current) => [...current, { id: `new-${Date.now()}`, asin: "", brand: "", title: "", price: 0, rating: 0, reviews: 0, monthlySales: 0, bsr: 0 }]);

  const importSellerSprite = async (files: FileList | null) => {
    if (!files?.length) return;
    setImporting(true);
    setImportState((current) => ({ ...current, error: "", message: "" }));
    try {
      const { parseSellerSpriteWorkbook } = await import("@/lib/sellersprite-import");
      const parsed = await Promise.all(Array.from(files).map(async (file) => parseSellerSpriteWorkbook(await file.arrayBuffer(), file.name)));
      const products = parsed.flatMap((item) => item.products);
      const keywords = parsed.flatMap((item) => item.keywords);
      if (products.length) setRows(products);
      const unknown = parsed.filter((item) => item.kind === "unknown").map((item) => item.fileName);
      const warnings = parsed.flatMap((item) => item.warnings);
      setImportState({ files: parsed, keywords, message: `已识别 ${products.length} 个产品、${keywords.length} 个关键词${parsed.length > 1 ? `，来自 ${parsed.length} 个文件` : ""}。`, error: [...(unknown.length ? [`无法识别：${unknown.join("、")}`] : []), ...warnings].join(" ") });
    } catch (error) {
      setImportState((current) => ({ ...current, error: error instanceof Error ? error.message : "文件解析失败，请确认是卖家精灵导出的 Excel/CSV。" }));
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const exportCsv = () => {
    const head = "ASIN,Brand,Title,Price,Rating,Reviews,Monthly Sales,BSR";
    const body = rows.map((row) => [row.asin, row.brand, `"${row.title.replace(/"/g, '""')}"`, row.price, row.rating, row.reviews, row.monthlySales, row.bsr].join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([`${head}\n${body}`], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "seller-insight-competitors.csv"; anchor.click(); URL.revokeObjectURL(url);
  };

  const sourceAsins = Array.from(new Set(importState.files.map((item) => item.sourceAsin).filter(Boolean)));

  return (
    <div className="competitor-page">
      <section className="import-card card">
        <div className="import-copy"><span className="eyebrow">卖家精灵一键导入</span><h2>无需手工抄写 ASIN 和市场数据</h2><p>支持产品导出与 ASIN 反查关键词文件，可一次选择多个 XLSX、XLS 或 CSV。导入后先筛选真正的直接竞品，再做市场判断。</p></div>
        <div className="import-actions"><input ref={fileRef} type="file" multiple accept=".xlsx,.xls,.csv" hidden onChange={(event) => importSellerSprite(event.target.files)} /><button className="primary-button" disabled={importing} onClick={() => fileRef.current?.click()}>{importing ? "正在解析…" : "导入卖家精灵文件"}</button><small>Excel 在浏览器内解析；接入 Supabase 后才会保存到云端。</small></div>
        {(importState.message || importState.error) && <div className={`import-result ${importState.error ? "has-warning" : ""}`}><b>{importState.message || "导入未完成"}</b>{importState.error && <span>{importState.error}</span>}</div>}
        {importState.files.length > 0 && <div className="file-chips">{importState.files.map((file) => <span key={`${file.fileName}-${file.sheetName}`}><b>{file.kind === "products" ? "产品" : file.kind === "keywords" ? "关键词" : "未识别"}</b>{file.fileName}<small>{file.kind === "products" ? `${file.products.length} ASIN` : file.kind === "keywords" ? `${file.keywords.length} 词` : file.sheetName}</small></span>)}</div>}
      </section>

      <section className="market-summary">
        <div className="metric-card card"><span>价格中位数</span><strong>${analysis.medianPrice.toFixed(2)}</strong><small>均价 ${analysis.averagePrice.toFixed(2)}</small></div>
        <div className="metric-card card"><span>月销量样本</span><strong>{analysis.monthlySales.toLocaleString()}</strong><small>预估销售额 {formatCurrency(analysis.monthlyRevenue)}</small></div>
        <div className="metric-card card"><span>评价门槛</span><strong>{analysis.medianReviews.toLocaleString()}</strong><small>平均评分 {analysis.averageRating.toFixed(2)}</small></div>
        <div className={`metric-card barrier-${analysis.entryBarrier.toLowerCase()} card`}><span>进入难度</span><strong>{analysis.entryBarrier === "High" ? "高" : analysis.entryBarrier === "Medium" ? "中等" : "较低"}</strong><small>Top 3 销量占比 {analysis.topThreeShare}%</small></div>
      </section>

      {importState.keywords.length > 0 && <section className="keyword-import-card card">
        <div className="section-heading"><div><span className="eyebrow">关键词反查</span><h2>{sourceAsins.length ? `${sourceAsins.join("、")} 的流量词` : "导入的流量词"}</h2></div><div className="keyword-summary"><span>{formatNumber(importState.keywords.length)} 个关键词</span><span>{formatNumber(importState.keywords.reduce((sum, item) => sum + item.monthlySearchVolume, 0))} 月搜索量样本</span></div></div>
        <div className="table-toolbar"><input value={keywordQuery} onChange={(event) => setKeywordQuery(event.target.value)} placeholder="搜索关键词或中文翻译" /><span className="data-hint">优先看流量占比、自然排名、购买率与 PPC，不只看搜索量。</span></div>
        <div className="keyword-data-wrap"><table className="keyword-data-table"><thead><tr><th>流量词</th><th>流量占比</th><th>自然排名</th><th>月搜索量</th><th>购买率</th><th>PPC</th><th>流量类型</th></tr></thead><tbody>{visibleKeywords.slice(0, 100).map((row) => <tr key={row.keyword}><td><b>{row.keyword}</b><small>{row.translation}</small></td><td>{(row.trafficShare * 100).toFixed(2)}%</td><td>{row.organicRank ?? "—"}</td><td>{row.monthlySearchVolume ? formatNumber(row.monthlySearchVolume) : "—"}</td><td>{row.purchaseRate ? `${(row.purchaseRate * 100).toFixed(2)}%` : "—"}</td><td>{row.ppcPrice ? `$${row.ppcPrice.toFixed(2)}` : "—"}</td><td>{row.trafficType || "—"}</td></tr>)}</tbody></table></div>
      </section>}

      <section className="competitor-grid">
        <div className="competitor-table-card card">
          <div className="section-heading"><div><span className="eyebrow">竞品样本</span><h2>把同类产品放在同一张桌面上</h2></div><div className="table-actions"><input ref={csvRef} type="file" accept=".csv" hidden onChange={async (event) => { const file = event.target.files?.[0]; if (file) { const parsed = parseCsv(await file.text()); if (parsed.length) setRows(parsed); } event.target.value = ""; }} /><button className="ghost-button" onClick={() => csvRef.current?.click()}>通用 CSV</button><button className="ghost-button" onClick={exportCsv}>导出</button><button className="primary-button small" onClick={addRow}>＋ 添加</button></div></div>
          <div className="table-toolbar"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索 ASIN、品牌、标题或类目" /><button className="text-button" onClick={() => { setRows(demoCompetitors); setImportState({ files: [], keywords: [], message: "", error: "" }); }}>恢复示例</button></div>
          <div className="data-table-wrap"><table className="data-table"><thead><tr><th>ASIN / 品牌</th><th>竞品标题</th><th>价格</th><th>评分</th><th>评价</th><th>月销量</th><th>BSR</th><th /></tr></thead><tbody>{visible.map((row) => <tr key={row.id}><td><div className="asin-with-image">{row.imageUrl && <img src={row.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />}<div><input value={row.asin} onChange={(event) => setCell(row.id, "asin", event.target.value)} placeholder="ASIN"/><input className="sub-input" value={row.brand} onChange={(event) => setCell(row.id, "brand", event.target.value)} placeholder="品牌"/></div></div></td><td><textarea value={row.title} onChange={(event) => setCell(row.id, "title", event.target.value)} rows={2}/><small className="category-line">{row.category || "未记录类目"}</small></td><td><input type="number" step=".01" value={row.price} onChange={(event) => setCell(row.id, "price", Number(event.target.value))}/></td><td><input type="number" step=".1" value={row.rating} onChange={(event) => setCell(row.id, "rating", Number(event.target.value))}/></td><td><input type="number" value={row.reviews} onChange={(event) => setCell(row.id, "reviews", Number(event.target.value))}/></td><td><input type="number" value={row.monthlySales} onChange={(event) => setCell(row.id, "monthlySales", Number(event.target.value))}/></td><td><input type="number" value={row.bsr} onChange={(event) => setCell(row.id, "bsr", Number(event.target.value))}/></td><td><button className="remove-button" aria-label={`删除 ${row.asin || "空白行"}`} onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}>×</button></td></tr>)}</tbody></table></div>
          <p className="table-note">卖家精灵搜索结果可能混入相邻产品和非直接竞品。系统会完整保留原始数据，但正式结论应基于筛选后的同类产品。</p>
        </div>

        <aside className="insight-column">
          <section className="card insight-card"><div className="section-heading"><div><span className="eyebrow">市场信号</span><h2>先看结构，再找差异</h2></div></div><div className="insight-list">{analysis.insights.map((item, index) => <article className={`insight-${item.type}`} key={index}><i>{item.type === "risk" ? "!" : item.type === "opportunity" ? "↗" : "•"}</i><div><b>{item.title}</b><p>{item.detail}</p></div></article>)}</div></section>
          <section className="card terms-card"><div className="section-heading"><div><span className="eyebrow">标题词频</span><h2>样本共同语言</h2></div></div><div className="term-cloud">{analysis.commonTerms.map((item) => <span className={analysis.gaps.includes(item.term) ? "gap" : ""} style={{ "--weight": Math.max(.78, item.share / 70) } as React.CSSProperties} key={item.term}>{item.term}<small>{item.share}%</small></span>)}</div><div className="legend"><i /> 自有标题缺口（需先核实相关性）</div></section>
          <section className="card method-card"><span>数据边界</span><p>销量、销售额和流量来自第三方估算，应和采集日期一起保存。主图链接可以导入，但完整图片顺序和 A+ 需要另行上传或采集。</p></section>
        </aside>
      </section>
    </div>
  );
}
