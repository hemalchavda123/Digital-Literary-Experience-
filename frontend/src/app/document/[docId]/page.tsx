"use client"

import { useParams, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { useProjects } from "@/context/ProjectContext"
import { useAnnotations } from "@/context/AnnotationContext"
import { AnnotatableText } from "@/components/document/AnnotatableText"
import { AnnotationSidebar } from "@/components/document/AnnotationSidebar"
import { LabelManagerModal } from "@/components/document/LabelManagerModal"
import { ShareModal } from "@/components/project/ShareModal"
import { TextAnnotation } from "@/types/annotation"
import type { Document } from "@/types/document"
import dynamic from "next/dynamic"
import { getCurrentUser } from "@/lib/api/authFetch"

const PdfViewer = dynamic(() => import("@/components/pdf/PdfViewer").then(mod => mod.PdfViewer), { ssr: false })

export default function DocumentPage() {
  const params = useParams<{ docId: string }>()
  const router = useRouter()
  const { getDocumentById, renameDocument, deleteDocument, getProjectById } = useProjects()
  const { fetchLabels, fetchAnnotations } = useAnnotations()
  const [doc, setDoc] = useState<Document | null>(null)
  const [docLoading, setDocLoading] = useState(true)
  const [title, setTitle] = useState("")
  const [showLabelManager, setShowLabelManager] = useState(false)
  const [selectedAnnotations, setSelectedAnnotations] = useState<TextAnnotation[]>([])
  const [pdfTextContent, setPdfTextContent] = useState<string | null>(null)
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null)

  // Fetch document from backend on mount
  useEffect(() => {
    let cancelled = false
    async function load() {
      setDocLoading(true)
      const fetched = await getDocumentById(params.docId)
      if (!cancelled) {
        setDoc(fetched)
        setTitle(fetched?.title ?? "")
        setDocLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [params.docId, getDocumentById])

  // Fetch current user
  useEffect(() => {
    getCurrentUser().then(user => setCurrentUser(user))
  }, [])

  // Fetch labels and annotations once doc is loaded
  useEffect(() => {
    if (doc) {
      fetchLabels(doc.projectId)
      fetchAnnotations(doc.id)
    }
  }, [doc, fetchLabels, fetchAnnotations])

  if (docLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col bg-white">
        <header className="h-12 border-b border-gray-200 flex items-center px-4 text-sm">
          <span className="font-medium text-gray-500">Loading…</span>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-500">Loading document…</p>
        </main>
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="min-h-screen w-full flex flex-col bg-white">
        <header className="h-12 border-b border-gray-200 flex items-center px-4 text-sm">
          <button
            type="button"
            onClick={() => router.push("/home")}
            className="text-gray-900 hover:text-black mr-3"
          >
            ← Back
          </button>
          <span className="font-medium text-gray-700">Document not found</span>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-900">The document you&apos;re looking for doesn&apos;t exist.</p>
        </main>
      </div>
    )
  }

  const handleTitleBlur = async () => {
    if (title.trim() && title.trim() !== doc.title) {
      await renameDocument(doc.id, title.trim())
      setDoc({ ...doc, title: title.trim() })
    } else {
      setTitle(doc.title)
    }
  }

  const handleDelete = async () => {
    const confirmed = window.confirm("Delete this document?")
    if (!confirmed) return
    const projectId = doc.projectId
    await deleteDocument(doc.id)
    router.push(`/project/${projectId}`)
  }

  // For PDFs stored as base64 data URLs, use the content field directly
  const pdfSource = doc.kind === "pdf" ? (doc.content || doc.pdfUrl || "") : ""

  const project = getProjectById(doc.projectId)
  const isOwner = currentUser?.id === project?.ownerId

  return (
    <div className="h-screen w-full flex flex-col bg-white">
      {/* Document viewer navbar */}
      <header className="h-12 border-b border-gray-200 flex items-center justify-between px-4 text-sm bg-white">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => router.push(`/project/${doc.projectId}`)}
            className="text-gray-900 hover:text-black"
          >
            ←
          </button>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            className="min-w-0 flex-1 border-none bg-transparent text-sm font-medium text-gray-900 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-900">
          <button
            type="button"
            onClick={() => setShowLabelManager(true)}
            className="rounded border border-gray-300 px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50"
          >
            Manage Labels
          </button>
          {isOwner && (
            <button
              type="button"
              onClick={() => setIsPermissionsModalOpen(true)}
              className="rounded border border-gray-300 px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50"
            >
              Permissions
            </button>
          )}
          <button
            type="button"
            onClick={handleDelete}
            className="rounded border border-red-300 px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </header>

      {/* Google Docs–style: light gray canvas with centered white page */}
      <main className="flex-1 w-full flex bg-gray-100 overflow-hidden min-h-0">
        {/* Left: renderer has its own scrollbar */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          <div className="flex-1 overflow-y-auto min-h-0">
          {doc.kind === "pdf" ? (
            // Scrollable PDF viewer with centered white "page"
            <div className="flex-1 flex justify-center py-8">
              <div className="w-full max-w-5xl px-4">
                <div className="bg-white shadow-md rounded-sm overflow-hidden min-h-[80vh]">
                  <PdfViewer 
                    doc={{ ...doc, pdfUrl: pdfSource }}
                    onTextContentChange={setPdfTextContent}
                    onAnnotationClick={(anns) => setSelectedAnnotations(anns)}
                  />
                </div>
              </div>
            </div>
          ) : (
            // Read-only text viewer variant with annotations
            <div className="flex-1 flex justify-center py-8">
              <div className="w-full max-w-3xl px-4">
                <article className="bg-white shadow-md rounded-sm px-6 py-6 text-sm leading-relaxed whitespace-pre-wrap text-gray-900 min-h-[80vh]">
                  {doc.content ? (
                    <AnnotatableText
                      text={doc.content}
                      docId={doc.id}
                      onAnnotationClick={(anns) => setSelectedAnnotations(anns)}
                    />
                  ) : (
                    "This document is currently empty."
                  )}
                </article>
              </div>
            </div>
          )}
          </div>
        </div>
        
        <AnnotationSidebar
          selectedAnnotations={selectedAnnotations}
          onClose={() => setSelectedAnnotations([])}
          documentText={doc.kind === "pdf" ? pdfTextContent ?? undefined : doc.content}
        />
      </main>

      {showLabelManager && (
        <LabelManagerModal
          projectId={doc.projectId}
          onClose={() => setShowLabelManager(false)}
        />
      )}
      {project && (
        <ShareModal
          isOpen={isPermissionsModalOpen}
          onClose={() => setIsPermissionsModalOpen(false)}
          projectId={project.id}
          isOwner={isOwner}
        />
      )}
    </div>
  )
}
