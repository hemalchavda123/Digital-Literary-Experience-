"use client"

import { useState, useEffect } from "react"
import type { Quiz, QuizSubmission } from "@/types/quiz"
import { getSubmissions, downloadQuizAnswersExcel } from "@/lib/api/quizzes"
import { FileSpreadsheet, TrendingUp } from "lucide-react"
import { StudentPerformanceModal } from "./StudentPerformanceModal"

interface Props {
  quiz: Quiz
  projectId: string
  onClose: () => void
}

export function QuizSubmissionsModal({ quiz, projectId, onClose }: Props) {
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<{ userId: string; username: string } | null>(null)

  const handleDownloadExcel = async () => {
    try {
      setDownloading(true)
      await downloadQuizAnswersExcel(projectId, quiz.id, quiz.title)
    } catch (err: any) {
      alert(err.message || "Failed to download Excel file")
    } finally {
      setDownloading(false)
    }
  }

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-200">
        <div className="flex justify-between items-center p-5 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">Submissions: {quiz.title}</h2>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
              quiz.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
              quiz.status === 'CLOSED' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
              'bg-gray-100 text-gray-600'
            }`}>
              {quiz.status}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {quiz.status === 'CLOSED' ? (
              <button
                onClick={handleDownloadExcel}
                disabled={downloading}
                className="text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                title="Download all quiz answers in Excel (.xlsx) format"
              >
                <FileSpreadsheet size={15} />
                {downloading ? "Downloading Excel..." : "Download Excel (.xlsx)"}
              </button>
            ) : (
              <div
                className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 flex items-center gap-1.5"
                title="Excel download becomes available once the quiz is closed"
              >
                <FileSpreadsheet size={14} className="text-gray-400" />
                <span>Excel available when closed</span>
              </div>
            )}

            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
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
                    <div className="flex items-center gap-2.5">
                      <div className="font-semibold text-gray-900">{sub.user?.username || "Unknown User"}</div>
                      {sub.user?.email && <span className="text-xs text-gray-400">({sub.user.email})</span>}
                      <button
                        type="button"
                        onClick={() => setSelectedStudent({ userId: sub.userId, username: sub.user?.username || "Student" })}
                        className="ml-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded flex items-center gap-1 transition-colors"
                        title="View student's quiz trajectory across this project"
                      >
                        <TrendingUp size={11} className="text-indigo-600" />
                        Performance Trajectory
                      </button>
                    </div>
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
                            <span className={`text-xs font-medium ${ans.isCorrect ? "text-green-600" : (ans.score || 0) > 0 ? "text-amber-600 font-semibold" : "text-red-500"}`}>
                              {ans.isCorrect ? "✓ Correct" : (ans.score || 0) > 0 ? "⚡ Partial Credit" : "✗ Incorrect"} ({ans.score} marks)
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

      {selectedStudent && (
        <StudentPerformanceModal
          projectId={projectId}
          userId={selectedStudent.userId}
          studentName={selectedStudent.username}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  )
}
