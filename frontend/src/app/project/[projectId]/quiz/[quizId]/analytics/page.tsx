"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { getQuizAnalytics } from "@/lib/api/quizzes"
import { getProjectById } from "@/lib/api/projects"
import type { QuizAnalytics, QuestionBreakdown, ResponseDistributionItem } from "@/types/quiz"
import Navbar from "@/components/Navbar"
import {
  ArrowLeft,
  PieChart,
  BarChart2,
  ListFilter,
  CheckCircle2,
  Users,
  HelpCircle,
  Award,
  Check,
} from "lucide-react"

// Classic Google Forms response chart color palette
const GOOGLE_FORMS_PALETTE = ["#4285f4", "#ea4335", "#fbbc04", "#34a853", "#ab47bc", "#00acc1", "#ff7043"]

function QuestionDonutChart({ responses }: { responses: ResponseDistributionItem[] }) {
  const total = responses.reduce((sum, r) => sum + r.count, 0)
  if (total === 0) {
    return (
      <div className="py-6 text-center text-xs text-gray-500 italic bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
        No responses recorded for this question yet.
      </div>
    )
  }

  let cumulativeAngle = 0
  const activeSlices = responses.filter((r) => r.count > 0)
  const slices = activeSlices.map((r, i) => {
    const angle = (r.count / total) * 360
    const startAngle = cumulativeAngle
    const endAngle = cumulativeAngle + angle
    cumulativeAngle += angle

    const x1 = 100 + 75 * Math.cos((Math.PI * (startAngle - 90)) / 180)
    const y1 = 100 + 75 * Math.sin((Math.PI * (startAngle - 90)) / 180)
    const x2 = 100 + 75 * Math.cos((Math.PI * (endAngle - 90)) / 180)
    const y2 = 100 + 75 * Math.sin((Math.PI * (endAngle - 90)) / 180)

    const largeArc = angle > 180 ? 1 : 0
    const pathData =
      angle === 360
        ? `M 100 25 A 75 75 0 1 1 99.99 25 Z`
        : `M 100 100 L ${x1} ${y1} A 75 75 0 ${largeArc} 1 ${x2} ${y2} Z`

    return {
      pathData,
      color: GOOGLE_FORMS_PALETTE[i % GOOGLE_FORMS_PALETTE.length],
      label: r.answerText,
      count: r.count,
      percentage: r.percentage,
      isCorrect: r.isCorrect,
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
          <span className="text-[11px] font-medium text-gray-500">responses</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 min-w-[240px] flex-1 w-full">
        {responses.map((r, i) => {
          const isCorrect = r.isCorrect === true
          return (
            <div
              key={r.answerText}
              className={`flex items-center justify-between p-2.5 rounded-lg text-xs gap-3 ${
                isCorrect ? "bg-emerald-50/80 border border-emerald-200" : "bg-gray-50 border border-gray-100"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: GOOGLE_FORMS_PALETTE[i % GOOGLE_FORMS_PALETTE.length] }}
                />
                <span className="font-medium text-gray-800 truncate" title={r.answerText}>
                  {r.answerText}
                </span>
                {isCorrect && (
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded flex-shrink-0 flex items-center gap-0.5">
                    <Check size={10} /> Correct answer
                  </span>
                )}
              </div>
              <span className="font-semibold text-gray-900 flex-shrink-0">
                {r.count} <span className="text-gray-500 font-normal">({r.percentage}%)</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function QuestionHorizontalBarChart({ responses }: { responses: ResponseDistributionItem[] }) {
  return (
    <div className="space-y-3 py-2">
      {responses.map((r, i) => {
        const isCorrect = r.isCorrect === true
        return (
          <div key={r.answerText} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-gray-800 flex items-center gap-1.5">
                {r.answerText}
                {isCorrect && (
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <Check size={10} /> Correct answer
                  </span>
                )}
              </span>
              <span className="font-semibold text-gray-900">
                {r.count} responses ({r.percentage}%)
              </span>
            </div>
            <div className="w-full bg-gray-100 h-4 rounded-md overflow-hidden flex">
              <div
                className="h-full rounded-md transition-all duration-300"
                style={{
                  width: `${Math.max(r.percentage, r.count > 0 ? 3 : 0)}%`,
                  backgroundColor: isCorrect ? "#10b981" : GOOGLE_FORMS_PALETTE[i % GOOGLE_FORMS_PALETTE.length],
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function QuestionCard({ q, index, totalQuestions }: { q: QuestionBreakdown; index: number; totalQuestions: number }) {
  const [view, setView] = useState<"pie" | "bar" | "list">("pie")
  const responses: ResponseDistributionItem[] =
    q.responseDistribution ||
    q.optionDistribution?.map((o) => ({ answerText: o.option, count: o.count, percentage: o.percentage, isCorrect: false })) ||
    []

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-7 space-y-5">
      {/* Question Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-gray-100 pb-4">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-500">
              Question {index + 1} of {totalQuestions}
            </span>
            <span className="text-gray-300">•</span>
            <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
              {q.type.replace("_", " ").toLowerCase()}
            </span>
            <span className="text-gray-300">•</span>
            <span className="text-xs text-gray-500">
              {q.marks} {q.marks === 1 ? "mark" : "marks"}
            </span>
          </div>

          <h3 className="text-base font-semibold text-gray-900 leading-normal">{q.questionText}</h3>

          {q.correctAnswer && (
            <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200/60 rounded-md px-2.5 py-1 inline-flex items-center gap-1.5 mt-1">
              <CheckCircle2 size={14} className="text-emerald-600" />
              Correct answer: <span className="font-semibold">{q.correctAnswer}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-gray-500 font-medium">
            {q.totalAnswers} {q.totalAnswers === 1 ? "response" : "responses"}
          </span>

          {/* View mode toggle */}
          <div className="flex items-center gap-0.5 bg-gray-100 p-1 rounded-lg border border-gray-200">
            <button
              onClick={() => setView("pie")}
              className={`p-1.5 rounded transition-colors ${view === "pie" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              title="Pie chart view"
            >
              <PieChart size={14} />
            </button>
            <button
              onClick={() => setView("bar")}
              className={`p-1.5 rounded transition-colors ${view === "bar" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              title="Bar chart view"
            >
              <BarChart2 size={14} />
            </button>
            <button
              onClick={() => setView("list")}
              className={`p-1.5 rounded transition-colors ${view === "list" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              title="List view"
            >
              <ListFilter size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Correctness summary bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span className="text-gray-500 font-medium">Accuracy rate</span>
          <span className="font-semibold text-gray-900">
            {q.correctPercentage}% correct ({q.correctCount} / {q.totalAnswers})
          </span>
        </div>
        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden flex">
          <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${q.correctPercentage}%` }} />
        </div>
      </div>

      {/* Answer distributions */}
      {view === "pie" && <QuestionDonutChart responses={responses} />}
      {view === "bar" && <QuestionHorizontalBarChart responses={responses} />}
      {view === "list" && (
        <div className="space-y-2 pt-1">
          {responses.map((r, i) => {
            const isCorrect = r.isCorrect === true
            return (
              <div
                key={r.answerText}
                className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                  isCorrect ? "bg-emerald-50/80 border-emerald-200 text-emerald-950 font-medium" : "bg-gray-50/70 border-gray-200 text-gray-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GOOGLE_FORMS_PALETTE[i % GOOGLE_FORMS_PALETTE.length] }} />
                  <span>{r.answerText}</span>
                  {isCorrect && <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100 px-1.5 py-0.5 rounded">✓ Correct</span>}
                </div>
                <span className="font-semibold">{r.count} responses ({r.percentage}%)</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function QuizAnalyticsPage() {
  const params = useParams<{ projectId: string; quizId: string }>()
  const router = useRouter()
  const [analytics, setAnalytics] = useState<QuizAnalytics | null>(null)
  const [projectName, setProjectName] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const [data, proj] = await Promise.all([
          getQuizAnalytics(params.projectId, params.quizId),
          getProjectById(params.projectId).catch(() => null),
        ])
        setAnalytics(data)
        if (proj) setProjectName((proj as any).name || "")
      } catch (err: any) {
        console.error("Failed to load quiz analytics", err)
        setError(err.message || "Failed to load quiz analytics")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.projectId, params.quizId])

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push(`/project/${params.projectId}`)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700 hover:text-black bg-white border border-gray-200 px-3.5 py-2 rounded-lg transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Project
          </button>

          <span className="text-xs text-gray-500 font-medium">
            {projectName && `${projectName} / `}Quiz Responses
          </span>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-16 flex flex-col items-center justify-center gap-3 text-gray-500">
            <div className="w-8 h-8 border-3 border-gray-900 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium">Loading quiz analytics...</p>
          </div>
        ) : error ? (
          <div className="bg-white border border-red-200 rounded-xl p-8 text-center text-red-700 space-y-1">
            <h3 className="text-base font-semibold">Access Denied or Error</h3>
            <p className="text-xs text-red-600">{error}</p>
          </div>
        ) : analytics ? (
          <div className="space-y-6">
            {/* Header Card inspired by Google Forms */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quiz Analytics
                    </span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                      analytics.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      analytics.status === 'CLOSED' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {analytics.status}
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{analytics.title}</h1>
                  {analytics.description && (
                    <p className="text-sm text-gray-600 leading-relaxed pt-1">{analytics.description}</p>
                  )}
                </div>
              </div>

              {/* Minimalist Summary Stat Cards (Pass Rate Removed) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                <div className="bg-gray-50/70 p-4 rounded-lg border border-gray-150">
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-medium mb-1">
                    <Users size={14} className="text-gray-600" /> Total Responses
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{analytics.totalSubmissions}</div>
                </div>

                <div className="bg-gray-50/70 p-4 rounded-lg border border-gray-150">
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-medium mb-1">
                    <Award size={14} className="text-gray-600" /> Average Score
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {analytics.averagePercentage}% <span className="text-xs text-gray-500 font-normal">({analytics.averageScore} / {analytics.maxPossibleScore} pts)</span>
                  </div>
                </div>

                <div className="bg-gray-50/70 p-4 rounded-lg border border-gray-150">
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-medium mb-1">
                    <HelpCircle size={14} className="text-gray-600" /> Questions
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{analytics.totalQuestions}</div>
                </div>
              </div>
            </div>

            {/* Individual Question Response Cards */}
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-gray-900 px-1">Questions Breakdown</h2>
              {analytics.questionBreakdown.map((q, index) => (
                <QuestionCard key={q.id} q={q} index={index} totalQuestions={analytics.questionBreakdown.length} />
              ))}
            </div>
          </div>
        ) : null}
      </main>

    </div>
  )
}
