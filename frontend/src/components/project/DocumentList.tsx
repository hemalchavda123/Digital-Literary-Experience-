"use client"

import type { Document } from "@/types/document"
import { useProjects } from "@/context/ProjectContext"
import { DocumentCard } from "./DocumentCard"

type Props = {
  documents: Document[]
}

export function DocumentList({ documents }: Props) {
  const { deleteDocument } = useProjects()

  if (!documents.length) {
    return <p className="text-sm text-gray-900 mt-4">No documents yet. Create a document to begin writing.</p>
  }

  return (
    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {documents.map((doc) => (
        <DocumentCard
          key={doc.id}
          document={doc}
          showDelete={true}
          onDelete={() => deleteDocument(doc.id)}
        />
      ))}
    </div>
  )
}

