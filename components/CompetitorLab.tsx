"use client";

import { useMemo, useRef, useState } from "react";
import { analyzeMarket, demoCompetitors, type Competitor } from "@/lib/competitor-analysis";

const formatCurrency = (value:number) => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(value);

function parseCsv(text:string): Competitor[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((item) => item.trim().toLowerCase().replace(/[^a-z]/g,""));
  return lines.slice(1).map((line,index) => {
    const cells = line.match(/("[^"]*(?:""[^"]*)*"|[^,]*)(?:,|$)/g)?.map((cell) => cell.replace(/,$/,"").replace(/^"|"$/g,"").replace(/""/g,'"')) || [];
    const find = (...names:string[]) => { const pos = headers.findIndex((header) => names.includes(header)); return pos >= 0 ? cells[pos] || "" : ""; };
    return { id:`csv-${Date.now()}-${index}`,asin:find("asin"),brand:find("brand"),title:find("title","producttitle"),price:Number(find("price")) || 0,rating:Number(find("rating","stars")) || 0,reviews:Number(find("reviews","reviewcount")) || 0,monthlySales:Number(find("monthlysales","sales")) || 0,bsr:Number(find("bsr","rank")) || 0 };
  });
}

export default function CompetitorLab({ ownTitle }:{ ownTitle:string }) {
  const [rows,setRows] = useState<Competitor[]>(demoCompetitors);
  const [query,setQuery] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const analysis = useMemo(() => analyzeMarket(rows,ownTitle),[rows,ownTitle]);
  const visible = rows.filter((row) => `${row.asin} ${row.brand} ${row.title}`.toLowerCase().includes(query.toLowerCase()));
  const setCell = <K extends keyof Competitor>(id:string,key:K,value:Competitor[K]) => setRows((current) => current.map((row) => row.id === id ? {...row,[key]:value} : row));
  const addRow = () => setRows((current) => [...current,{id:`new-${Date.now()}`,asin:"",brand:"",title:"",price:0,rating:0,reviews:0,monthlySales:0,bsr:0}]);
  const exportCsv = () => {
    const head = "ASIN,Brand,Title,Price,Rating,Reviews,Monthly Sales,BSR";
    const body = rows.map((r) => [r.asin,r.brand,`"${r.title.replace(/"/g,'""')}"`,r.price,r.rating,r.reviews,r.monthlySales,r.bsr].join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([`${head}\n${body}`],{type:"text/csv;charset=utf-8"}));
    const anchor = document.createElement("a"); anchor.href=url; anchor.download="seller-insight-competitors.csv"; anchor.click(); URL.revokeObjectURL(url);
  };
  return (
    <div className="competitor-page">
      <section className="market-summary">
        <div className="metric-card card"><span>价格中位数</span><strong>${analysis.medianPrice.toFixed(2)}</strong><small>均价 ${analysis.averagePrice.toFixed(2)}</small></div>
        <div className="metric-card card"><span>月销量样本</span><strong>{analysis.monthlySales.toLocaleString()}</strong><small>预估销售额 {formatCurrency(analysis.monthlyRevenue)}</small></div>
        <div className="metric-card card"><span>评价门槛</span><strong>{analysis.medianReviews.toLocaleString()}</strong><small>平均评分 {analysis.averageRating.toFixed(2)}</small></div>
        <div className={`metric-card barrier-${analysis.entryBarrier.toLowerCase()} card`}><span>进入难度</span><strong>{analysis.entryBarrier === "High" ? "高" : analysis.entryBarrier === "Medium" ? "中等" : "较低"}</strong><small>Top 3 销量占比 {analysis.topThreeShare}%</small></div>
      </section>

      <section className="competitor-grid">
        <div className="competitor-table-card card">
          <div className="section-heading"><div><span className="eyebrow">竞品样本</span><h2>把数据放在同一张桌面上</h2></div><div className="table-actions"><input ref={fileRef} type="file" accept=".csv" hidden onChange={async(e) => { const file=e.target.files?.[0]; if(file){const parsed=parseCsv(await file.text());if(parsed.length)setRows(parsed);} e.target.value=""; }} /><button className="ghost-button" onClick={() => fileRef.current?.click()}>导入 CSV</button><button className="ghost-button" onClick={exportCsv}>导出</button><button className="primary-button small" onClick={addRow}>＋ 添加</button></div></div>
          <div className="table-toolbar"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索 ASIN、品牌或标题" /><button className="text-button" onClick={() => setRows(demoCompetitors)}>恢复示例</button></div>
          <div className="data-table-wrap"><table className="data-table"><thead><tr><th>ASIN / 品牌</th><th>竞品标题</th><th>价格</th><th>评分</th><th>评价</th><th>月销量</th><th>BSR</th><th /></tr></thead><tbody>{visible.map((row) => <tr key={row.id}><td><input value={row.asin} onChange={(e) => setCell(row.id,"asin",e.target.value)} placeholder="ASIN"/><input className="sub-input" value={row.brand} onChange={(e) => setCell(row.id,"brand",e.target.value)} placeholder="品牌"/></td><td><textarea value={row.title} onChange={(e) => setCell(row.id,"title",e.target.value)} rows={2}/></td><td><input type="number" step=".01" value={row.price} onChange={(e) => setCell(row.id,"price",Number(e.target.value))}/></td><td><input type="number" step=".1" value={row.rating} onChange={(e) => setCell(row.id,"rating",Number(e.target.value))}/></td><td><input type="number" value={row.reviews} onChange={(e) => setCell(row.id,"reviews",Number(e.target.value))}/></td><td><input type="number" value={row.monthlySales} onChange={(e) => setCell(row.id,"monthlySales",Number(e.target.value))}/></td><td><input type="number" value={row.bsr} onChange={(e) => setCell(row.id,"bsr",Number(e.target.value))}/></td><td><button className="remove-button" aria-label={`删除 ${row.asin || "空白行"}`} onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}>×</button></td></tr>)}</tbody></table></div>
          <p className="table-note">支持表头：ASIN、Brand、Title、Price、Rating、Reviews、Monthly Sales、BSR。数据仅保存在当前页面。</p>
        </div>

        <aside className="insight-column">
          <section className="card insight-card"><div className="section-heading"><div><span className="eyebrow">市场信号</span><h2>先看结构，再抄答案</h2></div></div><div className="insight-list">{analysis.insights.map((item,index) => <article className={`insight-${item.type}`} key={index}><i>{item.type === "risk" ? "!" : item.type === "opportunity" ? "↗" : "•"}</i><div><b>{item.title}</b><p>{item.detail}</p></div></article>)}</div></section>
          <section className="card terms-card"><div className="section-heading"><div><span className="eyebrow">标题词频</span><h2>样本共同语言</h2></div></div><div className="term-cloud">{analysis.commonTerms.map((item) => <span className={analysis.gaps.includes(item.term) ? "gap" : ""} style={{"--weight":Math.max(.78,item.share/70)} as React.CSSProperties} key={item.term}>{item.term}<small>{item.share}%</small></span>)}</div><div className="legend"><i /> 自有标题缺口（需先核实相关性）</div></section>
          <section className="card method-card"><span>方法说明</span><p>这些结论只反映你录入的样本，不代表整个市场。销量、BSR 和关键词应保持同一时间窗口，避免把不同日期的数据直接比较。</p></section>
        </aside>
      </section>
    </div>
  );
}
