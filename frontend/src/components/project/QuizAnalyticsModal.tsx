"use client"

import { useState, useEffect } from "react"
import { getQuizAnalytics } from "@/lib/api/quizzes"
import type { QuizAnalytics, QuestionBreakdown, ResponseDistributionItem } from "@/types/quiz"
import { X, PieChart, BarChart2, ListFilter, CheckCircle2, Users, HelpCircle, Award, Check } from "lucide-react"

interface Props {
  projectId: string
  quizId: string
  quizTitle?: string
  onClose: () => void
}

const PALETTE = ["#4f46e5", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899"]

function QuestionDonutChart({ responses }: { responses: ResponseDistributionItem[] }) {
  const total = responses.reduce((sum, r) => sum + r.count, 0)
  if (total === 0) {
    return (
      <div className="py-6 text-center text-xs text-gray-400 italic">
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
      color: PALETTE[i % PALETTE.length],
      label: r.answerText,
      count: r.count,
      percentage: r.percentage,
      isCorrect: r.isCorrect,
    }
  })

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-4">
      <div className="relative w-44 h-44 flex-shrink-0">
        <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90 drop-shadow-sm">
          {slices.map((slice, idx) => (
            <path
              key={idx}
              d={slice.pathData}
              fill={slice.color}
              className="transition-all duration-200 hover:opacity-85 cursor-pointer"
            >
              <title>{`${slice.label}: ${slice.count} responses (${slice.percentage}%)`}</title>
            </path>
          ))}
          <circle cx="100" cy="100" r="42" fill="#ffffff" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-xl font-extrabold text-gray-900">{total}</span>
          <span className="text-[10px] text-gray-500 uppercase font-semibold">Responses</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-2 min-w-[200px] flex-1">
        {responses.map((r, i) => {
          const isCorrect = r.isCorrect === true
          return (
            <div
              key={r.answerText}
              className={`flex items-center justify-between p-2 rounded-lg text-xs gap-3 transition-colors ${
                isCorrect ? "bg-emerald-50/80 border border-emerald-200" : "bg-gray-50 border border-gray-100"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                />
                <span className="font-semibold text-gray-800 truncate" title={r.answerText}>
                  {r.answerText}
                </span>
                {isCorrect && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded flex-shrink-0 flex items-center gap-0.5">
                    <Check size={10} /> Correct
                  </span>
                )}
              </div>
              <span className="font-bold text-gray-900 flex-shrink-0">
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
  const maxCount = Math.max(...responses.map((r) => r.count), 1)

  return (
    <div className="space-y-3 py-3">
      {responses.map((r, i) => {
        const isCorrect = r.isCorrect === true
        return (
          <div key={r.answerText} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-800 flex items-center gap-1.5">
                {r.answerText}
                {isCorrect && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <Check size={10} /> Correct
                  </span>
                )}
              </span>
              <span className="font-bold text-gray-900">
                {r.count} responses ({r.percentage}%)
              </span>
            </div>
            <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden flex">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max(r.percentage, r.count > 0 ? 4 : 0)}%`,
                  backgroundColor: isCorrect ? "#10b981" : PALETTE[i % PALETTE.length],
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function QuestionCard({ q, index }: { q: QuestionBreakdown; index: number }) {
  const [view, setView] = useState<"pie" | "bar" | "list">("pie")
  const responses = q.responseDistribution || q.optionDistribution?.map(o => ({ answerText: o.option, count: o.count, percentage: o.percentage })) || []

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-gray-100 pb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
              Question {index + 1}
            </span>
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              {q.type.replace("_", " ")}
            </span>
            <span className="text-xs font-medium text-gray-500">
              {q.marks} {q.marks === 1 ? "mark" : "marks"}
            </span>
          </div>
          <h3 className="text-base font-bold text-gray-900 leading-snug">{q.questionText}</h3>
          {q.correctAnswer && (
            <div className="mt-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 rounded-md px-2.5 py-1 inline-flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-600" />
              Correct Answer: <span className="font-bold">{q.correctAnswer}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
            {q.totalAnswers} responses
          </span>
          {/* Per question chart view switcher */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200">
            <button
              onClick={() => setView("pie")}
              className={`p-1.5 rounded transition-all ${view === "pie" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
              title="Donut Chart View"
            >
              <PieChart size={14} />
            </button>
            <button
              onClick={() => setView("bar")}
              className={`p-1.5 rounded transition-all ${view === "bar" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
              title="Horizontal Bar View"
            >
              <BarChart2 size={14} />
            </button>
            <button
              onClick={() => setView("list")}
              className={`p-1.5 rounded transition-all ${view === "list" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
              title="Response List View"
            >
              <ListFilter size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Accuracy Summary Bar */}
      <div className="flex items-center justify-between text-xs text-gray-600 pt-1">
        <span className="font-semibold text-gray-700">Correctness Rate:</span>
        <span className="font-extrabold text-emerald-700">{q.correctPercentage}% correct ({q.correctCount} / {q.totalAnswers})</span>
      </div>
      <div className="w-full bg-red-100 h-2.5 rounded-full overflow-hidden flex">
        <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${q.correctPercentage}%` }} />
      </div>

      {/* Answer Distribution Display */}
      {view === "pie" && <QuestionDonutChart responses={responses} />}
      {view === "bar" && <QuestionHorizontalBarChart responses={responses} />}
      {view === "list" && (
        <div className="space-y-2 pt-2">
          {responses.map((r, i) => {
            const isCorrect = r.isCorrect === true
            return (
              <div
                key={r.answerText}
                className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                  isCorrect ? "bg-emerald-50 border-emerald-200 text-emerald-900 font-semibold" : "bg-gray-50 border-gray-200 text-gray-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                  <span>{r.answerText}</span>
                  {isCorrect && <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">✓ Correct</span>}
                </div>
                <span className="font-bold">{r.count} responses ({r.percentage}%)</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function QuizAnalyticsModal({ projectId, quizId, quizTitle, onClose }: Props) {
  const [analytics, setAnalytics] = useState<QuizAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getQuizAnalytics(projectId, quizId)
      .then((data) => {
        setAnalytics(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error("Failed to load analytics", err)
        setError(err.message || "Failed to load analytics")
        setLoading(false)
      })
  }, [projectId, quizId])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-50 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-200">
        {/* Top Google Forms Style Header Card */}
        <div className="bg-white border-b border-gray-200 p-6 relative">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-500 rounded-t-2xl" />
          
          <div className="flex items-start justify-between gap-4 pt-1">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                  Question Responses Analytics
                </span>
                {analytics?.status && (
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${analytics.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
                    {analytics.status}
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-black text-gray-900 mt-2">{analytics?.title || quizTitle || "Quiz Analytics"}</h2>
              {analytics?.description && (
                <p className="text-xs text-gray-600 mt-1">{analytics.description}</p>
              )}
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
                <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Users size={18} />
                </div>
                <div>
                  <span className="text-xl font-black text-gray-900">{analytics.totalSubmissions}</span>
                  <span className="text-xs text-gray-500 block leading-none">Total Responses</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Award size={18} />
                </div>
                <div>
                  <span className="text-xl font-black text-gray-900">{analytics.averagePercentage}%</span>
                  <span className="text-xs text-gray-500 block leading-none">Average Score ({analytics.averageScore}/{analytics.maxPossibleScore})</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <HelpCircle size={18} />
                </div>
                <div>
                  <span className="text-xl font-black text-gray-900">{analytics.totalQuestions}</span>
                  <span className="text-xs text-gray-500 block leading-none">Total Questions</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Question by Question Scrollable Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500">
              <div className="w-9 h-9 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-semibold">Loading question response analytics...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-600 bg-red-50 rounded-xl border border-red-200">
              <p className="font-semibold text-sm">{error}</p>
            </div>
          ) : analytics && analytics.questionBreakdown ? (
            <div className="space-y-6">
              {analytics.questionBreakdown.map((q, index) => (
                <QuestionCard key={q.id} q={q} index={index} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">No question response data available.</div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-end bg-white">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-colors"
          >
            Close Analytics
          </button>
        </div>
      </div>
    </div>
  )
}
