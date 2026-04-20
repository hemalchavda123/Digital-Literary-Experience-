"use client"

import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode, useCallback } from "react"
import { AnnotationLabel, TextAnnotation } from "@/types/annotation"
import * as api from "@/lib/api/annotations"

type AnnotationContextValue = {
  labels: AnnotationLabel[]
  annotations: TextAnnotation[]
  loading: boolean
  error: string | null
  fetchLabels: (projectId: string) => Promise<void>
  fetchAnnotations: (docId: string) => Promise<void>
  addLabel: (projectId: string, name: string, color: string) => Promise<void>
  editLabel: (id: string, name: string, color: string) => Promise<void>
  removeLabel: (id: string) => Promise<void>
  addAnnotation: (docId: string, labelId: string, startOffset: number, endOffset: number, content?: string) => Promise<void>
  editAnnotation: (id: string, content: string, labelId?: string) => Promise<void>
  removeAnnotation: (id: string) => Promise<void>
  addComment: (annotationId: string, content: string) => Promise<void>
  removeComment: (annotationId: string, commentId: string) => Promise<void>
}

const AnnotationContext = createContext<AnnotationContextValue | undefined>(undefined)

export function useAnnotations() {
  const ctx = useContext(AnnotationContext)
  if (!ctx) throw new Error("useAnnotations must be used within AnnotationProvider")
  return ctx
}

export function AnnotationProvider({ children }: { children: ReactNode }) {
  const [labels, setLabels] = useState<AnnotationLabel[]>([])
  const [annotations, setAnnotations] = useState<TextAnnotation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeDocId, setActiveDocId] = useState<string | null>(null)
  const sseRef = useRef<EventSource | null>(null)

  const API_BASE_URL = useMemo(() => {
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
  }, [])

  const fetchLabels = useCallback(async (projectId: string) => {
    try {
      const data = await api.getLabelsForProject(projectId)
      setLabels(data)
    } catch (err: any) {
      setError(err.message)
    }
  }, [])

  const fetchAnnotations = useCallback(async (docId: string) => {
    try {
      const data = await api.getAnnotationsForDocument(docId)
      setAnnotations(data)
      setActiveDocId(docId)
    } catch (err: any) {
      setError(err.message)
    }
  }, [])

  useEffect(() => {
    if (!activeDocId) return
    if (typeof window === "undefined") return

    // Reset existing stream on doc change
    if (sseRef.current) {
      sseRef.current.close()
      sseRef.current = null
    }

    let cancelled = false

    async function connect() {
      try {
        const { streamToken } = await api.createAnnotationStreamToken(activeDocId)
        if (cancelled) return
        const url = `${API_BASE_URL}/annotations/stream/doc/${activeDocId}?token=${encodeURIComponent(streamToken)}`
        const es = new EventSource(url)
        sseRef.current = es

        const onCreated = (e: MessageEvent) => {
          try {
            const payload = JSON.parse(e.data) as { annotationId: string; comment: any }
            setAnnotations((prev) =>
              prev.map((a) => {
                if (a.id !== payload.annotationId) return a
                const existing = (a.comments || []).some((c) => c.id === payload.comment.id)
                if (existing) return a
                return { ...a, comments: [...(a.comments || []), payload.comment] }
              })
            )
          } catch {}
        }

        const onUpdated = (e: MessageEvent) => {
          try {
            const payload = JSON.parse(e.data) as { annotationId: string; comment: any }
            setAnnotations((prev) =>
              prev.map((a) => {
                if (a.id !== payload.annotationId) return a
                return {
                  ...a,
                  comments: (a.comments || []).map((c) => (c.id === payload.comment.id ? payload.comment : c)),
                }
              })
            )
          } catch {}
        }

        const onDeleted = (e: MessageEvent) => {
          try {
            const payload = JSON.parse(e.data) as { annotationId: string; commentId: string }
            setAnnotations((prev) =>
              prev.map((a) => {
                if (a.id !== payload.annotationId) return a
                return { ...a, comments: (a.comments || []).filter((c) => c.id !== payload.commentId) }
              })
            )
          } catch {}
        }

        es.addEventListener("comment_created", onCreated as any)
        es.addEventListener("comment_updated", onUpdated as any)
        es.addEventListener("comment_deleted", onDeleted as any)

        es.onerror = () => {
          // Reconnect by fetching a fresh stream token (old one may have expired).
          es.close()
          if (cancelled) return
          // small delay to avoid tight loops
          setTimeout(() => {
            if (!cancelled) connect()
          }, 1000)
        }

        return () => {
          es.removeEventListener("comment_created", onCreated as any)
          es.removeEventListener("comment_updated", onUpdated as any)
          es.removeEventListener("comment_deleted", onDeleted as any)
          es.close()
        }
      } catch {
        // If token creation fails (e.g., auth expired), just stop streaming.
      }
    }

    let cleanup: void | (() => void)
    connect().then((c) => {
      cleanup = c
    })

    return () => {
      cancelled = true
      if (cleanup) cleanup()
      if (sseRef.current) {
        sseRef.current.close()
        sseRef.current = null
      }
    }
  }, [API_BASE_URL, activeDocId])

  const addLabel = async (projectId: string, name: string, color: string) => {
    try {
      const newLabel = await api.createLabel(projectId, name, color)
      setLabels((prev) => [...prev, newLabel])
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  const editLabel = async (id: string, name: string, color: string) => {
    try {
      const updated = await api.updateLabel(id, name, color)
      setLabels((prev) => prev.map((l) => (l.id === id ? updated : l)))
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  const removeLabel = async (id: string) => {
    try {
      await api.deleteLabel(id)
      setLabels((prev) => prev.filter((l) => l.id !== id))
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  const addAnnotation = async (docId: string, labelId: string, startOffset: number, endOffset: number, content = "") => {
    try {
      const newAnn = await api.createAnnotation(docId, labelId, startOffset, endOffset, content)
      setAnnotations((prev) => [...prev, newAnn])
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  const editAnnotation = async (id: string, content: string, labelId?: string) => {
    try {
      const updated = await api.updateAnnotation(id, content, labelId)
      setAnnotations((prev) => prev.map((a) => (a.id === id ? updated : a)))
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  const removeAnnotation = async (id: string) => {
    try {
      await api.deleteAnnotation(id)
      setAnnotations((prev) => prev.filter((a) => a.id !== id))
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  const addComment = async (annotationId: string, content: string) => {
    try {
      const newComment = await api.createAnnotationComment(annotationId, content)
      setAnnotations((prev) => prev.map((a) => {
        if (a.id === annotationId) {
          const existing = (a.comments || []).some((c) => c.id === newComment.id)
          if (existing) return a
          return { ...a, comments: [...(a.comments || []), newComment] }
        }
        return a
      }))
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  const removeComment = async (annotationId: string, commentId: string) => {
    try {
      await api.deleteAnnotationComment(commentId)
      // Optimistic local update (SSE will also broadcast to other clients)
      setAnnotations((prev) =>
        prev.map((a) => {
          if (a.id !== annotationId) return a
          return { ...a, comments: (a.comments || []).filter((c) => c.id !== commentId) }
        })
      )
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  return (
    <AnnotationContext.Provider
      value={{
        labels,
        annotations,
        loading,
        error,
        fetchLabels,
        fetchAnnotations,
        addLabel,
        editLabel,
        removeLabel,
        addAnnotation,
        editAnnotation,
        removeAnnotation,
        addComment,
        removeComment,
      }}
    >
      {children}
    </AnnotationContext.Provider>
  )
}
