"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export type ResearchProject = { id: string; name: string; marketplace: string; product_category: string | null; own_asin: string | null };
type WorkspaceValue = { projects: ResearchProject[]; projectId: string; setProjectId: (id: string) => void; createProject: (name: string) => Promise<string | null>; saveWorkspace: (payload: unknown) => Promise<string>; loadWorkspace: () => Promise<unknown | null>; refresh: () => Promise<void> };
const WorkspaceContext = createContext<WorkspaceValue>({ projects: [], projectId: "", setProjectId: () => undefined, createProject: async () => null, saveWorkspace: async () => "尚未登录", loadWorkspace: async () => null, refresh: async () => undefined });
export const useWorkspace = () => useContext(WorkspaceContext);

export default function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [projectId, setProjectId] = useState("");
  const supabase = getSupabaseBrowserClient();
  const refresh = useCallback(async () => {
    if (!supabase || !user) return;
    const { data } = await supabase.from("research_projects").select("id,name,marketplace,product_category,own_asin").order("updated_at", { ascending: false });
    const next = (data || []) as ResearchProject[]; setProjects(next); setProjectId((current) => current && next.some((item) => item.id === current) ? current : next[0]?.id || "");
  }, [supabase, user]);
  useEffect(() => { const timer = window.setTimeout(() => { void refresh(); }, 0); return () => window.clearTimeout(timer); }, [refresh]);
  const createProject = async (name: string) => {
    if (!supabase || !user || !name.trim()) return null;
    const { data, error } = await supabase.from("research_projects").insert({ name: name.trim(), owner_id: user.id }).select("id").single();
    if (error) return null; await refresh(); setProjectId(data.id); return data.id as string;
  };
  const saveWorkspace = async (payload: unknown) => {
    if (!supabase || !user || !projectId) return "请先新建或选择项目";
    const { error } = await supabase.from("project_workspaces").upsert({ project_id: projectId, owner_id: user.id, payload, updated_at: new Date().toISOString() }, { onConflict: "project_id" });
    if (error) return error.message; return "已保存到云端";
  };
  const loadWorkspace = async () => {
    if (!supabase || !projectId) return null;
    const { data } = await supabase.from("project_workspaces").select("payload").eq("project_id", projectId).maybeSingle();
    return data?.payload || null;
  };
  return <WorkspaceContext.Provider value={{ projects, projectId, setProjectId, createProject, saveWorkspace, loadWorkspace, refresh }}>{children}</WorkspaceContext.Provider>;
}
