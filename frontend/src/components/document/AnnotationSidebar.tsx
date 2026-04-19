"use client"

import { useState } from "react"
import { TextAnnotation } from "@/types/annotation"
import { useAnnotations } from "@/context/AnnotationContext"
import { Trash2, Edit2, Check, X } from "lucide-react"

type Props = {
  selectedAnnotations: TextAnnotation[]
  onClose: () => void
}

export function AnnotationSidebar({ selectedAnnotations, onClose }: Props) {
  const { labels, editAnnotation, removeAnnotation } = useAnnotations()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")

  const startEditing = (ann: TextAnnotation) => {
    setEditingId(ann.id)
    setEditContent(ann.content)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditContent("")
  }

  const saveEditing = async (id: string) => {
    await editAnnotation(id, editContent)
    setEditingId(null)
  }

  const handleDelete = async (id: string) => {
    const confirm = window.confirm("Are you sure you want to delete this annotation?")
    if (confirm) {
      await removeAnnotation(id)
      if (selectedAnnotations.length === 1) onClose()
    }
  }

  if (selectedAnnotations.length === 0) return null

  return (
    <div className="w-80 h-full border-l border-gray-200 bg-white flex flex-col shadow-sm flex-shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 text-sm">Annotations</h3>
        <button onClick={onClose} className="text-gray-900 hover:text-black">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {selectedAnnotations.map((ann) => {
          const label = labels.find((l) => l.id === ann.labelId)
          const isEditing = editingId === ann.id

          return (
            <div key={ann.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: label?.color || "#ccc" }}
                  />
                  <span className="text-xs font-medium text-gray-900">
                    {label?.name || "Unknown Label"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {!isEditing && (
                    <button
                      onClick={() => startEditing(ann)}
                      className="p-1 text-gray-900 hover:text-black rounded"
                    >
                      <Edit2 size={12} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(ann.id)}
                    className="p-1 text-gray-900 hover:text-red-600 rounded"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {isEditing ? (
                <div className="mt-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded p-2 focus:outline-none focus:border-blue-500 min-h-[80px]"
                    placeholder="Type your note here..."
                    autoFocus
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      onClick={cancelEditing}
                      className="px-2 py-1 text-xs text-gray-900 hover:bg-gray-100 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => saveEditing(ann.id)}
                      className="px-2 py-1 text-xs bg-black text-white hover:bg-gray-800 rounded flex items-center gap-1"
                    >
                      <Check size={12} /> Save
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  className={`mt-2 ${!ann.content ? "cursor-pointer" : ""}`}
                  onClick={() => {
                    if (!ann.content) startEditing(ann)
                  }}
                >
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">
                    {ann.content || <span className="text-gray-900 italic hover:text-black transition-colors">No notes added. Click here or the edit icon to add notes.</span>}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
