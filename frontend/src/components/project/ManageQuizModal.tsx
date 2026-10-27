"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useProjects } from "@/context/ProjectContext"
import { QuestionType, Quiz, QuizQuestion } from "@/types/quiz"
import { getQuizById } from "@/lib/api/quizzes"

interface Props {
  projectId: string
  quizId: string
  onClose: () => void
}

interface TempQuestion {
  id: string | number
  type: QuestionType
  questionText: string
  options: string[]
  marks: number
  correctAnswer: string
  isPublished: boolean
}

let tempQuestionIdCounter = 0

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
const getAlphabetLabel = (index: number) => ALPHABET[index] || ""

export function ManageQuizModal({ projectId, quizId, onClose }: Props) {
  const { updateQuiz, publishQuestion } = useProjects()
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit")
  const [loading, setLoading] = useState(true)
  
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">("DRAFT")
  const [questions, setQuestions] = useState<TempQuestion[]>([])
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasLoadedRef = useRef(false)
  const lastSavedSnapshotRef = useRef<string>("")

  const getSnapshot = (t: string, d: string, s: string, qs: TempQuestion[]) => {
    return JSON.stringify({
      title: t.trim(),
      description: d.trim(),
      status: s,
      questions: qs.map((q) => ({
        id: typeof q.id === "string" && !q.id.startsWith("temp-") ? q.id : null,
        type: q.type,
        questionText: q.questionText,
        options: q.options,
        marks: q.marks,
        correctAnswer: q.correctAnswer,
        isPublished: q.isPublished,
      })),
    })
  }

  useEffect(() => {
    getQuizById(projectId, quizId)
      .then((data) => {
        const loadedQuestions = (data.questions || []).map((q) => ({
          id: q.id,
          type: q.type,
          questionText: q.questionText,
          options: q.options ? JSON.parse(q.options) : [],
          marks: q.marks,
          correctAnswer: q.correctAnswer || "",
          isPublished: q.isPublished,
        }))
        setTitle(data.title)
        setDescription(data.description || "")
        setStatus(data.status as "DRAFT" | "PUBLISHED")
        setQuestions(loadedQuestions)
        lastSavedSnapshotRef.current = getSnapshot(
          data.title,
          data.description || "",
          data.status as "DRAFT" | "PUBLISHED",
          loadedQuestions
        )
        setLoading(false)
        hasLoadedRef.current = true
      })
      .catch((err) => {
        console.error("Failed to load quiz", err)
        setLoading(false)
      })
  }, [projectId, quizId])

  // Debounced auto-save
  const performAutoSave = useCallback(async () => {
    if (!title.trim() || questions.length === 0) return

    setAutoSaveStatus("saving")
    try {
      const updatedQuiz = await updateQuiz(projectId, quizId, {
        title: title.trim(),
        description: description.trim(),
        status,
        questions: questions.map((q) => ({
          ...(typeof q.id === "string" && !q.id.startsWith("temp-") ? { id: q.id } : {}),
          type: q.type,
          questionText: q.questionText,
          options: q.type === "MULTIPLE_CHOICE" ? q.options : null,
          marks: q.marks,
          correctAnswer: q.correctAnswer.trim() || null,
          isPublished: q.isPublished,
        })),
      })
      setAutoSaveStatus("saved")

      if (updatedQuiz && Array.isArray(updatedQuiz.questions)) {
        const savedQuestions = updatedQuiz.questions
        // Map backend-assigned IDs to any temp- questions so subsequent updates preserve them
        setQuestions((current) => {
          const updatedList = current.map((q, idx) => {
            if (typeof q.id === "string" && q.id.startsWith("temp-") && savedQuestions[idx]) {
              return { ...q, id: savedQuestions[idx].id }
            }
            return q
          })
          lastSavedSnapshotRef.current = getSnapshot(title, description, status, updatedList)
          return updatedList
        })
      } else {
        lastSavedSnapshotRef.current = getSnapshot(title, description, status, questions)
      }
    } catch (error) {
      console.error("Auto-save failed", error)
      setAutoSaveStatus("error")
    }
  }, [projectId, quizId, title, description, status, questions, updateQuiz])

  useEffect(() => {
    if (!hasLoadedRef.current) return

    const currentSnapshot = getSnapshot(title, description, status, questions)
    if (currentSnapshot === lastSavedSnapshotRef.current) {
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      performAutoSave()
    }, 1200)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [title, description, status, questions, performAutoSave])

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: `temp-${++tempQuestionIdCounter}`,
        type: "SHORT_ANSWER",
        questionText: "",
        options: ["Option 1", "Option 2"],
        marks: 1,
        correctAnswer: "",
        isPublished: true,
      },
    ])
  }

  const handleRemoveQuestion = (id: string | number) => {
    setQuestions(questions.filter((q) => q.id !== id))
  }

  const updateQuestion = (id: string | number, field: keyof TempQuestion, value: any) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, [field]: value } : q)))
  }

  const handleTogglePublish = async (q: TempQuestion, newPublishedState: boolean) => {
    updateQuestion(q.id, "isPublished", newPublishedState)

    if (typeof q.id === "string" && !q.id.startsWith("temp-")) {
      try {
        await publishQuestion(projectId, quizId, q.id, newPublishedState)
      } catch (err: any) {
        console.error("Failed to toggle question publish state", err)
        updateQuestion(q.id, "isPublished", !newPublishedState)
        alert(err.message || "Failed to update question publish state.")
      }
    }
  }

  const updateOption = (questionId: string | number, optionIndex: number, value: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== questionId) return q
        const newOptions = [...q.options]
        newOptions[optionIndex] = value
        return { ...q, options: newOptions }
      })
    )
  }

  const addOption = (questionId: string | number) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== questionId) return q
        if (q.options.length >= 26) return q // Limit to Z
        return { ...q, options: [...q.options, `Option ${q.options.length + 1}`] }
      })
    )
  }

  const removeOption = (questionId: string | number, optionIndex: number) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== questionId) return q
        return { ...q, options: q.options.filter((_, i) => i !== optionIndex) }
      })
    )
  }

  const handleSave = async (newStatus?: "DRAFT" | "PUBLISHED") => {
    if (!title.trim()) {
      alert("Title is required.")
      return
    }
    if (questions.length === 0) {
      alert("Please add at least one question.")
      return
    }

    setIsSubmitting(true)
    const finalStatus = newStatus || status
    try {
      await updateQuiz(projectId, quizId, {
        title: title.trim(),
        description: description.trim(),
        status: finalStatus,
        questions: questions.map((q) => ({
          ...(typeof q.id === "string" && !q.id.startsWith("temp-") ? { id: q.id } : {}),
          type: q.type,
          questionText: q.questionText,
          options: q.type === "MULTIPLE_CHOICE" ? q.options : null,
          marks: q.marks,
          correctAnswer: q.correctAnswer.trim() || null,
          isPublished: q.isPublished,
        })),
      })
      onClose()
    } catch (error) {
      console.error("Failed to save quiz", error)
      alert("Failed to save quiz. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const previewQuestions = questions.filter(q => q.isPublished)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900">Manage Quiz</h2>
              <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
                {status === 'PUBLISHED' ? 'Published' : 'Draft'}
              </span>
            </div>
            {autoSaveStatus !== "idle" && (
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5 transition-opacity ${
                autoSaveStatus === "saving"
                  ? "text-gray-500 bg-gray-100"
                  : autoSaveStatus === "saved"
                  ? "text-emerald-700 bg-emerald-50"
                  : "text-red-700 bg-red-50"
              }`}>
                {autoSaveStatus === "saving" && (
                  <>
                    <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                )}
                {autoSaveStatus === "saved" && (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    All changes saved
                  </>
                )}
                {autoSaveStatus === "error" && (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                    Save failed
                  </>
                )}
              </span>
            )}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab("edit")}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeTab === "edit" ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Edit
              </button>
              <button
                onClick={() => setActiveTab("preview")}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeTab === "preview" ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Student Preview
              </button>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6 bg-gray-50/50">
          {loading ? (
            <div className="flex justify-center items-center py-12 text-gray-500">Loading quiz...</div>
          ) : activeTab === "edit" ? (
            <>
              {/* Quiz Details */}
              <div className="flex flex-col gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Quiz Title"
                  className="w-full p-3 text-lg font-semibold border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black text-gray-900 placeholder-gray-500"
                />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Quiz Description (optional)"
                  className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black min-h-[80px] resize-none text-gray-900 placeholder-gray-500"
                />
              </div>

              {/* Questions */}
              <div className="flex flex-col gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className="text-lg font-bold text-gray-900">Questions</h3>
                  <button
                    onClick={handleAddQuestion}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    + Add Question
                  </button>
                </div>

                {questions.length === 0 ? (
                  <div className="text-center p-8 bg-gray-50 border border-dashed border-gray-300 rounded-md mt-2">
                    <p className="text-sm text-gray-500">No questions added yet.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 mt-2">
                    {questions.map((q, index) => (
                      <div key={q.id} className="border border-gray-200 rounded-md p-4 bg-gray-50 relative group">
                        <div className="absolute top-4 right-12 flex items-center gap-2">
                          <label className="flex items-center cursor-pointer gap-2">
                            <span className="text-xs text-gray-500 font-medium">{q.isPublished ? "Published" : "Draft"}</span>
                            <div className="relative">
                              <input type="checkbox" className="sr-only" checked={q.isPublished} onChange={(e) => handleTogglePublish(q, e.target.checked)} />
                              <div className={`block w-10 h-6 rounded-full transition-colors ${q.isPublished ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                              <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${q.isPublished ? 'transform translate-x-4' : ''}`}></div>
                            </div>
                          </label>
                        </div>
                        <button
                          onClick={() => handleRemoveQuestion(q.id)}
                          className="absolute top-4 right-4 text-gray-400 hover:text-red-600"
                          title="Remove Question"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>

                        <div className="flex flex-col gap-3 pr-8">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-gray-700 w-6">{index + 1}.</span>
                            <select
                              value={q.type}
                              onChange={(e) => updateQuestion(q.id, "type", e.target.value as QuestionType)}
                              className="p-2 border border-gray-300 rounded focus:outline-none bg-white text-sm text-black"
                            >
                              <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                              <option value="ONE_WORD">One Word</option>
                              <option value="SHORT_ANSWER">Short Answer</option>
                            </select>
                            <input
                              type="number"
                              value={q.marks}
                              onChange={(e) => updateQuestion(q.id, "marks", parseInt(e.target.value) || 1)}
                              className="w-20 p-2 border border-gray-300 rounded focus:outline-none text-sm text-gray-900"
                              placeholder="Marks"
                              min="1"
                            />
                            <span className="text-xs font-medium text-gray-500">Marks</span>
                          </div>

                          <input
                            type="text"
                            value={q.questionText}
                            onChange={(e) => updateQuestion(q.id, "questionText", e.target.value)}
                            placeholder="Question text..."
                            className="w-full p-2 border border-gray-300 rounded focus:outline-none ml-9 text-gray-900 placeholder-gray-500"
                          />

                          {q.type === "MULTIPLE_CHOICE" && (
                            <div className="ml-9 mt-2 flex flex-col gap-2">
                              {q.options.map((opt, optIndex) => (
                                <div key={optIndex} className="flex items-center gap-2">
                                  <span className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-700 flex-shrink-0">
                                    {getAlphabetLabel(optIndex)}
                                  </span>
                                  <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) => updateOption(q.id, optIndex, e.target.value)}
                                    className="flex-1 p-1 border-b border-gray-300 focus:outline-none focus:border-[#a17038] bg-transparent text-sm text-gray-900 placeholder-gray-500"
                                  />
                                  {q.options.length > 2 && (
                                    <button onClick={() => removeOption(q.id, optIndex)} className="text-gray-400 hover:text-red-500">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </button>
                                  )}
                                </div>
                              ))}
                              {q.options.length < 26 && (
                                <button onClick={() => addOption(q.id)} className="text-xs text-[#a17038] hover:underline self-start mt-1">
                                  + Add Option ({q.options.length}/26)
                                </button>
                              )}
                            </div>
                          )}

                          <div className="ml-9 mt-2">
                            {q.type === "MULTIPLE_CHOICE" ? (
                              <div className="flex items-center gap-2">
                                <label className="text-xs font-medium text-gray-600">Correct Answer:</label>
                                <select
                                  value={q.correctAnswer}
                                  onChange={(e) => updateQuestion(q.id, "correctAnswer", e.target.value)}
                                  className="p-2 border border-gray-200 rounded focus:outline-none text-sm bg-white text-gray-900"
                                >
                                  <option value="">-- Select correct option --</option>
                                  {q.options.map((_, optIndex) => (
                                    <option key={optIndex} value={getAlphabetLabel(optIndex)}>
                                      {getAlphabetLabel(optIndex)}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              <input
                                type="text"
                                value={q.correctAnswer}
                                onChange={(e) => updateQuestion(q.id, "correctAnswer", e.target.value)}
                                placeholder="Correct Answer (optional, for auto-grading)"
                                className="w-full p-2 border border-gray-200 rounded focus:outline-none text-sm bg-white text-gray-900 placeholder-gray-500"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {questions.length > 0 && (
                  <button
                    onClick={handleAddQuestion}
                    className="w-full py-3 text-sm border-2 border-dashed border-gray-300 rounded-md font-medium text-gray-500 hover:border-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors mt-2"
                  >
                    + Add Question
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm min-h-[300px]">
              <div className="mb-6 border-b border-gray-100 pb-4">
                <h2 className="text-2xl font-bold text-gray-900">{title || "Untitled Quiz"}</h2>
                {description && <p className="text-gray-700 whitespace-pre-wrap mt-2">{description}</p>}
              </div>

              {previewQuestions.length === 0 ? (
                <div className="text-center p-12 text-gray-500">
                  No published questions to display. Students will see an empty quiz.
                </div>
              ) : (
                <div className="flex flex-col gap-8">
                  {previewQuestions.map((q, index) => (
                    <div key={q.id} className="flex flex-col gap-3">
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-gray-900">{index + 1}.</span>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{q.questionText || "Empty Question"}</p>
                          <span className="text-xs text-gray-500 mt-1 inline-block">{q.marks} marks</span>
                        </div>
                      </div>
                      
                      <div className="ml-6 pointer-events-none opacity-80">
                        {q.type === "MULTIPLE_CHOICE" && (
                          <div className="flex flex-col gap-2">
                            {q.options.map((opt, i) => (
                              <label key={i} className="flex items-center gap-2 cursor-pointer">
                                <span className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-600 flex-shrink-0">
                                  {getAlphabetLabel(i)}
                                </span>
                                <span className="text-gray-700 text-sm">{opt || `Option ${i + 1}`}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {q.type === "ONE_WORD" && (
                          <input
                            type="text"
                            disabled
                            className="w-full max-w-md p-2 border border-gray-300 rounded focus:outline-none bg-gray-50 text-sm placeholder-gray-400"
                            placeholder="Your answer..."
                          />
                        )}

                        {q.type === "SHORT_ANSWER" && (
                          <textarea
                            disabled
                            className="w-full p-2 border border-gray-300 rounded focus:outline-none bg-gray-50 min-h-[100px] resize-none text-sm placeholder-gray-400"
                            placeholder="Your answer..."
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-200 flex justify-end gap-3 bg-white">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 font-medium text-gray-700 hover:text-black"
          >
            Cancel
          </button>
          {status === 'DRAFT' && (
            <button
              onClick={() => handleSave("PUBLISHED")}
              disabled={isSubmitting}
              className="px-5 py-2 font-medium text-white rounded bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors text-sm"
            >
              Publish Quiz
            </button>
          )}
          <button
            onClick={() => handleSave()}
            disabled={isSubmitting}
            className="px-6 py-2 font-medium text-white rounded hover:opacity-95 shadow-sm transition-colors"
            style={{ backgroundColor: "#a17038" }}
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  )
}
