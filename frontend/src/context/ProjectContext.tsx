"use client"

import { createContext, useContext, useEffect, useMemo, useState, useCallback, ReactNode, useRef } from "react"
import type { Project } from "@/types/project"
import type { Document } from "@/types/document"
import type { Announcement } from "@/types/announcement"
import type { Assignment } from "@/types/assignment"
import * as api from "@/lib/api/projects"
import * as announcementApi from "@/lib/api/announcements"
import * as assignmentApi from "@/lib/api/assignments"
import { useSocket } from "@/context/SocketContext"

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
  announcementsForProject: (projectId: string) => Announcement[]
  fetchAnnouncements: (projectId: string) => Promise<Announcement[]>
  createAnnouncement: (projectId: string, content: string) => Promise<Announcement>
  deleteAnnouncement: (projectId: string, announcementId: string) => Promise<void>
  addReplyToAnnouncement: (projectId: string, announcementId: string, content: string) => Promise<void>
  removeReplyFromAnnouncement: (projectId: string, announcementId: string, replyId: string) => Promise<void>
  assignmentsForProject: (projectId: string) => Assignment[]
  fetchAssignments: (projectId: string) => Promise<Assignment[]>
  createAssignment: (projectId: string, title: string, description: string, dueDate?: string, totalMarks?: number, documentId?: string) => Promise<Assignment>
  deleteAssignment: (projectId: string, assignmentId: string) => Promise<void>
  updateAssignmentStatus: (projectId: string, assignmentId: string, userId: string, status?: string, grade?: string) => Promise<void>
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
  const [announcementCache, setAnnouncementCache] = useState<Record<string, Announcement[]>>({})
  const [assignmentCache, setAssignmentCache] = useState<Record<string, Assignment[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const tokenRef = useRef<string | null>(null)
  const { socket, joinProject, leaveProject } = useSocket()

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

  // Socket event listeners
  useEffect(() => {
    if (!socket) return

    const onAnnouncementCreated = (announcement: Announcement) => {
      setAnnouncementCache((prev) => {
        const projectId = announcement.projectId
        const existing = prev[projectId] ?? []
        if (existing.some((a) => a.id === announcement.id)) return prev
        const newAnn = { ...announcement, replies: announcement.replies || [] }
        return { ...prev, [projectId]: [newAnn, ...existing] }
      })
    }

    const onAnnouncementDeleted = (announcementId: string) => {
      setAnnouncementCache((prev) => {
        const next = { ...prev }
        for (const [projectId, anns] of Object.entries(next)) {
          next[projectId] = anns.filter((a) => a.id !== announcementId)
        }
        return next
      })
    }

    const onReplyAdded = ({ announcementId, reply }: { announcementId: string, reply: any }) => {
      setAnnouncementCache((prev) => {
        const next = { ...prev }
        for (const [projectId, anns] of Object.entries(next)) {
          next[projectId] = anns.map((ann) => {
            if (ann.id === announcementId) {
              const replies = ann.replies ?? []
              if (replies.some(r => r.id === reply.id)) return ann
              return { ...ann, replies: [...replies, reply] }
            }
            return ann
          })
        }
        return next
      })
    }

    const onReplyDeleted = ({ announcementId, replyId }: { announcementId: string, replyId: string }) => {
      setAnnouncementCache((prev) => {
        const next = { ...prev }
        for (const [projectId, anns] of Object.entries(next)) {
          next[projectId] = anns.map((ann) => {
            if (ann.id === announcementId) {
              const replies = ann.replies ?? []
              return { ...ann, replies: replies.filter(r => r.id !== replyId) }
            }
            return ann
          })
        }
        return next
      })
    }

    socket.on('announcement_created', onAnnouncementCreated)
    socket.on('announcement_deleted', onAnnouncementDeleted)
    socket.on('reply_added', onReplyAdded)
    socket.on('reply_deleted', onReplyDeleted)

    return () => {
      socket.off('announcement_created', onAnnouncementCreated)
      socket.off('announcement_deleted', onAnnouncementDeleted)
      socket.off('reply_added', onReplyAdded)
      socket.off('reply_deleted', onReplyDeleted)
    }
  }, [socket])

  // Assignment socket listeners
  useEffect(() => {
    if (!socket) return

    const onAssignmentCreated = (assignment: Assignment) => {
      setAssignmentCache((prev) => {
        const projectId = assignment.projectId
        const existing = prev[projectId] ?? []
        if (existing.some((a) => a.id === assignment.id)) return prev
        return { ...prev, [projectId]: [assignment, ...existing] }
      })
    }

    const onAssignmentDeleted = (assignmentId: string) => {
      setAssignmentCache((prev) => {
        const next = { ...prev }
        for (const projectId of Object.keys(next)) {
          next[projectId] = next[projectId].filter((a) => a.id !== assignmentId)
        }
        return next
      })
    }

    const onAssignmentStatusUpdated = ({
      assignmentId,
      status: updatedStatus,
    }: {
      assignmentId: string
      status: Assignment['statuses'][number]
    }) => {
      setAssignmentCache((prev) => {
        const next = { ...prev }
        for (const projectId of Object.keys(next)) {
          next[projectId] = next[projectId].map((a) => {
            if (a.id !== assignmentId) return a
            const newStatuses = (a.statuses ?? []).map((s) =>
              s.id === updatedStatus.id ? updatedStatus : s
            )
            // If not found (e.g., new member), add it
            if (!newStatuses.some((s) => s.id === updatedStatus.id)) {
              newStatuses.push(updatedStatus)
            }
            return { ...a, statuses: newStatuses }
          })
        }
        return next
      })
    }

    socket.on('assignment_created', onAssignmentCreated)
    socket.on('assignment_deleted', onAssignmentDeleted)
    socket.on('assignment_status_updated', onAssignmentStatusUpdated)

    return () => {
      socket.off('assignment_created', onAssignmentCreated)
      socket.off('assignment_deleted', onAssignmentDeleted)
      socket.off('assignment_status_updated', onAssignmentStatusUpdated)
    }
  }, [socket])

  const contextValue: ProjectContextValue = useMemo(() => ({
    projects,
    loading,
    error,
    refreshProjects,

    getProjectById: (id) => projects.find((p) => p.id === id),

    documentsForProject: (projectId) => documentCache[projectId] ?? [],
    assignmentsForProject: (projectId) => assignmentCache[projectId] ?? [],

    fetchDocuments: async (projectId) => {
      try {
        joinProject(projectId)
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
      try {
        const doc = await api.createDocument(projectId, title, "text")
        setDocumentCache((prev) => ({
          ...prev,
          [projectId]: [...(prev[projectId] ?? []), doc],
        }))
        return doc
      } catch (error) {
        throw error
      }
    },

    createPdfDocument: async (projectId, title, content) => {
      try {
        const doc = await api.createDocument(projectId, title, "pdf", content)
        setDocumentCache((prev) => ({
          ...prev,
          [projectId]: [...(prev[projectId] ?? []), doc],
        }))
        return doc
      } catch (error) {
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

    announcementsForProject: (projectId) => announcementCache[projectId] ?? [],

    fetchAnnouncements: async (projectId) => {
      try {
        joinProject(projectId)
        const items = await announcementApi.getAnnouncements(projectId)
        setAnnouncementCache((prev) => ({ ...prev, [projectId]: items }))
        return items
      } catch (err: any) {
        setError(err.message)
        return []
      }
    },

    createAnnouncement: async (projectId, content) => {
      const tempId = `temp-ann-${Date.now()}`
      const optimisticAnn: Announcement = {
        id: tempId,
        projectId,
        content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      setAnnouncementCache((prev) => ({
        ...prev,
        [projectId]: [optimisticAnn, ...(prev[projectId] ?? [])],
      }))

      try {
        const item = await announcementApi.createAnnouncement(projectId, content)
        setAnnouncementCache((prev) => ({
          ...prev,
          [projectId]: (prev[projectId] ?? []).map((a) => (a.id === tempId ? item : a)),
        }))
        return item
      } catch (error) {
        setAnnouncementCache((prev) => ({
          ...prev,
          [projectId]: (prev[projectId] ?? []).filter((a) => a.id !== tempId),
        }))
        throw error
      }
    },

    deleteAnnouncement: async (projectId, announcementId) => {
      const originalAnn = (announcementCache[projectId] ?? []).find((a) => a.id === announcementId)

      setAnnouncementCache((prev) => ({
        ...prev,
        [projectId]: (prev[projectId] ?? []).filter((a) => a.id !== announcementId),
      }))

      try {
        await announcementApi.deleteAnnouncement(projectId, announcementId)
      } catch (error) {
        if (originalAnn) {
          setAnnouncementCache((prev) => {
            const arr = [...(prev[projectId] ?? [])]
            arr.push(originalAnn)
            arr.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            return { ...prev, [projectId]: arr }
          })
        }
        throw error
      }
    },

    addReplyToAnnouncement: async (projectId, announcementId, content) => {
      const tempId = `temp-reply-${Date.now()}`
      const optimisticReply = {
        id: tempId,
        announcementId,
        userId: "",
        content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        user: { username: "Posting..." }
      }

      setAnnouncementCache((prev) => {
        const projectAnns = prev[projectId] ?? []
        const updatedAnns = projectAnns.map((ann) => {
          if (ann.id === announcementId) {
            return {
              ...ann,
              replies: [...(ann.replies ?? []), optimisticReply as any]
            }
          }
          return ann
        })
        return { ...prev, [projectId]: updatedAnns }
      })

      try {
        const reply = await announcementApi.createAnnouncementReply(projectId, announcementId, content)
        setAnnouncementCache((prev) => {
          const projectAnns = prev[projectId] ?? []
          const updatedAnns = projectAnns.map((ann) => {
            if (ann.id === announcementId) {
              return {
                ...ann,
                replies: (ann.replies ?? []).map(r => r.id === tempId ? reply : r)
              }
            }
            return ann
          })
          return { ...prev, [projectId]: updatedAnns }
        })
      } catch (error) {
        setAnnouncementCache((prev) => {
          const projectAnns = prev[projectId] ?? []
          const updatedAnns = projectAnns.map((ann) => {
            if (ann.id === announcementId) {
              return {
                ...ann,
                replies: (ann.replies ?? []).filter(r => r.id !== tempId)
              }
            }
            return ann
          })
          return { ...prev, [projectId]: updatedAnns }
        })
        throw error
      }
    },

    removeReplyFromAnnouncement: async (projectId, announcementId, replyId) => {
      let originalReply: any;
      setAnnouncementCache((prev) => {
        const projectAnns = prev[projectId] ?? []
        const updatedAnns = projectAnns.map((ann) => {
          if (ann.id === announcementId) {
            const replies = ann.replies ?? []
            originalReply = replies.find(r => r.id === replyId)
            return {
              ...ann,
              replies: replies.filter(r => r.id !== replyId)
            }
          }
          return ann
        })
        return { ...prev, [projectId]: updatedAnns }
      })

      try {
        await announcementApi.deleteAnnouncementReply(projectId, announcementId, replyId)
      } catch (error) {
        if (originalReply) {
          setAnnouncementCache((prev) => {
            const projectAnns = prev[projectId] ?? []
            const updatedAnns = projectAnns.map((ann) => {
              if (ann.id === announcementId) {
                const arr = [...(ann.replies ?? []), originalReply]
                arr.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
                return { ...ann, replies: arr }
              }
              return ann
            })
            return { ...prev, [projectId]: updatedAnns }
          })
        }
        throw error
      }
    },

    fetchAssignments: async (projectId) => {
      try {
        const items = await assignmentApi.getAssignments(projectId)
        setAssignmentCache((prev) => ({ ...prev, [projectId]: items }))
        return items
      } catch (err: any) {
        return []
      }
    },

    createAssignment: async (projectId, title, description, dueDate, totalMarks, documentId) => {
      const tempId = `temp-assignment-${Date.now()}`
      const optimistic: Assignment = {
        id: tempId,
        projectId,
        documentId: documentId ?? null,
        document: documentId ? undefined : null,
        title,
        description,
        dueDate: dueDate ?? null,
        totalMarks: totalMarks ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        statuses: [],
      }
      setAssignmentCache((prev) => ({
        ...prev,
        [projectId]: [optimistic, ...(prev[projectId] ?? [])],
      }))
      try {
        const item = await assignmentApi.createAssignment(projectId, title, description, dueDate, totalMarks, documentId)
        setAssignmentCache((prev) => ({
          ...prev,
          [projectId]: (prev[projectId] ?? []).map((a) => (a.id === tempId ? item : a)),
        }))
        return item
      } catch (error) {
        setAssignmentCache((prev) => ({
          ...prev,
          [projectId]: (prev[projectId] ?? []).filter((a) => a.id !== tempId),
        }))
        throw error
      }
    },

    deleteAssignment: async (projectId, assignmentId) => {
      const original = (assignmentCache[projectId] ?? []).find((a) => a.id === assignmentId)
      setAssignmentCache((prev) => ({
        ...prev,
        [projectId]: (prev[projectId] ?? []).filter((a) => a.id !== assignmentId),
      }))
      try {
        await assignmentApi.deleteAssignment(projectId, assignmentId)
      } catch (error) {
        if (original) {
          setAssignmentCache((prev) => ({
            ...prev,
            [projectId]: [original, ...(prev[projectId] ?? [])],
          }))
        }
        throw error
      }
    },

    updateAssignmentStatus: async (projectId, assignmentId, userId, status, grade) => {
      // Wait for backend — then update cache with real server response
      const updated = await assignmentApi.updateAssignmentStatus(projectId, assignmentId, userId, status, grade)
      setAssignmentCache((prev) => {
        const next = { ...prev }
        next[projectId] = (next[projectId] ?? []).map((a) => {
          if (a.id !== assignmentId) return a
          const exists = (a.statuses ?? []).some((s) => s.id === updated.id)
          const newStatuses = exists
            ? (a.statuses ?? []).map((s) => (s.id === updated.id ? updated : s))
            : [...(a.statuses ?? []), updated]
          return { ...a, statuses: newStatuses }
        })
        return next
      })
    },

  }), [projects, documentCache, announcementCache, assignmentCache, loading, error, refreshProjects, joinProject, leaveProject])

  return <ProjectContext.Provider value={contextValue}>{children}</ProjectContext.Provider>
}
