"use client"

import { useState, useEffect } from "react"
import type { Quiz, QuizSubmission } from "@/types/quiz"
import { getSubmissions } from "@/lib/api/quizzes"

interface Props {
  quiz: Quiz
  projectId: string
  onClose: () => void
}

export function QuizSubmissionsModal({ quiz, projectId, onClose }: Props) {
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSubmissions(projectId, quiz.id)
      .then((data) => {
        setSubmissions(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error("Failed to load submissions", err)
        setLoading(false)
      })
  }, [projectId, quiz.id])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Submissions: {quiz.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
          {loading ? (
            <div className="flex justify-center items-center py-12 text-gray-500">Loading submissions...</div>
          ) : submissions.length === 0 ? (
            <div className="text-center p-8 bg-gray-50 rounded-md border border-gray-200">
              <p className="text-sm text-gray-500">No submissions yet.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {submissions.map((sub) => (
                <div key={sub.id} className="border border-gray-200 rounded-md p-4 bg-gray-50 flex flex-col gap-3">
                  <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                    <div className="font-semibold text-gray-900">{sub.user?.username || "Unknown User"}</div>
                    <div className="flex items-center gap-4 text-sm font-medium">
                      <span className="text-gray-500">
                        {new Date(sub.submittedAt).toLocaleString()}
                      </span>
                      {sub.totalScore !== null && (
                        <span className="text-[#a17038] bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                          Score: {sub.totalScore}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {sub.answers && sub.answers.length > 0 ? (
                    <div className="flex flex-col gap-2 mt-2">
                      {sub.answers.map((ans, i) => (
                        <div key={ans.id} className="text-sm flex flex-col gap-1">
                          <span className="text-gray-600 font-medium text-xs uppercase tracking-wider">Answer {i + 1}</span>
                          <span className="text-gray-900 bg-white p-2 border border-gray-200 rounded">{ans.answerText || <span className="text-gray-400 italic">No answer provided</span>}</span>
                          {ans.isCorrect !== null && (
                            <span className={`text-xs font-medium ${ans.isCorrect ? "text-green-600" : "text-red-500"}`}>
                              {ans.isCorrect ? "✓ Correct" : "✗ Incorrect"} ({ans.score} marks)
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 italic">No answers submitted.</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
