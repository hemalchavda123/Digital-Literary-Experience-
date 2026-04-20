import { authFetch } from "./authFetch";
import type { Project } from "@/types/project";
import type { Document } from "@/types/document";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

/**
 * Helper to extract a useful error message from a failed response
 */
async function extractError(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    return body?.error?.message || body?.error || body?.message || `${fallback} (${res.status})`;
  } catch {
    return `${fallback} (${res.status})`;
  }
}

// --- Projects ---

export async function getProjects(): Promise<Project[]> {
  const res = await authFetch(`${API_BASE_URL}/projects`);
  if (!res.ok) throw new Error(await extractError(res, "Failed to fetch projects"));
  return res.json();
}

export async function getProjectById(id: string): Promise<Project | null> {
  const res = await authFetch(`${API_BASE_URL}/projects/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await extractError(res, "Failed to fetch project"));
  return res.json();
}

export async function createProject(name: string): Promise<Project> {
  const res = await authFetch(`${API_BASE_URL}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(await extractError(res, "Failed to create project"));
  return res.json();
}

export async function updateProject(id: string, name: string): Promise<Project> {
  const res = await authFetch(`${API_BASE_URL}/projects/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(await extractError(res, "Failed to update project"));
  return res.json();
}

export async function deleteProject(id: string): Promise<void> {
  const res = await authFetch(`${API_BASE_URL}/projects/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await extractError(res, "Failed to delete project"));
}

// --- Documents ---

export async function getDocumentsForProject(projectId: string): Promise<Document[]> {
  const res = await authFetch(`${API_BASE_URL}/documents/project/${projectId}`);
  if (!res.ok) throw new Error(await extractError(res, "Failed to fetch documents"));
  return res.json();
}

export async function getDocumentById(id: string): Promise<Document | null> {
  const res = await authFetch(`${API_BASE_URL}/documents/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await extractError(res, "Failed to fetch document"));
  return res.json();
}

export async function createDocument(
  projectId: string,
  title: string,
  kind: "text" | "pdf" = "text",
  content: string = "",
  pdfUrl?: string,
): Promise<Document> {
  const res = await authFetch(`${API_BASE_URL}/documents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, title, kind, content, pdfUrl }),
  });
  if (!res.ok) throw new Error(await extractError(res, "Failed to create document"));
  return res.json();
}

export async function updateDocument(
  id: string,
  updates: { title?: string; content?: string; pdfUrl?: string },
): Promise<Document> {
  const res = await authFetch(`${API_BASE_URL}/documents/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(await extractError(res, "Failed to update document"));
  return res.json();
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await authFetch(`${API_BASE_URL}/documents/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await extractError(res, "Failed to delete document"));
}

// --- Project Members & Invites ---

export async function getProjectMembers(projectId: string) {
  const res = await authFetch(`${API_BASE_URL}/projects/${projectId}/members`);
  if (!res.ok) throw new Error(await extractError(res, "Failed to fetch project members"));
  return res.json();
}

export async function removeProjectMember(projectId: string, memberId: string): Promise<void> {
  const res = await authFetch(`${API_BASE_URL}/projects/${projectId}/members/${memberId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await extractError(res, "Failed to remove member"));
}

export async function updateMemberRole(projectId: string, memberId: string, role: string) {
  const res = await authFetch(`${API_BASE_URL}/projects/${projectId}/members/${memberId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) throw new Error(await extractError(res, "Failed to update member role"));
  return res.json();
}

export async function createInviteLink(projectId: string, role: string) {
  const res = await authFetch(`${API_BASE_URL}/projects/${projectId}/invites`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) throw new Error(await extractError(res, "Failed to create invite link"));
  return res.json();
}

export async function joinProjectViaLink(token: string) {
  const res = await authFetch(`${API_BASE_URL}/projects/join/${token}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(await extractError(res, "Failed to join project"));
  return res.json();
}

