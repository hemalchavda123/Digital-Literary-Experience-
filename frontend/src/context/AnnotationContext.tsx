"use client"

import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode, useCallback } from "react"
import { AnnotationLabel, TextAnnotation } from "@/types/annotation"
import * as api from "@/lib/api/annotations"
import { useSocket } from "@/context/SocketContext"

type CommentCreatedEvent = { annotationId: string; comment: NonNullable<TextAnnotation["comments"]>[number] }
type CommentUpdatedEvent = { annotationId: string; comment: NonNullable<TextAnnotation["comments"]>[number] }
type CommentDeletedEvent = { annotationId: string; commentId: string }

type AnnotationContextValue = {
  labels: AnnotationLabel[]
  annotations: TextAnnotation[]
  filteredAnnotations: TextAnnotation[]
  loading: boolean
  error: string | null
  filters: {
    userId: string | null
    labelId: string | null
  }
  setFilters: (filters: { userId: string | null; labelId: string | null }) => void
  clearFilters: () => void
  fetchLabels: (projectId: string) => Promise<void>
  fetchAnnotations: (docId: string) => Promise<void>
  addLabel: (projectId: string, name: string, color: string) => Promise<AnnotationLabel>
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
  const [loading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeDocId, setActiveDocId] = useState<string | null>(null)
  const [filters, setFiltersState] = useState<{ userId: string | null; labelId: string | null }>({ userId: null, labelId: null })
  
  const { socket } = useSocket()

  const setFilters = (newFilters: { userId: string | null; labelId: string | null }) => {
    setFiltersState(newFilters)
  }

  const clearFilters = () => {
    setFiltersState({ userId: null, labelId: null })
  }

  const filteredAnnotations = useMemo(() => {
    return annotations.filter((ann) => {
      if (filters.userId && ann.userId !== filters.userId) return false
      if (filters.labelId && ann.labelId !== filters.labelId) return false
      return true
    })
  }, [annotations, filters])

  const fetchLabels = useCallback(async (projectId: string) => {
    try {
      const data = await api.getLabelsForProject(projectId)
      setLabels(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch labels")
    }
  }, [])

  const fetchAnnotations = useCallback(async (docId: string) => {
    try {
      const data = await api.getAnnotationsForDocument(docId)
      setAnnotations(data)
      setActiveDocId(docId)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch annotations")
    }
  }, [])

  useEffect(() => {
    if (!socket || !activeDocId) return

    const onAnnotationCreated = (annotation: TextAnnotation) => {
      if (annotation.docId !== activeDocId) return
      setAnnotations((prev) => {
        if (prev.some((a) => a.id === annotation.id)) return prev
        return [...prev, annotation]
      })
    }

    const onAnnotationUpdated = (annotation: TextAnnotation) => {
      if (annotation.docId !== activeDocId) return
      setAnnotations((prev) => prev.map((a) => (a.id === annotation.id ? annotation : a)))
    }

    const onAnnotationDeleted = ({ id, docId }: { id: string; docId: string }) => {
      if (docId !== activeDocId) return
      setAnnotations((prev) => prev.filter((a) => a.id !== id))
    }

    const onCommentCreated = (payload: CommentCreatedEvent) => {
      setAnnotations((prev) =>
        prev.map((a) => {
          if (a.id !== payload.annotationId) return a
          const existing = (a.comments || []).some((c) => c.id === payload.comment.id)
          if (existing) return a
          return { ...a, comments: [...(a.comments || []), payload.comment] }
        })
      )
    }

    const onCommentUpdated = (payload: CommentUpdatedEvent) => {
      setAnnotations((prev) =>
        prev.map((a) => {
          if (a.id !== payload.annotationId) return a
          return {
            ...a,
            comments: (a.comments || []).map((c) => (c.id === payload.comment.id ? payload.comment : c)),
          }
        })
      )
    }

    const onCommentDeleted = (payload: CommentDeletedEvent) => {
      setAnnotations((prev) =>
        prev.map((a) => {
          if (a.id !== payload.annotationId) return a
          return { ...a, comments: (a.comments || []).filter((c) => c.id !== payload.commentId) }
        })
      )
    }

    socket.on("annotation_created", onAnnotationCreated)
    socket.on("annotation_updated", onAnnotationUpdated)
    socket.on("annotation_deleted", onAnnotationDeleted)
    socket.on("comment_created", onCommentCreated)
    socket.on("comment_updated", onCommentUpdated)
    socket.on("comment_deleted", onCommentDeleted)

    return () => {
      socket.off("annotation_created", onAnnotationCreated)
      socket.off("annotation_updated", onAnnotationUpdated)
      socket.off("annotation_deleted", onAnnotationDeleted)
      socket.off("comment_created", onCommentCreated)
      socket.off("comment_updated", onCommentUpdated)
      socket.off("comment_deleted", onCommentDeleted)
    }
  }, [socket, activeDocId])

  const addLabel = async (projectId: string, name: string, color: string) => {
    try {
      const newLabel = await api.createLabel(projectId, name, color)
      setLabels((prev) => [...prev, newLabel])
      return newLabel
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create label")
      throw err
    }
  }

  const editLabel = async (id: string, name: string, color: string) => {
    try {
      const updated = await api.updateLabel(id, name, color)
      setLabels((prev) => prev.map((l) => (l.id === id ? updated : l)))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update label")
      throw err
    }
  }

  const removeLabel = async (id: string) => {
    try {
      await api.deleteLabel(id)
      setLabels((prev) => prev.filter((l) => l.id !== id))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete label")
      throw err
    }
  }

  const addAnnotation = async (docId: string, labelId: string, startOffset: number, endOffset: number, content = "") => {
    // Optimistically add annotation with temporary ID
    const tempId = `temp-${Date.now()}`
    const tempAnn: TextAnnotation = {
      id: tempId,
      docId,
      labelId,
      startOffset,
      endOffset,
      content,
      userId: "", // Will be filled by server
      user: undefined,
      comments: []
    }
    setAnnotations((prev) => [...prev, tempAnn])

    try {
      const newAnn = await api.createAnnotation(docId, labelId, startOffset, endOffset, content)
      // Replace temp annotation with real one from server
      setAnnotations((prev) => prev.map((a) => a.id === tempId ? newAnn : a))
    } catch (err: unknown) {
      // Remove temp annotation on error
      setAnnotations((prev) => prev.filter((a) => a.id !== tempId))
      setError(err instanceof Error ? err.message : "Failed to create annotation")
      throw err
    }
  }

  const editAnnotation = async (id: string, content: string, labelId?: string) => {
    const originalAnn = annotations.find(a => a.id === id)
    setAnnotations((prev) => prev.map((a) => (a.id === id ? { ...a, content, labelId: labelId ?? a.labelId } : a)))
    try {
      const updated = await api.updateAnnotation(id, content, labelId)
      setAnnotations((prev) => prev.map((a) => (a.id === id ? updated : a)))
    } catch (err: unknown) {
      if (originalAnn) {
        setAnnotations((prev) => prev.map((a) => (a.id === id ? originalAnn : a)))
      }
      setError(err instanceof Error ? err.message : "Failed to update annotation")
      throw err
    }
  }

  const removeAnnotation = async (id: string) => {
    const originalAnn = annotations.find(a => a.id === id)
    setAnnotations((prev) => prev.filter((a) => a.id !== id))
    try {
      await api.deleteAnnotation(id)
    } catch (err: unknown) {
      if (originalAnn) {
        setAnnotations((prev) => [...prev, originalAnn])
      }
      setError(err instanceof Error ? err.message : "Failed to delete annotation")
      throw err
    }
  }

  const addComment = async (annotationId: string, content: string) => {
    const tempId = `temp-comment-${Date.now()}`
    const tempComment = {
      id: tempId,
      annotationId,
      userId: "",
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      user: { username: "Posting..." }
    }
    
    setAnnotations((prev) => prev.map((a) => {
      if (a.id === annotationId) {
        return { ...a, comments: [...(a.comments || []), tempComment as any] }
      }
      return a
    }))

    try {
      const newComment = await api.createAnnotationComment(annotationId, content)
      setAnnotations((prev) => prev.map((a) => {
        if (a.id === annotationId) {
          return { ...a, comments: (a.comments || []).map(c => c.id === tempId ? newComment : c) }
        }
        return a
      }))
    } catch (err: unknown) {
      setAnnotations((prev) => prev.map((a) => {
        if (a.id === annotationId) {
          return { ...a, comments: (a.comments || []).filter(c => c.id !== tempId) }
        }
        return a
      }))
      setError(err instanceof Error ? err.message : "Failed to create reply")
      throw err
    }
  }

  const removeComment = async (annotationId: string, commentId: string) => {
    let originalComment: any;
    setAnnotations((prev) =>
      prev.map((a) => {
        if (a.id !== annotationId) return a
        const comments = a.comments || []
        originalComment = comments.find(c => c.id === commentId)
        return { ...a, comments: comments.filter((c) => c.id !== commentId) }
      })
    )

    try {
      await api.deleteAnnotationComment(commentId)
    } catch (err: unknown) {
      if (originalComment) {
        setAnnotations((prev) =>
          prev.map((a) => {
            if (a.id !== annotationId) return a
            const arr = [...(a.comments || []), originalComment]
            arr.sort((x, y) => x.createdAt.localeCompare(y.createdAt))
            return { ...a, comments: arr }
          })
        )
      }
      setError(err instanceof Error ? err.message : "Failed to delete reply")
      throw err
    }
  }

  return (
    <AnnotationContext.Provider
      value={{
        labels,
        annotations,
        filteredAnnotations,
        loading,
        error,
        filters,
        setFilters,
        clearFilters,
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
