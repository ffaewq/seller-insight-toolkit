"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useWorkspace } from "@/components/WorkspaceProvider";

export default function ProjectSwitcher() {
  const { user, signOut } = useAuth();
  const { projects, projectId, setProjectId, createProject } = useWorkspace();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  if (!user) return <span className="privacy-pill">本地访客</span>;
  return <div className="project-switcher">{creating ? <><input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="输入项目名称" /><button className="primary-button small" onClick={async () => { if (await createProject(name)) { setCreating(false); setName(""); } }}>创建</button><button className="ghost-button" onClick={() => setCreating(false)}>取消</button></> : <><select value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="">选择调研项目</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><button className="ghost-button" onClick={() => setCreating(true)}>＋项目</button><button className="user-button" title={user.email} onClick={signOut}>{user.email?.slice(0, 1).toUpperCase()}</button></>}</div>;
}
