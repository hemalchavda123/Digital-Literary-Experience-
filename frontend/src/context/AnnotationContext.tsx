"use client"

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react"
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
    } catch (err: any) {
      setError(err.message)
    }
  }, [])

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
          return { ...a, comments: [...(a.comments || []), newComment] }
        }
        return a
      }))
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
      }}
    >
      {children}
    </AnnotationContext.Provider>
  )
}
