import { AnnotationLabel, TextAnnotation } from "@/types/annotation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

// --- Labels ---

export async function getLabelsForProject(projectId: string): Promise<AnnotationLabel[]> {
  const res = await fetch(`${API_BASE_URL}/labels/project/${projectId}`);
  if (!res.ok) throw new Error("Failed to fetch labels");
  return res.json();
}

export async function createLabel(projectId: string, name: string, color: string): Promise<AnnotationLabel> {
  const res = await fetch(`${API_BASE_URL}/labels`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, name, color }),
  });
  if (!res.ok) throw new Error("Failed to create label");
  return res.json();
}

export async function updateLabel(id: string, name: string, color: string): Promise<AnnotationLabel> {
  const res = await fetch(`${API_BASE_URL}/labels/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, color }),
  });
  if (!res.ok) throw new Error("Failed to update label");
  return res.json();
}

export async function deleteLabel(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/labels/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete label");
}

// --- Annotations ---

export async function getAnnotationsForDocument(docId: string): Promise<TextAnnotation[]> {
  const res = await fetch(`${API_BASE_URL}/annotations/doc/${docId}`);
  if (!res.ok) throw new Error("Failed to fetch annotations");
  return res.json();
}

export async function createAnnotation(docId: string, labelId: string, startOffset: number, endOffset: number, content: string = ""): Promise<TextAnnotation> {
  const res = await fetch(`${API_BASE_URL}/annotations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ docId, labelId, startOffset, endOffset, content }),
  });
  if (!res.ok) throw new Error("Failed to create annotation");
  return res.json();
}

export async function updateAnnotation(id: string, content: string, labelId?: string): Promise<TextAnnotation> {
  const body: any = { content };
  if (labelId) body.labelId = labelId;
  const res = await fetch(`${API_BASE_URL}/annotations/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to update annotation");
  return res.json();
}

export async function deleteAnnotation(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/annotations/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete annotation");
}
