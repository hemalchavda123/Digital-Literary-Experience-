"use client"

import { useParams, useRouter } from "next/navigation"
import { useState, useEffect, useMemo, useRef } from "react"
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
import { Filter, X as CloseIcon } from "lucide-react"

const PdfViewer = dynamic(() => import("@/components/pdf/PdfViewer").then(mod => mod.PdfViewer), { ssr: false })

export default function DocumentPage() {
  const params = useParams<{ docId: string }>()
  const router = useRouter()
  const { getDocumentById, renameDocument, deleteDocument, getProjectById } = useProjects()
  const { labels, annotations, fetchLabels, fetchAnnotations } = useAnnotations()
  const [doc, setDoc] = useState<Document | null>(null)
  const [docLoading, setDocLoading] = useState(true)
  const [title, setTitle] = useState("")
  const [showLabelManager, setShowLabelManager] = useState(false)
  const [selectedAnnotations, setSelectedAnnotations] = useState<TextAnnotation[]>([])
  const [pdfTextContent, setPdfTextContent] = useState<string | null>(null)
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<{ userId: string | null; labelId: string | null }>({ userId: null, labelId: null })
  const [hoveredAnnotationId, setHoveredAnnotationId] = useState<string | null>(null)
  const pdfContainerRef = useRef<HTMLDivElement>(null)

  // Function to extract text using the same TreeWalker approach as getRangeForOffsets
  const getHighlightedText = (startOffset: number, endOffset: number): string | null => {
    if (!pdfContainerRef.current) return null
    let text = ''
    let currentOffset = 0
    const walker = document.createTreeWalker(pdfContainerRef.current, NodeFilter.SHOW_TEXT, null)
    let node = walker.nextNode()

    while (node) {
      const nodeLength = node.nodeValue?.length || 0
      if (currentOffset + nodeLength > startOffset && currentOffset < endOffset) {
        const nodeStart = Math.max(0, startOffset - currentOffset)
        const nodeEnd = Math.min(nodeLength, endOffset - currentOffset)
        text += node.nodeValue?.slice(nodeStart, nodeEnd) || ''
      }
      currentOffset += nodeLength
      if (currentOffset >= endOffset) break
      node = walker.nextNode()
    }
    return text || null
  }

  // Get unique users from annotations for the person filter
  const uniqueUsers = useMemo(() => {
    const users = new Map<string, { id: string; username: string }>()
    annotations.forEach(ann => {
      if (ann.user && ann.userId && !users.has(ann.userId)) {
        const username = ann.user.username || "Unknown"
        users.set(ann.userId, { id: ann.userId, username })
      }
    })
    return Array.from(users.values())
  }, [annotations])

  // Filter annotations based on selected filters
  const filteredAnnotations = useMemo(() => {
    return annotations.filter((ann) => {
      if (filters.userId && ann.userId !== filters.userId) return false
      if (filters.labelId && ann.labelId !== filters.labelId) return false
      return true
    })
  }, [annotations, filters])

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

  // Fetch current user and check auth
  useEffect(() => {
    async function checkAuth() {
      try {
        const user = await getCurrentUser()
        if (!user) {
          router.replace("/signup2")
        } else {
          setCurrentUser(user)
        }
      } catch (error) {
        router.replace("/signup2")
      }
    }
    checkAuth()
  }, [router])

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
      <header className="border-b border-gray-200 bg-white">
        <div className="h-14 flex items-center justify-between px-6 bg-white">
          <div className="flex items-center gap-4 min-w-0">
            <button
              type="button"
              onClick={() => router.push(`/project/${doc.projectId}`)}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              ←
            </button>
            <div className="h-6 w-px bg-gray-200" />
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              className="min-w-0 flex-1 border-none bg-transparent text-base font-semibold text-gray-900 focus:outline-none placeholder:text-gray-400"
              placeholder="Document title"
            />
          </div>
          <div className="flex items-center gap-2">
            {/* Filter button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                showFilters 
                  ? 'bg-[#a17038] text-white' 
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
              }`}
            >
              <Filter size={14} />
              <span>Filters</span>
              {(filters.userId || filters.labelId) && (
                <span className={`ml-1 text-xs px-1.5 py-0.5 rounded ${
                  showFilters ? 'bg-white/20 text-white' : 'bg-[#a17038] text-white'
                }`}>
                  {Number(!!filters.userId) + Number(!!filters.labelId)}
                </span>
              )}
            </button>
            
            {/* Filter dropdowns (shown inline when filters are active) */}
            {showFilters && (
              <>
                <div className="h-6 w-px bg-gray-200" />
                <select
                  value={filters.userId || ""}
                  onChange={(e) => setFilters({ ...filters, userId: e.target.value || null })}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#a17038] focus:border-transparent"
                >
                  <option value="">All users</option>
                  {uniqueUsers.map(user => (
                    <option key={user.id} value={user.id}>{user.username}</option>
                  ))}
                </select>
                <select
                  value={filters.labelId || ""}
                  onChange={(e) => setFilters({ ...filters, labelId: e.target.value || null })}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#a17038] focus:border-transparent"
                >
                  <option value="">All labels</option>
                  {labels.map(label => (
                    <option key={label.id} value={label.id}>{label.name}</option>
                  ))}
                </select>
                {(filters.userId || filters.labelId) && (
                  <button
                    onClick={() => setFilters({ userId: null, labelId: null })}
                    className="text-xs font-medium text-gray-600 hover:text-gray-900 flex items-center gap-1 px-2 py-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <CloseIcon size={12} />
                    Clear
                  </button>
                )}
              </>
            )}
            
            <div className="h-6 w-px bg-gray-200" />
            <button
              type="button"
              onClick={() => setShowLabelManager(true)}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Manage Labels
            </button>
            {isOwner && (
              <button
                type="button"
                onClick={() => setIsPermissionsModalOpen(true)}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Permissions
              </button>
            )}
            <button
              type="button"
              onClick={handleDelete}
              className="px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </header>

      {/* Google Docs–style: light gray canvas with centered white page */}
      <main className="flex-1 w-full flex bg-white overflow-hidden min-h-0">
        {/* Left: renderer has its own scrollbar */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          <div className="flex-1 overflow-auto min-h-0">
          {doc.kind === "pdf" ? (
            // Scrollable PDF viewer with centered white "page"
            <div className="flex-1 flex justify-center py-8">
              <div className="w-full max-w-5xl px-4">
                <div className="bg-white shadow-md rounded-sm min-h-[80vh]">
                  <PdfViewer 
                    doc={{ ...doc, pdfUrl: pdfSource }}
                    onTextContentChange={setPdfTextContent}
                    onAnnotationClick={(anns) => setSelectedAnnotations(anns)}
                    filteredAnnotations={filteredAnnotations}
                    containerRef={pdfContainerRef}
                    hoveredAnnotationId={hoveredAnnotationId}
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
                      filteredAnnotations={filteredAnnotations}
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
          onAnnotationHover={setHoveredAnnotationId}
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
