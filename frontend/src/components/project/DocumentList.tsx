import Link from "next/link"
import type { Document } from "@/types/document"

type Props = {
  documents: Document[]
}

export function DocumentList({ documents }: Props) {
  if (!documents.length) {
    return <p className="text-sm text-gray-500 mt-4">No documents yet. Create a document to begin writing.</p>
  }

  return (
    <div className="mt-4 max-h-[65vh] overflow-y-auto border border-gray-200 rounded-lg divide-y">
      {documents.map((doc) => (
        <Link
          key={doc.id}
          href={`/document/${doc.id}`}
          className="block px-4 py-3 hover:bg-gray-50 transition-colors"
        >
          <div className="font-medium text-sm">{doc.title}</div>
          <div className="text-xs text-gray-500 truncate">{doc.content || "Empty document"}</div>
        </Link>
      ))}
    </div>
  )
}

