"use client"

import { useEffect, useState, useMemo } from "react"
import { TextAnnotation } from "@/types/annotation"
import { useAnnotations } from "@/context/AnnotationContext"
import { useProjects } from "@/context/ProjectContext"
import { getQuizzes } from "@/lib/api/quizzes"
import type { Quiz } from "@/types/quiz"
import { CreateQuizModal } from "@/components/project/CreateQuizModal"
import { QuizTakeModal } from "@/components/project/QuizTakeModal"
import { QuizSubmissionsModal } from "@/components/project/QuizSubmissionsModal"
import { ManageQuizModal } from "@/components/project/ManageQuizModal"
import { QuizAnalyticsModal } from "@/components/project/QuizAnalyticsModal"
import { Trash2, Edit2, Check, X, Send, MessageSquareText, Filter, X as CloseIcon, HelpCircle, BarChart2, Plus } from "lucide-react"

type Props = {
  selectedAnnotations: TextAnnotation[]
  onClose: () => void
  documentText?: string
  getHighlightedText?: (startOffset: number, endOffset: number) => string | null
  onAnnotationHover?: (annotationId: string | null) => void
  isOwner?: boolean
  projectId?: string
  docId?: string
}

export function AnnotationSidebar({
  selectedAnnotations,
  onClose,
  documentText,
  getHighlightedText,
  onAnnotationHover,
  isOwner = false,
  projectId,
  docId,
}: Props) {
  const { labels, annotations, filteredAnnotations, filters, setFilters, clearFilters, editAnnotation, removeAnnotation, addComment, removeComment } = useAnnotations()
  const { quizzesForProject, fetchQuizzes } = useProjects()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})
  const [showFilters, setShowFilters] = useState(false)

  // Quiz Modal states
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null)
  const [createQuizModalAnnId, setCreateQuizModalAnnId] = useState<string | null>(null)
  const [takeQuizModal, setTakeQuizModal] = useState<Quiz | null>(null)
  const [manageQuizModal, setManageQuizModal] = useState<Quiz | null>(null)
  const [submissionsQuizModal, setSubmissionsQuizModal] = useState<Quiz | null>(null)
  const [analyticsQuizModal, setAnalyticsQuizModal] = useState<Quiz | null>(null)
  const [annotationQuizzes, setAnnotationQuizzes] = useState<Record<string, Quiz>>({})

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

  const resolvedSelected = selectedAnnotations
    .map((a) => filteredAnnotations.find((x) => x.id === a.id))
    .filter((a): a is TextAnnotation => !!a)

  useEffect(() => {
    if (selectedAnnotations.length > 0 && resolvedSelected.length === 0) {
      onClose()
    }
  }, [onClose, resolvedSelected.length, selectedAnnotations.length])

  // Load associated quizzes for selected annotations
  useEffect(() => {
    if (!projectId || resolvedSelected.length === 0) return
    const fetchAnnQuizzes = async () => {
      const pQuizzes = quizzesForProject(projectId)
      const map: Record<string, Quiz> = {}
      for (const ann of resolvedSelected) {
        const match = pQuizzes.find((q) => q.annotationId === ann.id)
        if (match) {
          map[ann.id] = match
        } else {
          try {
            const fetched = await getQuizzes(projectId, { annotationId: ann.id })
            if (fetched && fetched.length > 0) {
              map[ann.id] = fetched[0]
            }
          } catch (e) {
            // Ignore error
          }
        }
      }
      setAnnotationQuizzes(map)
    }
    fetchAnnQuizzes()
  }, [projectId, resolvedSelected, quizzesForProject])

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

      {/* Filter Section */}
      <div className="px-4 py-3 border-b border-gray-100">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 mb-2"
        >
          <Filter size={14} />
          <span>Filters</span>
          {(filters.userId || filters.labelId) && (
            <span className="bg-black text-white text-xs px-1.5 py-0.5 rounded">Active</span>
          )}
        </button>
        
        {showFilters && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Filter by person</label>
              <select
                value={filters.userId || ""}
                onChange={(e) => setFilters({ ...filters, userId: e.target.value || null })}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-black"
              >
                <option value="">All users</option>
                {uniqueUsers.map(user => (
                  <option key={user.id} value={user.id}>{user.username}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-600 mb-1 block">Filter by label</label>
              <select
                value={filters.labelId || ""}
                onChange={(e) => setFilters({ ...filters, labelId: e.target.value || null })}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-black"
              >
                <option value="">All labels</option>
                {labels.map(label => (
                  <option key={label.id} value={label.id}>{label.name}</option>
                ))}
              </select>
            </div>

            {(filters.userId || filters.labelId) && (
              <button
                onClick={clearFilters}
                className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1"
              >
                <CloseIcon size={12} />
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {resolvedSelected.map((ann) => {
          const label = labels.find((l) => l.id === ann.labelId)
          const isEditing = editingId === ann.id
          const isQuizLabel = label?.name?.toLowerCase() === 'quiz'
          const linkedQuiz = annotationQuizzes[ann.id]

          return (
            <div 
              key={ann.id} 
              className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden"
              onMouseEnter={() => onAnnotationHover?.(ann.id)}
              onMouseLeave={() => onAnnotationHover?.(null)}
            >
              {/* Main annotation header */}
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
                        title="Edit annotation"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(ann.id)}
                      className="p-1 text-gray-700 hover:text-red-600 rounded"
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
                        className="w-full text-sm text-gray-900 border border-gray-300 rounded-lg p-2 focus:outline-none focus:border-black min-h-[80px] bg-white"
                        placeholder="Write note or description..."
                        autoFocus
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <button onClick={cancelEditing} className="px-2 py-1 text-xs text-gray-900 hover:bg-gray-100 rounded">
                          Cancel
                        </button>
                        <button onClick={() => saveEditing(ann.id)} className="px-2 py-1 text-xs bg-black text-white hover:bg-gray-800 rounded flex items-center gap-1">
                          <Check size={12} /> Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={`w-full text-left rounded-lg border border-transparent hover:border-gray-200 transition-colors p-2 -m-2 ${
                        !ann.content ? "cursor-pointer" : "cursor-default"
                      }`}
                      onClick={() => {
                        if (!ann.content) startEditing(ann)
                      }}
                    >
                      <div className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
                        {ann.content ? ann.content : <span className="text-gray-500 italic">No notes added.</span>}
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {/* INLINE QUIZ INTEGRATION CARD */}
              {(isQuizLabel || linkedQuiz) && (
                <div className="p-3 bg-purple-50/50 border-t border-b border-purple-100">
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-900 mb-2">
                    <HelpCircle size={15} className="text-purple-600" />
                    PDF Quiz Module
                  </div>

                  {linkedQuiz ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-900">{linkedQuiz.title}</span>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          linkedQuiz.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'
                        }`}>
                          {linkedQuiz.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        {isOwner ? (
                          <>
                            <button
                              onClick={() => setManageQuizModal(linkedQuiz)}
                              className="text-xs bg-white text-blue-700 border border-blue-200 hover:bg-blue-50 px-2.5 py-1 rounded font-semibold transition-colors"
                            >
                              Manage
                            </button>
                            <button
                              onClick={() => setSubmissionsQuizModal(linkedQuiz)}
                              className="text-xs bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 px-2.5 py-1 rounded font-medium transition-colors"
                            >
                              Submissions
                            </button>
                            <button
                              onClick={() => setAnalyticsQuizModal(linkedQuiz)}
                              className="text-xs bg-purple-600 text-white hover:bg-purple-700 px-2.5 py-1 rounded font-semibold flex items-center gap-1 transition-colors shadow-sm"
                            >
                              <BarChart2 size={12} />
                              Analytics
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setTakeQuizModal(linkedQuiz)}
                            className="w-full text-xs bg-purple-600 text-white hover:bg-purple-700 px-3 py-1.5 rounded-md font-semibold transition-colors shadow-sm text-center"
                          >
                            Take Quiz
                          </button>
                        )}
                      </div>
                    </div>
                  ) : isOwner && projectId ? (
                    <button
                      onClick={() => setCreateQuizModalAnnId(ann.id)}
                      className="w-full py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Plus size={14} /> Create PDF Quiz Questions
                    </button>
                  ) : (
                    <p className="text-xs text-gray-500 italic">No quiz questions published yet.</p>
                  )}
                </div>
              )}

              {/* Replies (Comments) */}
              <div className="p-3 border-t border-gray-100">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-800">
                  <MessageSquareText size={14} />
                  Replies
                  <span className="ml-1 text-[11px] font-medium text-gray-500">
                    ({ann.comments?.length || 0})
                  </span>
                </div>

                {ann.comments && ann.comments.length > 0 ? (
                  <div className="mt-3 flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
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
                                  <div className="text-[11px] font-semibold text-gray-800 truncate">{username}</div>
                                  <div className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                                    {comment.content}
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleDeleteComment(ann.id, comment.id)}
                                  className="p-1 text-gray-500 hover:text-red-600 rounded flex-shrink-0"
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
                  <div className="mt-2 text-xs text-gray-500">No replies yet.</div>
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
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quiz Modals */}
      {createQuizModalAnnId && projectId && (
        <CreateQuizModal
          projectId={projectId}
          documentId={docId || null}
          annotationId={createQuizModalAnnId}
          onClose={() => {
            setCreateQuizModalAnnId(null)
            if (projectId) fetchQuizzes(projectId)
          }}
        />
      )}

      {takeQuizModal && projectId && (
        <QuizTakeModal
          quiz={takeQuizModal}
          projectId={projectId}
          onClose={() => setTakeQuizModal(null)}
        />
      )}

      {manageQuizModal && projectId && (
        <ManageQuizModal
          quizId={manageQuizModal.id}
          projectId={projectId}
          onClose={() => {
            setManageQuizModal(null)
            if (projectId) fetchQuizzes(projectId)
          }}
        />
      )}

      {submissionsQuizModal && projectId && (
        <QuizSubmissionsModal
          quiz={submissionsQuizModal}
          projectId={projectId}
          onClose={() => setSubmissionsQuizModal(null)}
        />
      )}

      {analyticsQuizModal && projectId && (
        <QuizAnalyticsModal
          projectId={projectId}
          quizId={analyticsQuizModal.id}
          quizTitle={analyticsQuizModal.title}
          onClose={() => setAnalyticsQuizModal(null)}
        />
      )}
    </div>
  )
}
