"use client"

import Link from "next/link"
import type { Document } from "@/types/document"
import { useProjects } from "@/context/ProjectContext"

type Props = {
  documents: Document[]
}

export function DocumentList({ documents }: Props) {
  const { deleteDocument } = useProjects()

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    const confirmed = window.confirm("Are you sure you want to delete this document?")
    if (confirmed) {
      deleteDocument(id)
    }
  }

  if (!documents.length) {
    return <p className="text-sm text-gray-900 mt-4">No documents yet. Create a document to begin writing.</p>
  }

  return (
    <div className="mt-4 max-h-[65vh] overflow-y-auto border border-gray-200 rounded-lg divide-y">
      {documents.map((doc) => (
        <div key={doc.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
          <div className="flex-1 min-w-0">
            <Link
              href={`/document/${doc.id}`}
              className="block"
            >
              <div className="font-medium text-sm text-gray-900">{doc.title}</div>
              <div className="text-xs text-gray-900 truncate">{doc.content || "Empty document"}</div>
            </Link>
          </div>
          <button
            type="button"
            onClick={(e) => handleDelete(e, doc.id)}
            className="ml-4 rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  )
}

