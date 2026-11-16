"use client"

import { useState, useEffect } from "react"
import { getStudentPerformanceTracker } from "@/lib/api/quizzes"
import { StudentQuizPerformance } from "@/types/quiz"
import { LineChart, TrendingUp, Award, Calendar, X, BarChart2, BookOpen, Clock } from "lucide-react"

interface Props {
  projectId: string
  userId?: string
  studentName?: string
  onClose: () => void
}

export function StudentPerformanceModal({ projectId, userId, studentName, onClose }: Props) {
  const [data, setData] = useState<StudentQuizPerformance | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    const validUserId = userId && userId !== "undefined" && userId !== "null" ? userId : undefined
    getStudentPerformanceTracker(projectId, validUserId)
      .then((res: any) => {
        setData(res)
        setError(null)
      })
      .catch((err) => {
        setError(err.message || "Failed to load performance data")
      })
      .finally(() => {
        setLoading(false)
      })
  }, [projectId, userId])

  const quizzes = data?.quizzes || []

  // SVG Line Chart coordinates calculation
  const chartWidth = 520
  const chartHeight = 160
  const padding = 35

  const points = quizzes.map((q, i) => {
    const x =
      quizzes.length === 1
        ? chartWidth / 2
        : padding + (i / Math.max(quizzes.length - 1, 1)) * (chartWidth - padding * 2)
    const y = chartHeight - padding - (q.percentage / 100) * (chartHeight - padding * 2)
    return { x, y, percentage: q.percentage, title: q.quizTitle }
  })

  const pathD =
    points.length > 1
      ? points.reduce((acc, p, i) => `${acc} ${i === 0 ? "M" : "L"} ${p.x} ${p.y}`, "")
      : ""

  const areaD =
    points.length > 1
      ? `${pathD} L ${points[points.length - 1].x} ${chartHeight - padding} L ${points[0].x} ${chartHeight - padding} Z`
      : ""

  const totalTaken = data?.totalQuizzesTaken || 0
  const totalInProject = data?.totalQuizzesInProject

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-200 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-transparent flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-700 flex items-center justify-center shadow-xs">
              <TrendingUp size={22} className="text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">Student Performance Tracker</h2>
                <span className="text-[11px] font-semibold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                  Analytics
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {studentName || data?.username || "Individual Progress & Trajectory"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium">Computing performance trajectory...</span>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-sm text-gray-600 bg-gray-50 rounded-xl border border-gray-200">
              {error}
            </div>
          ) : (
            <>
              {/* Stat Cards - Always Visible */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 mb-1">
                    Quizzes Completed
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-indigo-950">{totalTaken}</span>
                    {totalInProject !== undefined && totalInProject > 0 && (
                      <span className="text-xs font-medium text-indigo-700/70">
                        / {totalInProject}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-indigo-600/80 mt-0.5">
                    {totalInProject !== undefined && totalInProject > 0
                      ? `${Math.round((totalTaken / totalInProject) * 100)}% project completion`
                      : totalTaken === 0
                      ? "No quizzes attempted yet"
                      : "quizzes completed"}
                  </span>
                </div>

                <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 mb-1">
                    Average Score
                  </span>
                  <span className="text-3xl font-black text-emerald-950">
                    {totalTaken > 0 ? `${data?.averageScorePercentage || 0}%` : "—"}
                  </span>
                  <span className="text-[10px] text-emerald-600/80 mt-0.5">
                    {totalTaken > 0 ? "Overall accuracy rate" : "Awaiting first submission"}
                  </span>
                </div>

                <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 mb-1">
                    Highest Achieved
                  </span>
                  <span className="text-3xl font-black text-amber-950">
                    {totalTaken > 0 ? `${data?.highestScorePercentage || 0}%` : "—"}
                  </span>
                  <span className="text-[10px] text-amber-700/80 mt-0.5">
                    {totalTaken > 0 ? "Personal best score" : "Awaiting first submission"}
                  </span>
                </div>
              </div>

              {/* Progress Trajectory Graph Card */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                    <BarChart2 size={14} className="text-indigo-600" />
                    Score Trajectory Over Time
                  </span>
                  <span className="text-[11px] text-gray-400 font-medium">
                    {quizzes.length === 0
                      ? "No data yet"
                      : quizzes.length === 1
                      ? "1 quiz recorded"
                      : `${quizzes.length} quizzes chronologically`}
                  </span>
                </div>

                {quizzes.length > 1 ? (
                  <div className="w-full overflow-x-auto flex justify-center">
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full max-w-lg h-40">
                      {/* Grid lines */}
                      {[0, 25, 50, 75, 100].map((pct) => {
                        const y = chartHeight - padding - (pct / 100) * (chartHeight - padding * 2)
                        return (
                          <g key={pct}>
                            <line
                              x1={padding}
                              y1={y}
                              x2={chartWidth - padding}
                              y2={y}
                              stroke="#f1f5f9"
                              strokeWidth="1"
                            />
                            <text
                              x={padding - 6}
                              y={y + 3}
                              fontSize="9"
                              textAnchor="end"
                              fill="#94a3b8"
                              fontWeight="500"
                            >
                              {pct}%
                            </text>
                          </g>
                        )
                      })}

                      {/* Area gradient */}
                      <defs>
                        <linearGradient id="performanceAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {areaD && <path d={areaD} fill="url(#performanceAreaGrad)" />}
                      {pathD && <path d={pathD} fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" />}

                      {/* Data dots */}
                      {points.map((pt, i) => (
                        <g key={i}>
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r="4"
                            fill="#ffffff"
                            stroke="#4f46e5"
                            strokeWidth="2.5"
                          />
                          <title>{`${pt.title}: ${pt.percentage}%`}</title>
                        </g>
                      ))}
                    </svg>
                  </div>
                ) : quizzes.length === 1 ? (
                  <div className="flex flex-col items-center justify-center py-4">
                    <svg viewBox={`0 0 ${chartWidth} 100`} className="w-full max-w-lg h-24">
                      {[0, 50, 100].map((pct) => {
                        const y = 80 - (pct / 100) * 60
                        return (
                          <g key={pct}>
                            <line x1={padding} y1={y} x2={chartWidth - padding} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                            <text x={padding - 6} y={y + 3} fontSize="9" textAnchor="end" fill="#94a3b8">
                              {pct}%
                            </text>
                          </g>
                        )
                      })}
                      {/* Single Point */}
                      <circle
                        cx={chartWidth / 2}
                        cy={80 - (quizzes[0].percentage / 100) * 60}
                        r="6"
                        fill="#4f46e5"
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                    </svg>
                    <p className="text-xs text-gray-600 font-medium text-center mt-1">
                      1 attempt recorded: <strong className="text-gray-900">{quizzes[0].quizTitle}</strong> ({quizzes[0].percentage}%)
                    </p>
                    <p className="text-[11px] text-gray-400 text-center">
                      Complete at least one more quiz to plot your score trajectory curve over time.
                    </p>
                  </div>
                ) : (
                  // Zero quizzes attempted - Empty Chart State
                  <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-gray-50/60 rounded-lg border border-dashed border-gray-200">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 mb-2.5 shadow-2xs">
                      <LineChart size={24} />
                    </div>
                    <h4 className="text-xs font-bold text-gray-800">Trajectory Line Chart Waiting For Data</h4>
                    <p className="text-[11px] text-gray-400 max-w-sm mt-1">
                      Your score progress and ranking trends will be automatically graphed here chronologically once you take and submit quizzes in this project.
                    </p>
                  </div>
                )}
              </div>

              {/* History Table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100/70 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Quiz</th>
                      <th className="py-2.5 px-3 text-center">Score</th>
                      <th className="py-2.5 px-3 text-center">Percentage</th>
                      <th className="py-2.5 px-3 text-center">Rank</th>
                      <th className="py-2.5 px-3 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {quizzes.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center bg-gray-50/40">
                          <div className="flex flex-col items-center justify-center gap-1.5 text-gray-500">
                            <BookOpen size={20} className="text-gray-300" />
                            <span className="font-semibold text-gray-700 text-xs">
                              No quiz attempts recorded yet
                            </span>
                            <span className="text-[11px] text-gray-400 max-w-sm">
                              Take any published quiz in this project to track your score history and performance breakdown.
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      quizzes.map((q) => (
                        <tr key={q.quizId} className="hover:bg-indigo-50/30 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-gray-900 truncate max-w-xs">
                            {q.quizTitle}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-gray-800">
                            {q.score}{" "}
                            <span className="text-[10px] text-gray-400 font-normal">
                              / {q.totalMarks}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${
                                q.percentage >= 80
                                  ? "bg-emerald-100 text-emerald-800"
                                  : q.percentage >= 50
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {q.percentage}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded text-[11px]">
                              #{q.rank} / {q.totalParticipants}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-[11px] text-gray-500">
                            {new Date(q.submittedAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50/70 flex justify-end items-center flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg font-semibold text-gray-700 text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
