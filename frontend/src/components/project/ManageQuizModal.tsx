"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useProjects } from "@/context/ProjectContext"
import { QuestionType, AnswerRevealMode, PartialMarkingRule } from "@/types/quiz"
import { getQuizById, downloadQuizAnswersExcel } from "@/lib/api/quizzes"
import { FileSpreadsheet, FileText, Trophy, Eye, ShieldAlert, HelpCircle } from "lucide-react"
import { MarkingSchemeGuideModal } from "@/components/project/MarkingSchemeGuideModal"
import { AddQuestionsFromTextModal } from "@/components/project/AddQuestionsFromTextModal"
import { ParsedQuestion } from "@/lib/quizTextParser"

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
  negativeMarks: number
  partialMarkingRule: PartialMarkingRule
  correctAnswer: string
  modelAnswer: string
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
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED" | "CLOSED">("DRAFT")
  const [answerRevealMode, setAnswerRevealMode] = useState<AnswerRevealMode>("IMMEDIATE")
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(true)
  const [questions, setQuestions] = useState<TempQuestion[]>([])
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [downloading, setDownloading] = useState(false)
  const [isTextImportOpen, setIsTextImportOpen] = useState(false)
  const [markingGuideOpen, setMarkingGuideOpen] = useState(false)

  const handleDownloadExcel = async () => {
    try {
      setDownloading(true)
      await downloadQuizAnswersExcel(projectId, quizId, title)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to download Excel file")
    } finally {
      setDownloading(false)
    }
  }

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasLoadedRef = useRef(false)
  const lastSavedSnapshotRef = useRef<string>("")

  const getSnapshot = (t: string, d: string, s: string, arm: string, sl: boolean, qs: TempQuestion[]) => {
    return JSON.stringify({
      title: t.trim(),
      description: d.trim(),
      status: s,
      answerRevealMode: arm,
      showLeaderboard: sl,
      questions: qs.map((q) => ({
        id: typeof q.id === "string" && !q.id.startsWith("temp-") ? q.id : null,
        type: q.type,
        questionText: q.questionText,
        options: q.options,
        marks: q.marks,
        negativeMarks: q.negativeMarks,
        partialMarkingRule: q.partialMarkingRule,
        correctAnswer: q.correctAnswer,
        modelAnswer: q.modelAnswer,
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
          marks: q.marks ?? 1,
          negativeMarks: q.negativeMarks ?? 0,
          partialMarkingRule: q.partialMarkingRule || "PROPORTIONAL_WITH_PENALTY",
          correctAnswer: q.correctAnswer || "",
          modelAnswer: q.modelAnswer || "",
          isPublished: q.isPublished,
        }))
        setTitle(data.title)
        setDescription(data.description || "")
        setStatus(data.status as "DRAFT" | "PUBLISHED" | "CLOSED")
        setAnswerRevealMode((data.answerRevealMode as AnswerRevealMode) || "IMMEDIATE")
        setShowLeaderboard(data.showLeaderboard !== undefined ? Boolean(data.showLeaderboard) : true)
        setQuestions(loadedQuestions)
        lastSavedSnapshotRef.current = getSnapshot(
          data.title,
          data.description || "",
          data.status as "DRAFT" | "PUBLISHED" | "CLOSED",
          (data.answerRevealMode as AnswerRevealMode) || "IMMEDIATE",
          data.showLeaderboard !== undefined ? Boolean(data.showLeaderboard) : true,
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
        answerRevealMode,
        showLeaderboard,
        questions: questions.map((q) => ({
          ...(typeof q.id === "string" && !q.id.startsWith("temp-") ? { id: q.id } : {}),
          type: q.type,
          questionText: q.questionText,
          options: q.type === "MULTIPLE_CHOICE" || q.type === "MULTIPLE_CORRECT" ? q.options : null,
          marks: q.marks,
          negativeMarks: q.negativeMarks,
          partialMarkingRule: q.partialMarkingRule,
          correctAnswer: q.correctAnswer.trim() || null,
          modelAnswer: q.modelAnswer.trim() || null,
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
          lastSavedSnapshotRef.current = getSnapshot(title, description, status, answerRevealMode, showLeaderboard, updatedList)
          return updatedList
        })
      } else {
        lastSavedSnapshotRef.current = getSnapshot(title, description, status, answerRevealMode, showLeaderboard, questions)
      }
    } catch (error) {
      console.error("Auto-save failed", error)
      setAutoSaveStatus("error")
    }
  }, [projectId, quizId, title, description, status, answerRevealMode, showLeaderboard, questions, updateQuiz])

  useEffect(() => {
    if (!hasLoadedRef.current) return

    const currentSnapshot = getSnapshot(title, description, status, answerRevealMode, showLeaderboard, questions)
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
  }, [title, description, status, answerRevealMode, showLeaderboard, questions, performAutoSave])

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: `temp-${++tempQuestionIdCounter}`,
        type: "SHORT_ANSWER",
        questionText: "",
        options: ["Option 1", "Option 2"],
        marks: 1,
        negativeMarks: 0,
        partialMarkingRule: "PROPORTIONAL_WITH_PENALTY",
        correctAnswer: "",
        modelAnswer: "",
        isPublished: true,
      },
    ])
  }

  const handleAddQuestionsFromText = (parsedQuestions: ParsedQuestion[]) => {
    const newQuestions: TempQuestion[] = parsedQuestions.map((q) => ({
      id: `temp-${++tempQuestionIdCounter}`,
      type: q.type,
      questionText: q.questionText,
      options:
        q.type === "MULTIPLE_CHOICE" || q.type === "MULTIPLE_CORRECT"
          ? q.options.length >= 2
            ? q.options
            : ["Option 1", "Option 2"]
          : ["Option 1", "Option 2"],
      marks: q.marks,
      negativeMarks: 0,
      partialMarkingRule: "PROPORTIONAL_WITH_PENALTY",
      correctAnswer: q.correctAnswer,
      modelAnswer: "",
      isPublished: q.isPublished,
    }))
    setQuestions((prev) => [...prev, ...newQuestions])
  }

  const handleRemoveQuestion = (id: string | number) => {
    setQuestions(questions.filter((q) => q.id !== id))
  }

  const updateQuestion = (
    id: string | number,
    field: keyof TempQuestion,
    value: TempQuestion[keyof TempQuestion]
  ) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, [field]: value } : q)))
  }

  const handleTogglePublish = async (q: TempQuestion, newPublishedState: boolean) => {
    updateQuestion(q.id, "isPublished", newPublishedState)

    if (typeof q.id === "string" && !q.id.startsWith("temp-")) {
      try {
        await publishQuestion(projectId, quizId, q.id, newPublishedState)
      } catch (err: unknown) {
        console.error("Failed to toggle question publish state", err)
        updateQuestion(q.id, "isPublished", !newPublishedState)
        alert(err instanceof Error ? err.message : "Failed to update question publish state.")
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

  const handleSave = async (newStatus?: "DRAFT" | "PUBLISHED" | "CLOSED") => {
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
        answerRevealMode,
        showLeaderboard,
        questions: questions.map((q) => ({
          ...(typeof q.id === "string" && !q.id.startsWith("temp-") ? { id: q.id } : {}),
          type: q.type,
          questionText: q.questionText,
          options: q.type === "MULTIPLE_CHOICE" || q.type === "MULTIPLE_CORRECT" ? q.options : null,
          marks: q.marks,
          negativeMarks: q.negativeMarks,
          partialMarkingRule: q.partialMarkingRule,
          correctAnswer: q.correctAnswer.trim() || null,
          modelAnswer: q.modelAnswer.trim() || null,
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
              <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                status === 'PUBLISHED' ? 'bg-green-100 text-green-700' :
                status === 'CLOSED' ? 'bg-rose-100 text-rose-700' :
                'bg-gray-200 text-gray-700'
              }`}>
                {status === 'PUBLISHED' ? 'Published' : status === 'CLOSED' ? 'Closed' : 'Draft'}
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
                <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Quiz Status:</span>
                    {status === "CLOSED" && (
                      <button
                        type="button"
                        onClick={handleDownloadExcel}
                        disabled={downloading}
                        className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        title="Download all quiz answers in Excel (.xlsx) format"
                      >
                        <FileSpreadsheet size={13} />
                        {downloading ? "Downloading..." : "Download Excel"}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs gap-1">
                    <button
                      type="button"
                      onClick={() => setStatus("DRAFT")}
                      className={`px-3 py-1 rounded font-semibold transition-all ${
                        status === "DRAFT" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus("PUBLISHED")}
                      className={`px-3 py-1 rounded font-semibold transition-all ${
                        status === "PUBLISHED" ? "bg-emerald-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Published
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus("CLOSED")}
                      className={`px-3 py-1 rounded font-semibold transition-all ${
                        status === "CLOSED" ? "bg-rose-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Closed (Marks Only)
                    </button>
                  </div>
                </div>
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

                {/* Quiz Settings: Answer Reveal & Leaderboard */}
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Eye size={15} className="text-[#a17038]" />
                    <span className="font-semibold text-gray-700">Answer Reveal Policy:</span>
                    <select
                      value={answerRevealMode}
                      onChange={(e) => setAnswerRevealMode(e.target.value as AnswerRevealMode)}
                      className="p-1.5 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none"
                    >
                      <option value="IMMEDIATE">Immediate (Upon Submission)</option>
                      <option value="AFTER_QUIZ_CLOSED">After Quiz is Closed</option>
                      <option value="MARKS_ONLY">Show Marks Only</option>
                      <option value="NEVER">Never Reveal</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-gray-700 select-none">
                    <input
                      type="checkbox"
                      checked={showLeaderboard}
                      onChange={(e) => setShowLeaderboard(e.target.checked)}
                      className="w-4 h-4 rounded text-[#a17038] focus:ring-[#a17038]"
                    />
                    <span className="flex items-center gap-1">
                      <Trophy size={14} className="text-amber-600" />
                      Allow Students to View Leaderboard
                    </span>
                  </label>
                </div>
              </div>

              {/* Questions */}
              <div className="flex flex-col gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-gray-900">Questions</h3>
                    <button
                      type="button"
                      onClick={() => setMarkingGuideOpen(true)}
                      className="px-2.5 py-1 text-xs border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg font-semibold transition-colors flex items-center gap-1 shadow-2xs"
                      title="View Marking Schemes Guide"
                    >
                      <HelpCircle size={13} className="text-amber-700" />
                      Marking Guide
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsTextImportOpen(true)}
                      className="px-3 py-1 text-sm border border-[#a17038] text-[#a17038] hover:bg-[#a17038]/10 rounded-md font-medium transition-colors flex items-center gap-1.5"
                      title="Add multiple questions directly from text"
                    >
                      <FileText size={15} />
                      Add from Text
                    </button>
                    <button
                      type="button"
                      onClick={handleAddQuestion}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      + Add Question
                    </button>
                  </div>
                </div>

                {questions.length === 0 ? (
                  <div className="text-center p-8 bg-gray-50 border border-dashed border-gray-300 rounded-md mt-2 flex flex-col items-center justify-center gap-3">
                    <p className="text-sm text-gray-500">No questions added yet.</p>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleAddQuestion}
                        className="px-3 py-1.5 text-xs font-semibold border border-gray-300 rounded hover:bg-gray-100 text-gray-700 transition-colors"
                      >
                        + Add Question Manually
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsTextImportOpen(true)}
                        className="px-3 py-1.5 text-xs font-semibold rounded text-white hover:opacity-95 transition-opacity flex items-center gap-1.5 shadow-xs"
                        style={{ backgroundColor: "#a17038" }}
                      >
                        <FileText size={14} />
                        Add from Direct Text
                      </button>
                    </div>
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
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="font-semibold text-gray-700 w-6">{index + 1}.</span>
                            <select
                              value={q.type}
                              onChange={(e) => updateQuestion(q.id, "type", e.target.value as QuestionType)}
                              className="p-2 border border-gray-300 rounded focus:outline-none bg-white text-sm text-black"
                            >
                              <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                              <option value="MULTIPLE_CORRECT">Multiple Correct</option>
                              <option value="ONE_WORD">One Word</option>
                              <option value="SHORT_ANSWER">Short Answer</option>
                            </select>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                step="0.5"
                                min="0.5"
                                value={q.marks}
                                onChange={(e) => updateQuestion(q.id, "marks", parseFloat(e.target.value) || 1)}
                                className="w-16 p-2 border border-gray-300 rounded focus:outline-none text-sm text-gray-900 bg-white"
                                placeholder="Marks"
                              />
                              <span className="text-xs font-medium text-gray-500">Marks</span>
                            </div>
                            {/* Hide negative marks field for MULTIPLE_CORRECT with PROPORTIONAL/POSITIVE rules — penalty is handled by partial marking rule */}
                            {!(q.type === "MULTIPLE_CORRECT" && q.partialMarkingRule !== "NONE") && (
                            <div className="flex items-center gap-1.5 bg-rose-50/60 border border-rose-200 px-2 py-1 rounded">
                              <ShieldAlert size={13} className="text-rose-500" />
                              <span className="text-xs font-medium text-rose-700">Penalty:</span>
                              <input
                                type="number"
                                step="0.25"
                                min="0"
                                value={q.negativeMarks || 0}
                                onChange={(e) => updateQuestion(q.id, "negativeMarks", parseFloat(e.target.value) || 0)}
                                className="w-14 p-1 border border-rose-200 rounded text-xs text-rose-900 bg-white"
                                placeholder="0"
                              />
                            </div>
                            )}
                            {q.type === "MULTIPLE_CORRECT" && (
                              <div className="flex items-center gap-1.5 bg-emerald-50/60 border border-emerald-200 px-2 py-1 rounded">
                                <span className="text-xs font-medium text-emerald-800">Rule:</span>
                                <select
                                  value={q.partialMarkingRule || "PROPORTIONAL_WITH_PENALTY"}
                                  onChange={(e) => updateQuestion(q.id, "partialMarkingRule", e.target.value as PartialMarkingRule)}
                                  className="p-1 border border-emerald-200 rounded text-xs bg-white text-emerald-900"
                                >
                                  <option value="PROPORTIONAL_WITH_PENALTY">Proportional with Penalty</option>
                                  <option value="POSITIVE_ONLY">Positive Partial Only</option>
                                  <option value="NONE">All or Nothing</option>
                                </select>
                              </div>
                            )}
                          </div>

                          {q.type === "MULTIPLE_CORRECT" && (
                            <p className="text-[11px] text-gray-500 italic ml-9">
                              {q.partialMarkingRule === "PROPORTIONAL_WITH_PENALTY" && "• Proportional: Correct selections add partial credit; incorrect selections deduct partial credit (floor at 0)."}
                              {q.partialMarkingRule === "POSITIVE_ONLY" && "• Positive Only: Correct selections add partial credit without deductions for incorrect picks."}
                              {q.partialMarkingRule === "NONE" && "• All or Nothing: Must select all correct and no incorrect choices to receive marks."}
                            </p>
                          )}

                          <input
                            type="text"
                            value={q.questionText}
                            onChange={(e) => updateQuestion(q.id, "questionText", e.target.value)}
                            placeholder="Question text..."
                            className="w-full p-2 border border-gray-300 rounded focus:outline-none ml-9 text-gray-900 placeholder-gray-500"
                          />

                          {(q.type === "MULTIPLE_CHOICE" || q.type === "MULTIPLE_CORRECT") && (
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
                            ) : q.type === "MULTIPLE_CORRECT" ? (
                              <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-gray-600">Correct Answers (select all that apply):</label>
                                <div className="flex flex-wrap gap-2">
                                  {q.options.map((_, optIndex) => {
                                    const letter = getAlphabetLabel(optIndex)
                                    const selected = q.correctAnswer.split(",").map(s => s.trim()).includes(letter)
                                    return (
                                      <button
                                        key={optIndex}
                                        type="button"
                                        onClick={() => {
                                          const current = q.correctAnswer ? q.correctAnswer.split(",").map(s => s.trim()).filter(Boolean) : []
                                          const updated = selected
                                            ? current.filter(l => l !== letter)
                                            : [...current, letter].sort()
                                          updateQuestion(q.id, "correctAnswer", updated.join(","))
                                        }}
                                        className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold transition-colors border ${
                                          selected
                                            ? "bg-emerald-600 text-white border-emerald-700"
                                            : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                                        }`}
                                      >
                                        {letter}
                                      </button>
                                    )
                                  })}
                                </div>
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

                            {/* Model Answer / Explanation */}
                            <div className="mt-2.5">
                              <label className="text-xs font-semibold text-gray-700 block mb-1">
                                Model Answer / Explanation (revealed according to Answer Reveal Policy):
                              </label>
                              <textarea
                                value={q.modelAnswer || ""}
                                onChange={(e) => updateQuestion(q.id, "modelAnswer", e.target.value)}
                                placeholder="Ideal explanation, rubric, or sample model response for students to review..."
                                className="w-full p-2 border border-gray-200 rounded text-xs bg-white text-gray-900 placeholder-gray-400 min-h-[60px] resize-none focus:outline-none focus:ring-1 focus:ring-black"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {questions.length > 0 && (
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      type="button"
                      onClick={handleAddQuestion}
                      className="flex-1 py-3 text-sm border-2 border-dashed border-gray-300 rounded-md font-medium text-gray-600 hover:border-gray-400 hover:text-gray-800 hover:bg-gray-50 transition-colors"
                    >
                      + Add Question Manually
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsTextImportOpen(true)}
                      className="py-3 px-5 text-sm border-2 border-dashed border-[#a17038]/40 text-[#a17038] rounded-md font-medium hover:border-[#a17038] hover:bg-[#a17038]/5 transition-colors flex items-center justify-center gap-1.5"
                      title="Add more questions from direct text"
                    >
                      <FileText size={16} />
                      + Add via Text
                    </button>
                  </div>
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
                        {(q.type === "MULTIPLE_CHOICE" || q.type === "MULTIPLE_CORRECT") && (
                          <div className="flex flex-col gap-2">
                            {q.type === "MULTIPLE_CORRECT" && (
                              <span className="text-[11px] text-gray-500 italic mb-1">Select all that apply</span>
                            )}
                            {q.options.map((opt, i) => (
                              <label key={i} className="flex items-center gap-2 cursor-pointer">
                                <span className={`w-6 h-6 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0 ${q.type === "MULTIPLE_CORRECT" ? "rounded bg-gray-200" : "rounded-full bg-gray-200"}`}>
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

                        {q.modelAnswer && (
                          <div className="mt-2 p-2.5 bg-amber-50/70 border border-amber-200 rounded text-xs">
                            <span className="font-semibold text-amber-900 block mb-0.5">⚠️ Model Answer (hidden from students until answer reveal):</span>
                            <span className="text-gray-700 whitespace-pre-wrap">{q.modelAnswer}</span>
                          </div>
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
        <div className="p-5 border-t border-gray-200 flex justify-between items-center bg-white flex-wrap gap-3">
          <div className="text-xs text-gray-500">
            {status === 'CLOSED' ? (
              <span className="text-rose-600 font-medium flex items-center gap-1">
                🔒 Quiz is closed. Other users can only view their total marks.
              </span>
            ) : status === 'PUBLISHED' ? (
              <span className="text-emerald-700 font-medium">
                ✓ Quiz is published and active.
              </span>
            ) : (
              <span>Draft quiz. Not yet visible to students.</span>
            )}
          </div>
          <div className="flex items-center gap-3">
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
            {status === 'PUBLISHED' && (
              <button
                onClick={() => handleSave("CLOSED")}
                disabled={isSubmitting}
                className="px-5 py-2 font-medium text-white rounded bg-rose-600 hover:bg-rose-700 shadow-sm transition-colors text-sm flex items-center gap-1.5"
              >
                Close Quiz
              </button>
            )}
            {status === 'CLOSED' && (
              <button
                onClick={() => handleSave("PUBLISHED")}
                disabled={isSubmitting}
                className="px-5 py-2 font-medium text-white rounded bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors text-sm flex items-center gap-1.5"
              >
                Reopen Quiz
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

      {isTextImportOpen && (
        <AddQuestionsFromTextModal
          onClose={() => setIsTextImportOpen(false)}
          onAddQuestions={handleAddQuestionsFromText}
        />
      )}

      {markingGuideOpen && (
        <MarkingSchemeGuideModal
          onClose={() => setMarkingGuideOpen(false)}
        />
      )}
    </div>
  )
}
