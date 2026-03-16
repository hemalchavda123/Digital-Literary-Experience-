"use client"

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react"
import type { Project } from "@/types/project"
import type { Document } from "@/types/document"
import {
  getProjects,
  getDocumentsForProject,
  getDocumentById,
  createProject as mockCreateProject,
  createDocument as mockCreateDocument,
  createPdfDocument as mockCreatePdfDocument,
  updateProject as mockUpdateProject,
  updateDocument as mockUpdateDocument,
  deleteProject as mockDeleteProject,
  deleteDocument as mockDeleteDocument,
} from "@/lib/mock/projects"

type ProjectContextValue = {
  projects: Project[]
  getProjectById: (id: string) => Project | undefined
  documentsForProject: (projectId: string) => Document[]
  getDocumentById: (id: string) => Document | undefined
  createProject: (name: string) => Project
  renameProject: (id: string, name: string) => void
  deleteProject: (id: string) => void
  createDocument: (projectId: string, title: string) => Document
  createPdfDocument: (projectId: string, title: string, pdfUrl: string, extractedText?: string) => Document
  renameDocument: (id: string, title: string) => void
  updateDocumentContent: (id: string, content: string) => void
  deleteDocument: (id: string) => void
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined)

export function useProjects() {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error("useProjects must be used within ProjectProvider")
  return ctx
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  // Start with no projects so server and first client render match.
  // Then hydrate from the mock/localStorage layer on the client.
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [, setVersion] = useState(0)

  useEffect(() => {
    setProjects(getProjects())
  }, [])

  const api: ProjectContextValue = useMemo(
    () => ({
      projects: projects ?? [],
      getProjectById: (id) => (projects ?? []).find((p) => p.id === id),
      documentsForProject: (projectId) => getDocumentsForProject(projectId),
      getDocumentById: (id) => getDocumentById(id),
      createProject: (name) => {
        const project = mockCreateProject(name)
        setProjects(getProjects())
        return project
      },
      renameProject: (id, name) => {
        mockUpdateProject(id, { name })
        setProjects(getProjects())
      },
      deleteProject: (id) => {
        mockDeleteProject(id)
        setProjects(getProjects())
      },
      createDocument: (projectId, title) => {
        const doc = mockCreateDocument(projectId, title)
        setVersion((v) => v + 1)
        setProjects(getProjects())
        return doc
      },
      createPdfDocument: (projectId, title, pdfUrl, extractedText = "") => {
        const doc = mockCreatePdfDocument(projectId, title, pdfUrl, extractedText)
        setVersion((v) => v + 1)
        setProjects(getProjects())
        return doc
      },
      renameDocument: (id, title) => {
        mockUpdateDocument(id, { title })
        setVersion((v) => v + 1)
      },
      updateDocumentContent: (id, content) => {
        mockUpdateDocument(id, { content })
        setVersion((v) => v + 1)
      },
      deleteDocument: (id) => {
        mockDeleteDocument(id)
        setVersion((v) => v + 1)
      },
    }),
    [projects]
  )

  return <ProjectContext.Provider value={api}>{children}</ProjectContext.Provider>
}

