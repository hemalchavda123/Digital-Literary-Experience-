"use client"

import { useEffect, useState } from "react"
import { TextAnnotation } from "@/types/annotation"
import { useAnnotations } from "@/context/AnnotationContext"
import { Trash2, Edit2, Check, X, Send, MessageSquareText } from "lucide-react"

type Props = {
  selectedAnnotations: TextAnnotation[]
  onClose: () => void
  documentText?: string
}

export function AnnotationSidebar({ selectedAnnotations, onClose, documentText }: Props) {
  const { labels, annotations, editAnnotation, removeAnnotation, addComment, removeComment } = useAnnotations()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})

  // `selectedAnnotations` may be derived from a parent snapshot. Resolve to the latest
  // annotation objects in context so replies update instantly.
  const resolvedSelected = selectedAnnotations
    .map((a) => annotations.find((x) => x.id === a.id))
    .filter((a): a is TextAnnotation => !!a)

  // If the selected annotations were deleted, auto-close the sidebar.
  useEffect(() => {
    if (selectedAnnotations.length > 0 && resolvedSelected.length === 0) {
      onClose()
    }
  }, [onClose, resolvedSelected.length, selectedAnnotations.length])

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
      try {
        await removeAnnotation(id)
        if (selectedAnnotations.length === 1) onClose()
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to delete annotation"
        window.alert(msg)
      }
    }
  }

  const handleAddComment = async (annId: string) => {
    const content = commentInputs[annId]
    if (!content || !content.trim()) return
    await addComment(annId, content)
    setCommentInputs(prev => ({ ...prev, [annId]: "" }))
  }

  const handleDeleteComment = async (annotationId: string, commentId: string) => {
    const confirm = window.confirm("Delete this reply?")
    if (!confirm) return
    try {
      await removeComment(annotationId, commentId)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to delete reply"
      window.alert(msg)
    }
  }

  if (resolvedSelected.length === 0) return null

  return (
    <div className="w-80 h-full border-l border-gray-200 bg-white flex flex-col shadow-sm flex-shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 text-sm">Annotations</h3>
        <button onClick={onClose} className="text-gray-900 hover:text-black">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {resolvedSelected.map((ann) => {
          const label = labels.find((l) => l.id === ann.labelId)
          const isEditing = editingId === ann.id

          return (
            <div key={ann.id} className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
              {/* Highlighted text preview */}
              {documentText && (
                <div className="px-3 py-2 bg-gray-100 border-b border-gray-200">
                  <div className="text-[11px] text-gray-500 mb-1">Highlighted text:</div>
                  <div className="text-sm text-gray-900 italic leading-relaxed">
                    "{documentText.slice(ann.startOffset, ann.endOffset)}"
                  </div>
                </div>
              )}
              {/* Main annotation (like a post) */}
              <div className="p-3 bg-gray-50/60">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: label?.color || "#ccc" }}
                      />
                      <span className="text-xs font-semibold text-gray-900 truncate">
                        {label?.name || "Unknown Label"}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-gray-500">
                      Annotated by <span className="font-medium text-gray-700">{ann.user?.username || "Unknown"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!isEditing && (
                      <button
                        onClick={() => startEditing(ann)}
                        className="p-1 text-gray-700 hover:text-black rounded"
                        aria-label="Edit annotation"
                        title="Edit annotation"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(ann.id)}
                      className="p-1 text-gray-700 hover:text-red-600 rounded"
                      aria-label="Delete annotation"
                      title="Delete annotation"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="mt-3">
                  {isEditing ? (
                    <div>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full text-sm text-gray-900 placeholder-gray-400 border border-gray-300 rounded-lg p-2 focus:outline-none focus:border-black min-h-[96px] bg-white"
                        placeholder="Write the main annotation..."
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
                    <button
                      type="button"
                      className={`w-full text-left rounded-lg border border-transparent hover:border-gray-200 hover:bg-white/80 transition-colors p-2 -m-2 ${
                        !ann.content ? "cursor-pointer" : "cursor-default"
                      }`}
                      onClick={() => {
                        if (!ann.content) startEditing(ann)
                      }}
                    >
                      <div className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
                        {ann.content ? (
                          ann.content
                        ) : (
                          <span className="text-gray-500 italic">
                            No main annotation yet. Click to add one.
                          </span>
                        )}
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {/* Replies (like comments) */}
              <div className="p-3 border-t border-gray-100">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-800">
                  <MessageSquareText size={14} />
                  Replies
                  <span className="ml-1 text-[11px] font-medium text-gray-500">
                    ({ann.comments?.length || 0})
                  </span>
                </div>

                {ann.comments && ann.comments.length > 0 ? (
                  <div className="mt-3 flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
                    {ann.comments.map((comment) => {
                      const username = comment.user?.username || "User"
                      const initial = (username?.[0] || "U").toUpperCase()
                      return (
                        <div key={comment.id} className="flex items-start gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-100 border border-gray-200 text-[11px] font-semibold text-gray-700 flex items-center justify-center flex-shrink-0">
                            {initial}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="text-[11px] font-semibold text-gray-800 truncate">
                                    {username}
                                  </div>
                                  <div className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                                    {comment.content}
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleDeleteComment(ann.id, comment.id)}
                                  className="p-1 text-gray-500 hover:text-red-600 rounded flex-shrink-0"
                                  aria-label="Delete reply"
                                  title="Delete reply"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-gray-500">
                    No replies yet. Be the first to comment.
                  </div>
                )}

                <div className="mt-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={commentInputs[ann.id] || ""}
                      onChange={(e) => setCommentInputs((prev) => ({ ...prev, [ann.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddComment(ann.id)
                      }}
                      placeholder="Write a reply…"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-black bg-white"
                    />
                    <button
                      onClick={() => handleAddComment(ann.id)}
                      className="px-3 py-2 bg-black text-white rounded-lg hover:bg-gray-800 text-xs font-semibold inline-flex items-center gap-1"
                    >
                      <Send size={12} />
                      Send
                    </button>
                  </div>
                  <div className="mt-1 text-[11px] text-gray-400">
                    Press Enter to send
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
