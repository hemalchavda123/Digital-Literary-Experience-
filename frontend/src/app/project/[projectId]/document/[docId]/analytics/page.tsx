"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { getPdfQuizAnalytics } from "@/lib/api/quizzes"
import { getProjectById } from "@/lib/api/projects"
import type { PdfQuizAnalytics, PdfQuizSummary } from "@/types/quiz"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import {
  ArrowLeft,
  PieChart,
  BarChart2,
  FileText,
  Users,
  Award,
  BookOpen,
  ChevronRight,
  ExternalLink,
} from "lucide-react"

const GOOGLE_FORMS_PALETTE = ["#4285f4", "#ea4335", "#fbbc04", "#34a853", "#ab47bc", "#00acc1", "#ff7043"]

function DocumentQuizzesDonutChart({ summaries }: { summaries: PdfQuizSummary[] }) {
  const total = summaries.reduce((sum, s) => sum + s.submissionsCount, 0)
  if (total === 0) {
    return (
      <div className="py-6 text-center text-xs text-gray-500 italic bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
        No responses recorded across document quizzes yet.
      </div>
    )
  }

  let cumulativeAngle = 0
  const activeSummaries = summaries.filter((s) => s.submissionsCount > 0)
  const slices = activeSummaries.map((s, i) => {
    const angle = (s.submissionsCount / total) * 360
    const startAngle = cumulativeAngle
    const endAngle = cumulativeAngle + angle
    cumulativeAngle += angle

    const x1 = 100 + 75 * Math.cos((Math.PI * (startAngle - 90)) / 180)
    const y1 = 100 + 75 * Math.sin((Math.PI * (startAngle - 90)) / 180)
    const x2 = 100 + 75 * Math.cos((Math.PI * (endAngle - 90)) / 180)
    const y2 = 100 + 75 * Math.sin((Math.PI * (endAngle - 90)) / 180)

    const percentage = Math.round((s.submissionsCount / total) * 100)

    return {
      pathData:
        angle === 360
          ? `M 100 25 A 75 75 0 1 1 99.99 25 Z`
          : `M 100 100 L ${x1} ${y1} A 75 75 0 ${angle > 180 ? 1 : 0} 1 ${x2} ${y2} Z`,
      color: GOOGLE_FORMS_PALETTE[i % GOOGLE_FORMS_PALETTE.length],
      label: s.title,
      count: s.submissionsCount,
      percentage,
    }
  })

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-8 py-4">
      <div className="relative w-48 h-48 flex-shrink-0">
        <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
          {slices.map((slice, idx) => (
            <path
              key={idx}
              d={slice.pathData}
              fill={slice.color}
              className="transition-opacity duration-150 hover:opacity-90 cursor-pointer"
            >
              <title>{`${slice.label}: ${slice.count} responses (${slice.percentage}%)`}</title>
            </path>
          ))}
          <circle cx="100" cy="100" r="46" fill="#ffffff" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-2xl font-bold text-gray-900">{total}</span>
          <span className="text-[11px] font-medium text-gray-500">submissions</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 min-w-[240px] flex-1 w-full">
        {summaries.map((s, i) => {
          const percentage = total > 0 ? Math.round((s.submissionsCount / total) * 100) : 0
          return (
            <div
              key={s.quizId}
              className="flex items-center justify-between p-2.5 rounded-lg text-xs gap-3 bg-gray-50 border border-gray-150"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: GOOGLE_FORMS_PALETTE[i % GOOGLE_FORMS_PALETTE.length] }}
                />
                <span className="font-medium text-gray-800 truncate" title={s.title}>
                  {s.title}
                </span>
              </div>
              <span className="font-semibold text-gray-900 flex-shrink-0">
                {s.submissionsCount} <span className="text-gray-500 font-normal">({percentage}%)</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DocumentQuizzesBarChart({ summaries }: { summaries: PdfQuizSummary[] }) {
  const maxSubmissions = Math.max(...summaries.map((s) => s.submissionsCount), 1)

  return (
    <div className="space-y-3 py-2">
      {summaries.map((s, i) => {
        const fillWidth = Math.max(Math.round((s.submissionsCount / maxSubmissions) * 100), s.submissionsCount > 0 ? 3 : 0)

        return (
          <div key={s.quizId} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-gray-800 flex items-center gap-1.5">
                {s.title}
                <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                  Avg Score: {s.averagePercentage}%
                </span>
              </span>
              <span className="font-semibold text-gray-900">
                {s.submissionsCount} submissions
              </span>
            </div>
            <div className="w-full bg-gray-100 h-4 rounded-md overflow-hidden flex">
              <div
                className="h-full rounded-md transition-all duration-300"
                style={{
                  width: `${fillWidth}%`,
                  backgroundColor: GOOGLE_FORMS_PALETTE[i % GOOGLE_FORMS_PALETTE.length],
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function DocumentAnalyticsPage() {
  const params = useParams<{ projectId: string; docId: string }>()
  const router = useRouter()
  const [analytics, setAnalytics] = useState<PdfQuizAnalytics | null>(null)
  const [projectName, setProjectName] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chartView, setChartView] = useState<"pie" | "bar">("bar")

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const [data, proj] = await Promise.all([
          getPdfQuizAnalytics(params.projectId, params.docId),
          getProjectById(params.projectId).catch(() => null),
        ])
        setAnalytics(data)
        if (proj) setProjectName((proj as any).name || "")
      } catch (err: any) {
        console.error("Failed to load document PDF quiz analytics", err)
        setError(err.message || "Failed to load document quiz analytics")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.projectId, params.docId])

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push(`/document/${params.docId}`)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700 hover:text-black bg-white border border-gray-200 px-3.5 py-2 rounded-lg transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Document
          </button>

          <span className="text-xs text-gray-500 font-medium">
            {projectName && `${projectName} / `}Document Analytics
          </span>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-16 flex flex-col items-center justify-center gap-3 text-gray-500">
            <div className="w-8 h-8 border-3 border-gray-900 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium">Loading document analytics...</p>
          </div>
        ) : error ? (
          <div className="bg-white border border-red-200 rounded-xl p-8 text-center text-red-700 space-y-1">
            <h3 className="text-base font-semibold">Access Denied or Error</h3>
            <p className="text-xs text-red-600">{error}</p>
          </div>
        ) : analytics ? (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText size={13} /> PDF Document Quiz Analytics
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{analytics.documentTitle}</h1>
                <p className="text-xs text-gray-500 mt-1">
                  Aggregate metrics for all inline quiz annotations in this PDF document.
                </p>
              </div>

              {/* Minimalist Summary Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                <div className="bg-gray-50/70 p-4 rounded-lg border border-gray-150">
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-medium mb-1">
                    <BookOpen size={14} className="text-gray-600" /> Quiz Annotations
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{analytics.totalPdfQuizzes}</div>
                </div>

                <div className="bg-gray-50/70 p-4 rounded-lg border border-gray-150">
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-medium mb-1">
                    <Users size={14} className="text-gray-600" /> Total Submissions
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{analytics.totalSubmissionsCount}</div>
                </div>

                <div className="bg-gray-50/70 p-4 rounded-lg border border-gray-150">
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-medium mb-1">
                    <Award size={14} className="text-gray-600" /> Overall Avg Score
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{analytics.overallAveragePercentage}%</div>
                </div>
              </div>
            </div>

            {/* Document Submissions Distribution Chart Card */}
            {analytics.quizSummaries.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-7 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">Submissions per Quiz</h2>
                    <p className="text-xs text-gray-500">Comparison of responses across PDF quizzes</p>
                  </div>
                  <div className="flex items-center gap-0.5 bg-gray-100 p-1 rounded-lg border border-gray-200">
                    <button
                      onClick={() => setChartView("bar")}
                      className={`p-1.5 rounded transition-colors ${chartView === "bar" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                      title="Bar view"
                    >
                      <BarChart2 size={14} />
                    </button>
                    <button
                      onClick={() => setChartView("pie")}
                      className={`p-1.5 rounded transition-colors ${chartView === "pie" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                      title="Pie view"
                    >
                      <PieChart size={14} />
                    </button>
                  </div>
                </div>

                {chartView === "bar" ? (
                  <DocumentQuizzesBarChart summaries={analytics.quizSummaries} />
                ) : (
                  <DocumentQuizzesDonutChart summaries={analytics.quizSummaries} />
                )}
              </div>
            )}

            {/* Individual Inline PDF Quiz Summaries */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900 px-1">Quiz Annotations Breakdown</h2>

              {analytics.quizSummaries.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500 space-y-2">
                  <BookOpen size={32} className="mx-auto text-gray-300" />
                  <p className="font-semibold text-gray-800 text-sm">No inline PDF quizzes found in this document.</p>
                  <p className="text-xs text-gray-500">Add a quiz annotation in the document viewer to view question responses here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {analytics.quizSummaries.map((quiz) => (
                    <div
                      key={quiz.quizId}
                      className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
                            Inline Quiz
                          </span>
                          {quiz.annotationSnippet && (
                            <span className="text-xs text-gray-500 truncate max-w-xs italic">
                              "{quiz.annotationSnippet}"
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-semibold text-gray-900 truncate">{quiz.title}</h3>

                        <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                          <span>Questions: <strong className="text-gray-900">{quiz.questionCount}</strong></span>
                          <span>•</span>
                          <span>Max Marks: <strong className="text-gray-900">{quiz.maxMarks}</strong></span>
                          <span>•</span>
                          <span>Submissions: <strong className="text-gray-900">{quiz.submissionsCount}</strong></span>
                          <span>•</span>
                          <span>Avg Score: <strong className="text-emerald-700 font-semibold">{quiz.averagePercentage}%</strong></span>
                        </div>
                      </div>

                      <button
                        onClick={() => router.push(`/project/${params.projectId}/quiz/${quiz.quizId}/analytics`)}
                        className="inline-flex items-center gap-1.5 bg-gray-900 hover:bg-black text-white font-medium text-xs px-3.5 py-2 rounded-lg transition-colors flex-shrink-0"
                      >
                        Question Analytics <ExternalLink size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </main>

      <Footer />
    </div>
  )
}
