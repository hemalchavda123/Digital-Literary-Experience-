"use client"

import { useState } from "react"
import { useProjects } from "@/context/ProjectContext"
import { QuestionType } from "@/types/quiz"

interface Props {
  projectId: string
  onClose: () => void
}

interface TempQuestion {
  id: number
  type: QuestionType
  questionText: string
  options: string[]
  marks: number
  correctAnswer: string
  isPublished: boolean
}

let tempQuestionIdCounter = 0

export function CreateQuizModal({ projectId, onClose }: Props) {
  const { createQuiz } = useProjects()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [questions, setQuestions] = useState<TempQuestion[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: ++tempQuestionIdCounter,
        type: "SHORT_ANSWER",
        questionText: "",
        options: ["Option 1", "Option 2"],
        marks: 1,
        correctAnswer: "",
        isPublished: true,
      },
    ])
  }

  const handleRemoveQuestion = (id: number) => {
    setQuestions(questions.filter((q) => q.id !== id))
  }

  const updateQuestion = (id: number, field: keyof TempQuestion, value: any) => {
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
      await createQuiz(projectId, {
        title: title.trim(),
        description: description.trim(),
        status,
        questions: questions.map((q) => ({
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
      console.error("Failed to create quiz", error)
      alert("Failed to create quiz. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Create New Quiz</h2>
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
          </div>

          {/* Questions */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Questions</h3>
              <button
                onClick={handleAddQuestion}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md font-medium text-gray-700 hover:bg-gray-50"
              >
                + Add Question
              </button>
            </div>

            {questions.length === 0 ? (
              <div className="text-center p-8 bg-gray-50 border border-dashed border-gray-300 rounded-md">
                <p className="text-sm text-gray-500">No questions added yet.</p>
              </div>
            ) : (
              questions.map((q, index) => (
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
                            <input type="radio" disabled className="w-4 h-4" />
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
                        <button onClick={() => addOption(q.id)} className="text-xs text-[#a17038] hover:underline self-start mt-1">
                          + Add Option
                        </button>
                      </div>
                    )}

                    <div className="ml-9 mt-2">
                      <input
                        type="text"
                        value={q.correctAnswer}
                        onChange={(e) => updateQuestion(q.id, "correctAnswer", e.target.value)}
                        placeholder="Correct Answer (optional, for auto-grading)"
                        className="w-full p-2 border border-gray-200 rounded focus:outline-none text-sm bg-white text-gray-900 placeholder-gray-500"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-5 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
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
  )
}
