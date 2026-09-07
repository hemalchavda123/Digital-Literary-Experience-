"use client"

import { useState, useEffect } from "react"
import type { Quiz, QuizQuestion } from "@/types/quiz"
import { submitQuiz, getQuizById, getMySubmission } from "@/lib/api/quizzes"
import { CheckCircle2, Award, Clock } from "lucide-react"

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
    let cancelled = false
    async function load() {
      try {
        const [quizData, subStatus] = await Promise.all([
          getQuizById(projectId, initialQuiz.id),
          getMySubmission(projectId, initialQuiz.id).catch(() => ({ submitted: false, submission: null })),
        ])
        if (!cancelled) {
          setQuiz(quizData)
          if (subStatus.submitted && subStatus.submission) {
            setSubmittedData(subStatus.submission)
          }
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load quiz", err)
          setLoading(false)
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
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
    } catch (error: any) {
      console.error("Failed to submit quiz", error)
      alert(error.message || "Failed to submit quiz. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const maxScore = quiz?.questions?.reduce((sum, q) => sum + q.marks, 0) || 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-100">
        <div className="flex justify-between items-center p-5 border-b border-gray-200 bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{initialQuiz.title}</h2>
            {submittedData && (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded inline-flex items-center gap-1 mt-1">
                <CheckCircle2 size={12} /> Previously Submitted
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-200/50 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500 gap-3">
              <div className="w-8 h-8 border-3 border-[#a17038] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium">Loading quiz details...</span>
            </div>
          ) : submittedData ? (
            <div className="flex flex-col items-center justify-center py-8 gap-6">
              <div className="w-20 h-20 bg-emerald-100/80 text-emerald-600 rounded-full flex items-center justify-center shadow-inner">
                <Award size={44} />
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-extrabold text-gray-900">Quiz Completed</h3>
                <p className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1">
                  <Clock size={12} />
                  Submitted on {new Date(submittedData.submittedAt || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>

              {submittedData.totalScore !== null && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-8 py-4 text-center shadow-sm">
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">Your Result</span>
                  <span className="text-4xl font-extrabold text-[#a17038] block mt-1">
                    {submittedData.totalScore} {maxScore > 0 ? `/ ${maxScore}` : "marks"}
                  </span>
                </div>
              )}

              {/* Submitted Answers Review */}
              {quiz && quiz.questions && (
                <div className="w-full text-left space-y-4 pt-4 border-t border-gray-200">
                  <h4 className="font-bold text-sm text-gray-900">Your Submitted Responses:</h4>
                  {quiz.questions.map((q, idx) => {
                    const ans = submittedData.answers?.find((a: any) => a.questionId === q.id)
                    return (
                      <div key={q.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs space-y-1">
                        <div className="font-semibold text-gray-900">
                          {idx + 1}. {q.questionText} ({q.marks} marks)
                        </div>
                        <div className="text-gray-700">
                          Your answer: <span className="font-bold">{ans?.answerText || "No answer"}</span>
                        </div>
                        {ans?.score !== undefined && ans?.score !== null && (
                          <div className={`font-semibold ${ans.score > 0 ? "text-emerald-600" : "text-red-500"}`}>
                            {ans.score > 0 ? `+${ans.score} marks` : "0 marks"}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : quiz ? (
            <>
              {quiz.description && (
                <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">{quiz.description}</p>
              )}

              <div className="flex flex-col gap-8 mt-2">
                {quiz.questions?.map((q: QuizQuestion, index: number) => {
                  const options = q.options ? JSON.parse(q.options) : []
                  return (
                    <div key={q.id} className="flex flex-col gap-3 p-4 rounded-lg bg-gray-50/60 border border-gray-200/80">
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-gray-900">{index + 1}.</span>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{q.questionText}</p>
                          <span className="text-xs text-gray-500 mt-1 inline-block bg-white px-2 py-0.5 border border-gray-200 rounded">
                            {q.marks} {q.marks === 1 ? "mark" : "marks"}
                          </span>
                        </div>
                      </div>

                      <div className="ml-6">
                        {q.type === "MULTIPLE_CHOICE" && (
                          <div className="flex flex-col gap-2.5">
                            {options.map((opt: string, i: number) => (
                              <label key={i} className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-white transition-colors">
                                <input
                                  type="radio"
                                  name={`question-${q.id}`}
                                  value={opt}
                                  checked={answers[q.id] === opt}
                                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                  className="w-4 h-4 text-[#a17038] focus:ring-[#a17038]"
                                />
                                <span className="text-gray-800 text-sm font-medium">{opt}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {q.type === "ONE_WORD" && (
                          <input
                            type="text"
                            value={answers[q.id] || ""}
                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                            className="w-full max-w-md p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a17038] text-sm text-gray-900 bg-white placeholder-gray-400"
                            placeholder="Type single word answer..."
                          />
                        )}

                        {q.type === "SHORT_ANSWER" && (
                          <textarea
                            value={answers[q.id] || ""}
                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a17038] min-h-[100px] text-sm text-gray-900 bg-white placeholder-gray-400"
                            placeholder="Type your response..."
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="text-red-500 py-8 text-center">Failed to load quiz questions.</div>
          )}
        </div>

        {!loading && !submittedData && quiz && (
          <div className="p-5 border-t border-gray-200 flex justify-end gap-3 bg-gray-50/50">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-black"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-95 shadow-sm"
              style={{ backgroundColor: "#a17038" }}
            >
              {isSubmitting ? "Submitting..." : "Submit Answers"}
            </button>
          </div>
        )}

        {submittedData && (
          <div className="p-5 border-t border-gray-200 flex justify-end gap-3 bg-gray-50/50">
            <button
              onClick={onClose}
              className="px-6 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-95 shadow-sm"
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
