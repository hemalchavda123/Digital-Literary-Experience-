"use client"

import { useState } from "react"
import { useProjects } from "@/context/ProjectContext"
import { QuestionType, AnswerRevealMode, PartialMarkingRule } from "@/types/quiz"
import { createQuiz as apiCreateQuiz } from "@/lib/api/quizzes"
import { AddQuestionsFromTextModal } from "@/components/project/AddQuestionsFromTextModal"
import { ParsedQuestion } from "@/lib/quizTextParser"
import { FileText, Trophy, Eye, ShieldAlert, HelpCircle } from "lucide-react"
import { MarkingSchemeGuideModal } from "@/components/project/MarkingSchemeGuideModal"

interface Props {
  projectId: string
  documentId?: string | null
  annotationId?: string | null
  onClose: () => void
}

interface TempQuestion {
  id: number
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

export function CreateQuizModal({ projectId, documentId, annotationId, onClose }: Props) {
  const { fetchQuizzes } = useProjects()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [answerRevealMode, setAnswerRevealMode] = useState<AnswerRevealMode>("IMMEDIATE")
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(true)
  const [questions, setQuestions] = useState<TempQuestion[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isTextImportOpen, setIsTextImportOpen] = useState(false)
  const [markingGuideOpen, setMarkingGuideOpen] = useState(false)

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: ++tempQuestionIdCounter,
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
      id: ++tempQuestionIdCounter,
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

  const handleRemoveQuestion = (id: number) => {
    setQuestions(questions.filter((q) => q.id !== id))
  }

  const updateQuestion = (
    id: number,
    field: keyof TempQuestion,
    value: TempQuestion[keyof TempQuestion]
  ) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, [field]: value } : q)))
  }

  const updateOption = (questionId: number, optionIndex: number, value: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== questionId) return q
        const newOptions = [...q.options]
        newOptions[optionIndex] = value
        return { ...q, options: newOptions }
      })
    )
  }

  const addOption = (questionId: number) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== questionId) return q
        if (q.options.length >= 26) return q // Limit to Z
        return { ...q, options: [...q.options, `Option ${q.options.length + 1}`] }
      })
    )
  }

  const removeOption = (questionId: number, optionIndex: number) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== questionId) return q
        return { ...q, options: q.options.filter((_, i) => i !== optionIndex) }
      })
    )
  }

  const handleSubmit = async (status: "DRAFT" | "PUBLISHED") => {
    if (!title.trim()) {
      alert("Title is required.")
      return
    }
    if (questions.length === 0) {
      alert("Please add at least one question.")
      return
    }

    setIsSubmitting(true)
    try {
      await apiCreateQuiz(projectId, {
        title: title.trim(),
        description: description.trim(),
        status,
        documentId: documentId || null,
        annotationId: annotationId || null,
        answerRevealMode,
        showLeaderboard,
        questions: questions.map((q) => ({
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
      await fetchQuizzes(projectId)
      onClose()
    } catch (error) {
      console.error("Failed to create quiz", error)
      alert("Failed to create quiz. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-200">
        <div className="flex justify-between items-center p-5 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Create Quiz</h2>
            {(documentId || annotationId) && (
              <span className="text-xs text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded">
                Linked to PDF Annotation
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
          {/* Quiz Details */}
          <div className="flex flex-col gap-4">
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
              className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black min-h-[100px] resize-none text-gray-900 placeholder-gray-500"
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
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-gray-900">Questions</h3>
                <button
                  type="button"
                  onClick={() => setMarkingGuideOpen(true)}
                  className="px-2.5 py-1 text-xs border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg font-semibold transition-colors flex items-center gap-1 shadow-2xs"
                  title="Understand partial marking, penalties, and grading rules"
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
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md font-medium text-gray-700 hover:bg-gray-50"
                >
                  + Add Question
                </button>
              </div>
            </div>

            {questions.length === 0 ? (
              <div className="text-center p-8 bg-gray-50 border border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center gap-3">
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
              <>{questions.map((q, index) => (
                <div key={q.id} className="border border-gray-200 rounded-md p-4 bg-gray-50 relative group">
                  <div className="absolute top-4 right-12 flex items-center gap-2">
                    <label className="flex items-center cursor-pointer gap-2">
                      <span className="text-xs text-gray-500 font-medium">{q.isPublished ? "Published" : "Draft"}</span>
                      <div className="relative">
                        <input type="checkbox" className="sr-only" checked={q.isPublished} onChange={(e) => updateQuestion(q.id, "isPublished", e.target.checked)} />
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
              ))}</>
            )}
            {questions.length > 0 && (
              <div className="flex items-center gap-3">
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
        </div>

        <div className="p-5 border-t border-gray-200 flex justify-between items-center bg-gray-50 flex-wrap gap-3">
          <span className="text-xs text-gray-500 italic">
            Note: &quot;Save as Draft&quot; keeps the quiz hidden from other members until you publish it.
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 font-medium text-gray-700 hover:text-black"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSubmit("DRAFT")}
              disabled={isSubmitting}
              className="px-4 py-2 font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              Save as Draft
            </button>
            <button
              onClick={() => handleSubmit("PUBLISHED")}
              disabled={isSubmitting}
              className="px-4 py-2 font-medium text-white rounded hover:opacity-95"
              style={{ backgroundColor: "#a17038" }}
            >
              Publish Now
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
