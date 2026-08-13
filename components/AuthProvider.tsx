"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, supabaseConfigured } from "@/lib/supabase-browser";

type AuthValue = { user: User | null; configured: boolean; signOut: () => Promise<void> };
const AuthContext = createContext<AuthValue>({ user: null, configured: false, signOut: async () => undefined });
export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(supabaseConfigured);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => { setUser(data.user); setLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => { setUser(session?.user || null); setLoading(false); });
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  const sendCode = async () => {
    if (!supabase || !email.trim()) return;
    setBusy(true); setMessage("");
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true, emailRedirectTo: window.location.origin } });
    setBusy(false);
    if (error) setMessage(error.message); else { setSent(true); setMessage("邮件已发送。请输入 6 位验证码；如果邮件中是登录链接，也可以直接点击。"); }
  };

  const verifyCode = async () => {
    if (!supabase || token.trim().length !== 6) return;
    setBusy(true); setMessage("");
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: token.trim(), type: "email" });
    setBusy(false);
    if (error) setMessage(error.message); else setMessage("登录成功");
  };

  if (loading) return <div className="auth-screen"><div className="auth-card card"><div className="brand-mark">S</div><h1>正在连接工作区…</h1></div></div>;
  if (supabaseConfigured && !user) return <div className="auth-screen"><section className="auth-card card"><div className="auth-brand"><div className="brand-mark">S</div><div><b>Seller Insight</b><span>通用电商研究平台</span></div></div><span className="eyebrow">私有工作区</span><h1>{sent ? "输入邮箱验证码" : "登录或创建账户"}</h1><p>无需密码。首次验证邮箱后会自动创建个人工作区，每位用户的数据由 Supabase 权限策略隔离。</p><label>邮箱地址<input type="email" value={email} disabled={sent} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" /></label>{sent && <label>6 位验证码<input value={token} maxLength={6} inputMode="numeric" onChange={(event) => setToken(event.target.value.replace(/\D/g, ""))} placeholder="000000" /></label>}<button className="primary-button" disabled={busy || !email.trim() || (sent && token.length !== 6)} onClick={sent ? verifyCode : sendCode}>{busy ? "请稍候…" : sent ? "验证并登录" : "发送验证码"}</button>{sent && <button className="text-button" onClick={() => { setSent(false); setToken(""); setMessage(""); }}>更换邮箱</button>}{message && <div className="auth-message">{message}</div>}<small>登录即表示仅将你主动保存的数据写入自己的云端工作区。</small></section></div>;

  return <AuthContext.Provider value={{ user, configured: supabaseConfigured, signOut: async () => { await supabase?.auth.signOut(); } }}>{children}</AuthContext.Provider>;
}
