"use client"

import { createContext, useContext, useEffect, useMemo, useState, useCallback, ReactNode, useRef } from "react"
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
  const tokenRef = useRef<string | null>(null)

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
      tokenRef.current = null
      return
    }

    // Only refresh if token changed from null to having a value
    if (tokenRef.current === null) {
      tokenRef.current = token
      refreshProjects()
    }
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
      const tempId = `temp-${Date.now()}`
      const optimisticProject: Project = {
        id: tempId,
        name,
        ownerId: "",
        defaultCanViewAnnotations: false,
        defaultCanAnnotate: true,
        defaultCanViewAdminAnnotations: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      
      // 1. Optimistic update
      setProjects((prev) => [optimisticProject, ...prev])
      
      try {
        // 2. Real API call
        const project = await api.createProject(name)
        // 3. Replace temp with real
        setProjects((prev) => prev.map((p) => (p.id === tempId ? project : p)))
        return project
      } catch (error) {
        // 4. Revert on failure
        setProjects((prev) => prev.filter((p) => p.id !== tempId))
        throw error
      }
    },

    renameProject: async (id, name) => {
      const originalProject = projects.find((p) => p.id === id)
      
      // Optimistic update
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)))
      
      try {
        const updated = await api.updateProject(id, name)
        setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)))
      } catch (error) {
        // Revert
        if (originalProject) {
          setProjects((prev) => prev.map((p) => (p.id === id ? originalProject : p)))
        }
        throw error
      }
    },

    deleteProject: async (id) => {
      const originalProject = projects.find((p) => p.id === id)
      
      // Optimistic update
      setProjects((prev) => prev.filter((p) => p.id !== id))
      
      try {
        await api.deleteProject(id)
        setDocumentCache((prev) => {
          const next = { ...prev }
          delete next[id]
          return next
        })
      } catch (error) {
        // Revert
        if (originalProject) {
          setProjects((prev) => [originalProject, ...prev])
        }
        throw error
      }
    },

    createDocument: async (projectId, title) => {
      const tempId = `temp-doc-${Date.now()}`
      const optimisticDoc: Document = {
        id: tempId,
        title,
        projectId,
        type: "text",
        content: null,
        pdfUrl: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      setDocumentCache((prev) => ({
        ...prev,
        [projectId]: [...(prev[projectId] ?? []), optimisticDoc],
      }))

      try {
        const doc = await api.createDocument(projectId, title, "text")
        setDocumentCache((prev) => ({
          ...prev,
          [projectId]: (prev[projectId] ?? []).map((d) => (d.id === tempId ? doc : d)),
        }))
        return doc
      } catch (error) {
        setDocumentCache((prev) => ({
          ...prev,
          [projectId]: (prev[projectId] ?? []).filter((d) => d.id !== tempId),
        }))
        throw error
      }
    },

    createPdfDocument: async (projectId, title, content) => {
      const tempId = `temp-pdf-${Date.now()}`
      const optimisticDoc: Document = {
        id: tempId,
        title,
        projectId,
        type: "pdf",
        content: null,
        pdfUrl: content, // Optimistically setting base64
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      setDocumentCache((prev) => ({
        ...prev,
        [projectId]: [...(prev[projectId] ?? []), optimisticDoc],
      }))

      try {
        const doc = await api.createDocument(projectId, title, "pdf", content)
        setDocumentCache((prev) => ({
          ...prev,
          [projectId]: (prev[projectId] ?? []).map((d) => (d.id === tempId ? doc : d)),
        }))
        return doc
      } catch (error) {
        setDocumentCache((prev) => ({
          ...prev,
          [projectId]: (prev[projectId] ?? []).filter((d) => d.id !== tempId),
        }))
        throw error
      }
    },

    renameDocument: async (id, title) => {
      // Find the document across all projects
      let originalDoc: Document | undefined
      for (const docs of Object.values(documentCache)) {
        const found = docs.find((d) => d.id === id)
        if (found) {
          originalDoc = found
          break
        }
      }

      setDocumentCache((prev) => {
        const next = { ...prev }
        for (const projectId of Object.keys(next)) {
          next[projectId] = next[projectId].map((d) => (d.id === id ? { ...d, title } : d))
        }
        return next
      })

      try {
        const updated = await api.updateDocument(id, { title })
        setDocumentCache((prev) => {
          const next = { ...prev }
          for (const projectId of Object.keys(next)) {
            next[projectId] = next[projectId].map((d) => (d.id === id ? updated : d))
          }
          return next
        })
      } catch (error) {
        if (originalDoc) {
          const doc = originalDoc
          setDocumentCache((prev) => {
            const next = { ...prev }
            for (const projectId of Object.keys(next)) {
              next[projectId] = next[projectId].map((d) => (d.id === id ? doc : d))
            }
            return next
          })
        }
        throw error
      }
    },

    updateDocumentContent: async (id, content) => {
      // Find the document
      let originalDoc: Document | undefined
      for (const docs of Object.values(documentCache)) {
        const found = docs.find((d) => d.id === id)
        if (found) {
          originalDoc = found
          break
        }
      }

      setDocumentCache((prev) => {
        const next = { ...prev }
        for (const projectId of Object.keys(next)) {
          next[projectId] = next[projectId].map((d) => (d.id === id ? { ...d, content } : d))
        }
        return next
      })

      try {
        const updated = await api.updateDocument(id, { content })
        setDocumentCache((prev) => {
          const next = { ...prev }
          for (const projectId of Object.keys(next)) {
            next[projectId] = next[projectId].map((d) => (d.id === id ? updated : d))
          }
          return next
        })
      } catch (error) {
        if (originalDoc) {
          const doc = originalDoc
          setDocumentCache((prev) => {
            const next = { ...prev }
            for (const projectId of Object.keys(next)) {
              next[projectId] = next[projectId].map((d) => (d.id === id ? doc : d))
            }
            return next
          })
        }
        throw error
      }
    },

    deleteDocument: async (id) => {
      // Find the document
      let originalDoc: Document | undefined
      let docProjectId: string | undefined
      for (const [projectId, docs] of Object.entries(documentCache)) {
        const found = docs.find((d) => d.id === id)
        if (found) {
          originalDoc = found
          docProjectId = projectId
          break
        }
      }

      setDocumentCache((prev) => {
        const next = { ...prev }
        for (const projectId of Object.keys(next)) {
          next[projectId] = next[projectId].filter((d) => d.id !== id)
        }
        return next
      })

      try {
        await api.deleteDocument(id)
      } catch (error) {
        if (originalDoc && docProjectId) {
          const doc = originalDoc
          setDocumentCache((prev) => ({
            ...prev,
            [docProjectId as string]: [...(prev[docProjectId as string] ?? []), doc],
          }))
        }
        throw error
      }
    },
  }), [projects, documentCache, loading, error, refreshProjects])

  return <ProjectContext.Provider value={contextValue}>{children}</ProjectContext.Provider>
}
