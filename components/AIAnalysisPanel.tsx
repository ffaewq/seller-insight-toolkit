"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { AuditResult, ListingInput } from "@/lib/listing-analysis";

type Provider = { id: string; label: string; configured: boolean; model: string };
const tasks = [
  ["listing", "Listing 深度体检"], ["market", "市场与竞品分析"], ["keywords", "关键词布局建议"], ["images", "图片策划框架"], ["beginner", "新手行动路线图"],
];

export default function AIAnalysisPanel({ listing, result }: { listing: ListingInput; result: AuditResult }) {
  const { user } = useAuth();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [provider, setProvider] = useState("");
  const [task, setTask] = useState("listing");
  const [instructions, setInstructions] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => { fetch("/api/ai/analyze").then((response) => response.json()).then((data) => { const next = data.providers || []; setProviders(next); setProvider(next.find((item: Provider) => item.configured)?.id || next[0]?.id || ""); }).catch(() => setProviders([])); }, []);
  const selected = useMemo(() => providers.find((item) => item.id === provider), [providers, provider]);
  const analyze = async () => {
    setLoading(true); setError(""); setAnswer("");
    const session = await getSupabaseBrowserClient()?.auth.getSession();
    const token = session?.data.session?.access_token;
    const response = await fetch("/api/ai/analyze", { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ provider, task: tasks.find((item) => item[0] === task)?.[1], instructions, context: { listing, deterministicAudit: result } }) });
    const data = await response.json(); setLoading(false);
    if (!response.ok) setError(data.error || "AI 分析失败"); else setAnswer(data.content);
  };
  return <div className="ai-page"><section className="ai-hero card"><div><span className="eyebrow">AI 分析中心</span><h2>让 AI 解释数据，不替你编造事实</h2><p>同一套接口兼容 DeepSeek、Gemini 和其他 OpenAI 兼容服务。确定性检查结果会作为证据输入，AI 负责归纳、解释和生成行动建议。</p></div><span className="ai-security">密钥仅在服务器端读取</span></section><div className="ai-grid"><section className="card ai-controls"><label>AI 服务<select value={provider} onChange={(event) => setProvider(event.target.value)}>{providers.map((item) => <option key={item.id} value={item.id}>{item.label} {item.configured ? `· ${item.model}` : "· 未配置"}</option>)}</select></label><label>分析任务<select value={task} onChange={(event) => setTask(event.target.value)}>{tasks.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><label>补充要求<textarea rows={7} value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="例如：重点分析新品进入机会，并给出按优先级排序的 7 天行动清单。" /></label><button className="primary-button analyze-button" disabled={loading || !user || !selected?.configured} onClick={analyze}>{loading ? "AI 正在分析…" : !user ? "登录后使用 AI" : !selected?.configured ? "该服务尚未配置" : "开始 AI 分析"}</button>{error && <div className="ai-error">{error}</div>}<div className="provider-status">{providers.map((item) => <span key={item.id} className={item.configured ? "ready" : "missing"}>{item.label} · {item.configured ? "可用" : "待配置"}</span>)}</div></section><section className="card ai-output"><div className="section-heading"><div><span className="eyebrow">分析结果</span><h2>{answer ? "可复核的 AI 建议" : "等待分析"}</h2></div>{answer && <button className="ghost-button" onClick={() => navigator.clipboard.writeText(answer)}>复制</button>}</div>{answer ? <pre>{answer}</pre> : <div className="ai-empty"><b>AI 不直接决定你的运营动作</b><p>先由系统完成数据清洗、竞品分类和规则检查，再把结构化结果交给 AI，能显著减少“看起来合理但没有依据”的结论。</p></div>}</section></div></div>;
}
