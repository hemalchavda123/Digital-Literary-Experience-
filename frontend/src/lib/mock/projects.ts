import { Project } from "@/types/project"
import { Document } from "@/types/document"
import { loadFromStorage, saveToStorage } from "@/lib/localStorage"

const PROJECTS_KEY = "mock-projects"
const DOCUMENTS_KEY = "mock-documents"

type MockState = {
  projects: Project[]
  documents: Document[]
}

const initialState: MockState = {
  projects: [
    {
      id: "1",
      name: "My First Novel",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-10T12:00:00.000Z",
      ownerId: "demo-user",
    },
    {
      id: "2",
      name: "Research Notes",
      createdAt: "2026-01-02T00:00:00.000Z",
      updatedAt: "2026-01-12T09:30:00.000Z",
      ownerId: "demo-user",
    },
  ],
  documents: [
    {
      id: "doc-1",
      title: "Chapter 1",
      projectId: "1",
      kind: "text",
      content: "Once upon a time...",
      createdAt: "2026-01-03T10:00:00.000Z",
      updatedAt: "2026-01-04T14:00:00.000Z",
    },
    {
      id: "doc-2",
      title: "Outline",
      projectId: "1",
      kind: "text",
      content: "Act I\nAct II\nAct III",
      createdAt: "2026-01-03T11:00:00.000Z",
      updatedAt: "2026-01-05T09:00:00.000Z",
    },
    {
      id: "doc-3",
      title: "General Notes",
      projectId: "2",
      kind: "text",
      content: "Random observations and references.",
      createdAt: "2026-01-06T08:00:00.000Z",
      updatedAt: "2026-01-06T08:00:00.000Z",
    },
    {
      id: "doc-4",
      title: "Sample PDF (local)",
      projectId: "1",
      kind: "pdf",
      content: "",
      pdfUrl: "/mock-docs/sample.pdf",
      createdAt: "2026-01-07T10:00:00.000Z",
      updatedAt: "2026-01-07T10:00:00.000Z",
    },
  ],
}

function loadState(): MockState {
  const projects = loadFromStorage<Project[]>(PROJECTS_KEY, initialState.projects)
  const documents = loadFromStorage<Document[]>(DOCUMENTS_KEY, initialState.documents)
  return { projects, documents }
}

function saveState(state: MockState) {
  saveToStorage(PROJECTS_KEY, state.projects)
  saveToStorage(DOCUMENTS_KEY, state.documents)
}

let state: MockState | null = null

function ensureState() {
  if (!state) {
    state = loadState()
  }
  return state
}

export function getProjects(): Project[] {
  return [...ensureState().projects]
}

export function getDocumentsForProject(projectId: string): Document[] {
  return ensureState().documents.filter((d) => d.projectId === projectId)
}

export function getDocumentById(id: string): Document | undefined {
  return ensureState().documents.find((d) => d.id === id)
}

export function createProject(name: string, ownerId?: string): Project {
  const now = new Date().toISOString()
  const project: Project = {
    id: crypto.randomUUID(),
    name,
    createdAt: now,
    updatedAt: now,
    ownerId,
  }
  const s = ensureState()
  s.projects.push(project)
  saveState(s)
  return project
}

export function updateProject(id: string, updates: Partial<Pick<Project, "name">>): Project | undefined {
  const s = ensureState()
  const project = s.projects.find((p) => p.id === id)
  if (!project) return undefined
  Object.assign(project, updates)
  project.updatedAt = new Date().toISOString()
  saveState(s)
  return project
}

export function deleteProject(id: string) {
  const s = ensureState()
  s.projects = s.projects.filter((p) => p.id !== id)
  s.documents = s.documents.filter((d) => d.projectId !== id)
  saveState(s)
}

export function createDocument(projectId: string, title: string): Document {
  const now = new Date().toISOString()
  const doc: Document = {
    id: crypto.randomUUID(),
    title,
    projectId,
    kind: "text",
    content: "",
    createdAt: now,
    updatedAt: now,
  }
  const s = ensureState()
  s.documents.push(doc)
  const project = s.projects.find((p) => p.id === projectId)
  if (project) {
    project.updatedAt = now
  }
  saveState(s)
  return doc
}

export function createPdfDocument(projectId: string, title: string, pdfUrl: string, content = ""): Document {
  const now = new Date().toISOString()
  const doc: Document = {
    id: crypto.randomUUID(),
    title,
    projectId,
    kind: "pdf",
    content,
    pdfUrl,
    createdAt: now,
    updatedAt: now,
  }
  const s = ensureState()
  s.documents.push(doc)
  const project = s.projects.find((p) => p.id === projectId)
  if (project) {
    project.updatedAt = now
  }
  saveState(s)
  return doc
}

export function updateDocument(
  id: string,
  updates: Partial<Pick<Document, "title" | "content" | "pdfUrl">>
): Document | undefined {
  const s = ensureState()
  const doc = s.documents.find((d) => d.id === id)
  if (!doc) return undefined
  Object.assign(doc, updates)
  doc.updatedAt = new Date().toISOString()
  saveState(s)
  return doc
}

export function deleteDocument(id: string) {
  const s = ensureState()
  s.documents = s.documents.filter((d) => d.id !== id)
  saveState(s)
}

