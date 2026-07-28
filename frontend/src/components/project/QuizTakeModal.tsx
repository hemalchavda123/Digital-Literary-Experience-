"use client"

import { useState, useEffect } from "react"
import type { Quiz, QuizQuestion } from "@/types/quiz"
import { submitQuiz } from "@/lib/api/quizzes"
import { getQuizById } from "@/lib/api/quizzes"

interface Props {
  quiz: Quiz
  projectId: string
  onClose: () => void
}

export function QuizTakeModal({ quiz: initialQuiz, projectId, onClose }: Props) {
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submittedData, setSubmittedData] = useState<any>(null)

  useEffect(() => {
    // Fetch full quiz with questions
    getQuizById(projectId, initialQuiz.id)
      .then((data) => {
        setQuiz(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error("Failed to load quiz", err)
        setLoading(false)
      })
  }, [projectId, initialQuiz.id])

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const handleSubmit = async () => {
    if (!quiz) return
    setIsSubmitting(true)
    try {
      const answerPayload = Object.entries(answers).map(([questionId, answerText]) => ({
        questionId,
        answerText,
      }))
      const res = await submitQuiz(projectId, quiz.id, answerPayload)
      setSubmittedData(res)
    } catch (error) {
      console.error("Failed to submit quiz", error)
      alert("Failed to submit quiz. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{initialQuiz.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
          {loading ? (
            <div className="flex justify-center items-center py-12 text-gray-500">Loading quiz...</div>
          ) : submittedData ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Quiz Submitted!</h3>
              {submittedData.totalScore !== null && (
                <p className="text-lg font-medium text-gray-700">
                  Your Score: <span className="font-bold text-[#a17038]">{submittedData.totalScore}</span>
                </p>
              )}
            </div>
          ) : quiz ? (
            <>
              {quiz.description && (
                <p className="text-gray-700 whitespace-pre-wrap">{quiz.description}</p>
              )}
              
              <div className="flex flex-col gap-8 mt-2">
                {quiz.questions?.map((q: QuizQuestion, index: number) => {
                  const options = q.options ? JSON.parse(q.options) : []
                  return (
                    <div key={q.id} className="flex flex-col gap-3">
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-gray-900">{index + 1}.</span>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{q.questionText}</p>
                          <span className="text-xs text-gray-500 mt-1 inline-block">{q.marks} marks</span>
                        </div>
                      </div>
                      
                      <div className="ml-6">
                        {q.type === "MULTIPLE_CHOICE" && (
                          <div className="flex flex-col gap-2">
                            {options.map((opt: string, i: number) => (
                              <label key={i} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`question-${q.id}`}
                                  value={opt}
                                  checked={answers[q.id] === opt}
                                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                  className="w-4 h-4 text-[#a17038] focus:ring-[#a17038]"
                                />
                                <span className="text-gray-700 text-sm">{opt}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {q.type === "ONE_WORD" && (
                          <input
                            type="text"
                            value={answers[q.id] || ""}
                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                            className="w-full max-w-md p-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black text-sm"
                            placeholder="Your answer..."
                          />
                        )}

                        {q.type === "SHORT_ANSWER" && (
                          <textarea
                            value={answers[q.id] || ""}
                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black min-h-[100px] resize-y text-sm"
                            placeholder="Your answer..."
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="text-red-500">Failed to load quiz.</div>
          )}
        </div>

        {!loading && !submittedData && quiz && (
          <div className="p-5 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 font-medium text-gray-700 hover:text-black"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2 font-medium text-white rounded hover:opacity-95 shadow-sm"
              style={{ backgroundColor: "#a17038" }}
            >
              {isSubmitting ? "Submitting..." : "Submit Answers"}
            </button>
          </div>
        )}

        {submittedData && (
          <div className="p-5 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
            <button
              onClick={onClose}
              className="px-6 py-2 font-medium text-white rounded hover:opacity-95 shadow-sm"
              style={{ backgroundColor: "#a17038" }}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
