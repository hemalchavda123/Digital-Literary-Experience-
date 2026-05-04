"use client"

import Link from "next/link"
import type { Document } from "@/types/document"

type Props = {
  document: Document | { id: string; title: string; kind: string }
  showDelete?: boolean
  onDelete?: () => void
  compact?: boolean
}

export function DocumentCard({ document, showDelete = false, onDelete, compact = false }: Props) {
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onDelete) {
      const confirmed = window.confirm(`Are you sure you want to delete "${document.title}"?`)
      if (confirmed) {
        onDelete()
      }
    }
  }

  return (
    <Link
      href={`/document/${document.id}`}
      className={`block border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all bg-white group ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Document Icon */}
          <div className={`flex-shrink-0 ${compact ? "mt-0.5" : "mt-1"}`}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={compact ? "20" : "24"}
              height={compact ? "20" : "24"}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-400 group-hover:text-gray-600 transition-colors"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              {document.kind === "pdf" && (
                <>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </>
              )}
            </svg>
          </div>

          {/* Document Info */}
          <div className="flex-1 min-w-0">
            <h3
              className={`font-semibold text-gray-900 group-hover:text-black transition-colors truncate ${
                compact ? "text-sm" : "text-base"
              }`}
            >
              {document.title}
            </h3>
            {!compact && (
              <p className="text-xs text-gray-500 mt-0.5">
                {document.kind === "pdf" ? "PDF Document" : "Text Document"}
              </p>
            )}
          </div>
        </div>

        {/* Delete Button */}
        {showDelete && onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-600"
            title="Delete document"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18"></path>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            </svg>
          </button>
        )}
      </div>
    </Link>
  )
}
