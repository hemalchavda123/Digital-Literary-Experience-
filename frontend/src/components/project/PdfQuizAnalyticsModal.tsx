"use client"

import { useState, useEffect } from "react"
import { getPdfQuizAnalytics } from "@/lib/api/quizzes"
import type { PdfQuizAnalytics } from "@/types/quiz"
import { QuizAnalyticsModal } from "./QuizAnalyticsModal"
import { X, FileText, CheckCircle2, Users, Layers, ExternalLink } from "lucide-react"

interface Props {
  projectId: string
  documentId: string
  documentTitle?: string
  onClose: () => void
}

export function PdfQuizAnalyticsModal({ projectId, documentId, documentTitle, onClose }: Props) {
  const [analytics, setAnalytics] = useState<PdfQuizAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSingleQuizId, setSelectedSingleQuizId] = useState<string | null>(null)

  useEffect(() => {
    getPdfQuizAnalytics(projectId, documentId)
      .then((data) => {
        setAnalytics(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error("Failed to load PDF quiz analytics", err)
        setError(err.message || "Failed to load PDF quiz analytics")
        setLoading(false)
      })
  }, [projectId, documentId])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-50 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-200">
        {/* Top Header Banner Card */}
        <div className="bg-white border-b border-gray-200 p-6 relative">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-500 rounded-t-2xl" />

          <div className="flex items-start justify-between gap-4 pt-1">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-purple-700 bg-purple-50 border border-purple-100 px-2.5 py-0.5 rounded-full">
                  PDF Quizzes Response Overview
                </span>
              </div>
              <h2 className="text-2xl font-black text-gray-900 mt-2 flex items-center gap-2">
                <FileText size={24} className="text-purple-600" />
                {analytics?.documentTitle || documentTitle || "PDF Document Quizzes"}
              </h2>
              <p className="text-xs text-gray-600 mt-1">
                Question response metrics across all PDF inline annotation quizzes in this document
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Response Count Pill Banner */}
          {analytics && (
            <div className="flex items-center gap-6 mt-5 pt-4 border-t border-gray-100 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <Layers size={18} />
                </div>
                <div>
                  <span className="text-xl font-black text-gray-900">{analytics.totalPdfQuizzes}</span>
                  <span className="text-xs text-gray-500 block leading-none">PDF Quizzes</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Users size={18} />
                </div>
                <div>
                  <span className="text-xl font-black text-gray-900">{analytics.totalSubmissionsCount}</span>
                  <span className="text-xs text-gray-500 block leading-none">Total Responses</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <span className="text-xl font-black text-gray-900">{analytics.overallAveragePercentage}%</span>
                  <span className="text-xs text-gray-500 block leading-none">Overall Score Avg</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Individual PDF Quizzes Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500">
              <div className="w-9 h-9 border-3 border-purple-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-semibold">Loading document PDF quiz analytics...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-600 bg-red-50 rounded-xl border border-red-200">
              <p className="font-semibold text-sm">{error}</p>
            </div>
          ) : analytics && analytics.quizSummaries ? (
            <div className="space-y-4">
              {analytics.quizSummaries.map((q) => (
                <div
                  key={q.quizId}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:border-purple-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-gray-900 truncate">{q.title}</h3>
                      <span className="text-xs bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-full font-semibold">
                        {q.questionCount} Questions
                      </span>
                    </div>
                    {q.annotationSnippet && (
                      <p className="text-xs text-gray-500 italic mt-1 truncate">
                        &quot;{q.annotationSnippet}&quot;
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-600 mt-2">
                      <span>Responses: <strong className="text-gray-900">{q.submissionsCount}</strong></span>
                      <span>Average Mark: <strong className="text-gray-900">{q.averageScore} / {q.maxMarks}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <span className="text-2xl font-extrabold text-purple-700">{q.averagePercentage}%</span>
                      <span className="text-[10px] font-semibold text-gray-500 block uppercase">Correctness</span>
                    </div>
                    <button
                      onClick={() => setSelectedSingleQuizId(q.quizId)}
                      className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
                    >
                      Question Responses <ExternalLink size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">No PDF quizzes found in this document.</div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-end bg-white">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md transition-colors"
          >
            Close Overview
          </button>
        </div>
      </div>

      {/* Single Quiz Question Analytics Modal overlay */}
      {selectedSingleQuizId && (
        <QuizAnalyticsModal
          projectId={projectId}
          quizId={selectedSingleQuizId}
          onClose={() => setSelectedSingleQuizId(null)}
        />
      )}
    </div>
  )
}
