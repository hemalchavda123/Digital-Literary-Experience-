"use client"

import { createContext, useContext, useEffect, useMemo, useState, useCallback, ReactNode } from "react"
import type { Project } from "@/types/project"
import type { Document } from "@/types/document"
import * as api from "@/lib/api/projects"

type ProjectContextValue = {
  projects: Project[]
  loading: boolean
  error: string | null
  refreshProjects: () => Promise<void>
  getProjectById: (id: string) => Project | undefined
  documentsForProject: (projectId: string) => Document[]
  fetchDocuments: (projectId: string) => Promise<Document[]>
  getDocumentById: (id: string) => Promise<Document | null>
  createProject: (name: string) => Promise<Project>
  renameProject: (id: string, name: string) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  createDocument: (projectId: string, title: string) => Promise<Document>
  createPdfDocument: (projectId: string, title: string, content: string) => Promise<Document>
  renameDocument: (id: string, title: string) => Promise<void>
  updateDocumentContent: (id: string, content: string) => Promise<void>
  deleteDocument: (id: string) => Promise<void>
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined)

export function useProjects() {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error("useProjects must be used within ProjectProvider")
  return ctx
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [documentCache, setDocumentCache] = useState<Record<string, Document[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshProjects = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getProjects()
      setProjects(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  function getCookie(name: string): string | null {
    if (typeof document === "undefined") return null
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
    return match ? match[1] : null
  }

  // Load projects only when the user is on an authenticated route
  useEffect(() => {
    if (typeof window === "undefined") {
      setLoading(false)
      return
    }

    const publicRoutes = ["/signup2", "/signup", "/login", "/forgot-password", "/auth"]
    if (publicRoutes.some((route) => window.location.pathname === route || window.location.pathname.startsWith(route + "/"))) {
      setLoading(false)
      return
    }

    const token = getCookie("accessToken")
    if (!token) {
      setLoading(false)
      return
    }

    refreshProjects()
  }, [refreshProjects])

  const contextValue: ProjectContextValue = useMemo(() => ({
    projects,
    loading,
    error,
    refreshProjects,

    getProjectById: (id) => projects.find((p) => p.id === id),

    documentsForProject: (projectId) => documentCache[projectId] ?? [],

    fetchDocuments: async (projectId) => {
      try {
        const docs = await api.getDocumentsForProject(projectId)
        setDocumentCache((prev) => ({ ...prev, [projectId]: docs }))
        return docs
      } catch (err: any) {
        setError(err.message)
        return []
      }
    },

    getDocumentById: async (id) => {
      // Check cache first
      for (const docs of Object.values(documentCache)) {
        const found = docs.find((d) => d.id === id)
        if (found) return found
      }
      // Fetch from API
      try {
        return await api.getDocumentById(id)
      } catch {
        return null
      }
    },

    createProject: async (name) => {
      const project = await api.createProject(name)
      setProjects((prev) => [project, ...prev])
      return project
    },

    renameProject: async (id, name) => {
      const updated = await api.updateProject(id, name)
      setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)))
    },

    deleteProject: async (id) => {
      await api.deleteProject(id)
      setProjects((prev) => prev.filter((p) => p.id !== id))
      setDocumentCache((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    },

    createDocument: async (projectId, title) => {
      const doc = await api.createDocument(projectId, title, "text")
      setDocumentCache((prev) => ({
        ...prev,
        [projectId]: [...(prev[projectId] ?? []), doc],
      }))
      return doc
    },

    createPdfDocument: async (projectId, title, content) => {
      const doc = await api.createDocument(projectId, title, "pdf", content)
      setDocumentCache((prev) => ({
        ...prev,
        [projectId]: [...(prev[projectId] ?? []), doc],
      }))
      return doc
    },

    renameDocument: async (id, title) => {
      const updated = await api.updateDocument(id, { title })
      setDocumentCache((prev) => {
        const next = { ...prev }
        for (const projectId of Object.keys(next)) {
          next[projectId] = next[projectId].map((d) => (d.id === id ? updated : d))
        }
        return next
      })
    },

    updateDocumentContent: async (id, content) => {
      const updated = await api.updateDocument(id, { content })
      setDocumentCache((prev) => {
        const next = { ...prev }
        for (const projectId of Object.keys(next)) {
          next[projectId] = next[projectId].map((d) => (d.id === id ? updated : d))
        }
        return next
      })
    },

    deleteDocument: async (id) => {
      await api.deleteDocument(id)
      setDocumentCache((prev) => {
        const next = { ...prev }
        for (const projectId of Object.keys(next)) {
          next[projectId] = next[projectId].filter((d) => d.id !== id)
        }
        return next
      })
    },
  }), [projects, documentCache, loading, error, refreshProjects])

  return <ProjectContext.Provider value={contextValue}>{children}</ProjectContext.Provider>
}
