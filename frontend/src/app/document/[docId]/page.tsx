"use client"

import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import { useProjects } from "@/context/ProjectContext"
import { PdfViewer } from "@/components/pdf/PdfViewer"

export default function DocumentPage() {
  const params = useParams<{ docId: string }>()
  const router = useRouter()
  const { getDocumentById, renameDocument, deleteDocument } = useProjects()
  const doc = getDocumentById(params.docId)
  const [title, setTitle] = useState(doc?.title ?? "")

  if (!doc) {
    return (
      <div className="min-h-screen w-full flex flex-col bg-white">
        <header className="h-12 border-b border-gray-200 flex items-center px-4 text-sm">
          <button
            type="button"
            onClick={() => router.push("/home")}
            className="text-gray-500 hover:text-gray-800 mr-3"
          >
            ← Back
          </button>
          <span className="font-medium text-gray-700">Document not found</span>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-500">The document you&apos;re looking for doesn&apos;t exist.</p>
        </main>
      </div>
    )
  }

  const handleTitleBlur = () => {
    if (title.trim() && title.trim() !== doc.title) {
      renameDocument(doc.id, title.trim())
    } else {
      setTitle(doc.title)
    }
  }

  const handleDelete = () => {
    const confirmed = window.confirm("Delete this document?")
    if (!confirmed) return
    deleteDocument(doc.id)
    router.push(`/project/${doc.projectId}`)
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-white">
      {/* Document viewer navbar – title on the left, space for future tools on the right */}
      <header className="h-12 border-b border-gray-200 flex items-center justify-between px-4 text-sm bg-white">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => router.push(`/project/${doc.projectId}`)}
            className="text-gray-500 hover:text-gray-800"
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
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {/* Reserved area for future: annotations, labels, chat, permissions */}
          <span className="hidden sm:inline">
            Annotations · Labels · Chat · Permissions (coming soon)
          </span>
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
      <main className="flex-1 w-full flex bg-gray-100">
        {doc.kind === "pdf" ? (
          // Scrollable PDF viewer with centered white "page"
          <div className="flex-1 flex justify-center overflow-auto py-8">
            <div className="w-full max-w-5xl px-4">
              <div className="bg-white shadow-md rounded-sm overflow-hidden min-h-[80vh]">
                <PdfViewer doc={doc} />
              </div>
            </div>
          </div>
        ) : (
          // Read-only text viewer variant
          <div className="flex-1 flex justify-center overflow-auto py-8">
            <div className="w-full max-w-3xl px-4">
              <article className="bg-white shadow-md rounded-sm px-6 py-6 text-sm leading-relaxed whitespace-pre-wrap">
                {doc.content || "This document is currently empty."}
              </article>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

