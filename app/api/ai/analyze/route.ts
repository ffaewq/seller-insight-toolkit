import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type ProviderId = "deepseek" | "gemini" | "compatible";
const configs = (): Record<ProviderId, { key?: string; baseUrl?: string; model?: string; label: string }> => ({
  deepseek: { key: process.env.DEEPSEEK_API_KEY, baseUrl: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com", model: process.env.DEEPSEEK_MODEL, label: "DeepSeek" },
  gemini: { key: process.env.GEMINI_API_KEY, baseUrl: process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai", model: process.env.GEMINI_MODEL, label: "Gemini" },
  compatible: { key: process.env.AI_COMPATIBLE_API_KEY, baseUrl: process.env.AI_COMPATIBLE_BASE_URL, model: process.env.AI_COMPATIBLE_MODEL, label: "OpenAI 兼容接口" },
});

const verifyUser = async (request: NextRequest) => {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!token || !url || !key) return null;
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data } = await supabase.auth.getUser(token);
  return data.user;
};

export async function GET() {
  const providers = configs();
  return NextResponse.json({ providers: Object.entries(providers).map(([id, config]) => ({ id, label: config.label, configured: Boolean(config.key && config.baseUrl && config.model), model: config.model || "" })) });
}

export async function POST(request: NextRequest) {
  const user = await verifyUser(request);
  if (!user) return NextResponse.json({ error: "请先登录后再使用 AI 分析。" }, { status: 401 });
  const body = await request.json().catch(() => null) as { provider?: ProviderId; task?: string; context?: unknown; instructions?: string } | null;
  if (!body || !body.provider || !["deepseek", "gemini", "compatible"].includes(body.provider)) return NextResponse.json({ error: "AI 服务配置无效。" }, { status: 400 });
  const config = configs()[body.provider];
  if (!config.key || !config.baseUrl || !config.model) return NextResponse.json({ error: `${config.label} 尚未在服务器配置密钥、地址和模型。` }, { status: 503 });
  const context = JSON.stringify(body.context || {}).slice(0, 120000);
  const system = `你是一名严谨的电商市场研究与 Listing 审核助手。适用于不同平台、产品与类目。\n规则：\n1. 把合规风险置于 SEO 和文案风格之前；不承诺平台批准。\n2. 严格区分原始数据、计算结果与推断，不编造产品事实。\n3. 第三方销量、流量和销售额只能称为估算。\n4. 结论必须注明样本量和局限性。\n5. 用中文输出，按“结论、依据、风险、机会、下一步动作、待补证据”组织。\n6. 对不相关或跨类目的样本先排除，不把它们混入市场统计。`;
  const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/chat/completions`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${config.key}` }, body: JSON.stringify({ model: config.model, messages: [{ role: "system", content: system }, { role: "user", content: `任务：${body.task || "综合分析"}\n补充要求：${body.instructions || "无"}\n数据：${context}` }], stream: false }) });
  const data = await response.json().catch(() => ({})) as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
  if (!response.ok) return NextResponse.json({ error: data.error?.message || `${config.label} 请求失败（${response.status}）` }, { status: 502 });
  const content = data.choices?.[0]?.message?.content;
  if (!content) return NextResponse.json({ error: "AI 返回内容为空。" }, { status: 502 });
  return NextResponse.json({ content, provider: body.provider, model: config.model });
}
