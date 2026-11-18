"use client"

import { useState, useEffect } from "react"
import { getQuizLeaderboard } from "@/lib/api/quizzes"
import { LeaderboardEntry } from "@/types/quiz"
import { useSocket } from "@/context/SocketContext"
import { Trophy, Medal, Award, Clock, Users, X, RefreshCw, TrendingUp } from "lucide-react"
import { StudentPerformanceModal } from "./StudentPerformanceModal"

interface Props {
  projectId: string
  quizId: string
  quizTitle?: string
  onClose: () => void
}

export function QuizLeaderboardModal({ projectId, quizId, quizTitle, onClose }: Props) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [maxPossibleScore, setMaxPossibleScore] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<{ userId: string; username: string } | null>(null)
  const { socket } = useSocket()

  const fetchLeaderboard = async () => {
    try {
      setLoading(true)
      const data = await getQuizLeaderboard(projectId, quizId)
      setLeaderboard(data.leaderboard || [])
      setMaxPossibleScore(data.maxPossibleScore || 0)
      setError(null)
    } catch (err: any) {
      setError(err.message || "Failed to load leaderboard")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeaderboard()
  }, [projectId, quizId])

  // Real-time leaderboard updates on new submissions
  useEffect(() => {
    if (!socket) return

    const handleSubmission = (data: { quizId: string }) => {
      if (data.quizId === quizId) {
        fetchLeaderboard()
      }
    }

    socket.on("submission_recorded", handleSubmission)
    return () => {
      socket.off("submission_recorded", handleSubmission)
    }
  }, [socket, quizId])

  const topThree = leaderboard.slice(0, 3)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-200 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shadow-xs">
              <Trophy size={22} className="text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">Quiz Leaderboard</h2>
                <span className="text-[11px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                  Live
                </span>
              </div>
              <p className="text-xs text-gray-500 truncate max-w-sm">
                {quizTitle || "Quiz Standings"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLeaderboard}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
              <div className="w-8 h-8 border-3 border-[#a17038] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium">Loading rankings...</span>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-sm text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
              <p className="font-semibold text-gray-700">{error}</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300 flex flex-col items-center gap-2">
              <Users size={32} className="text-gray-300" />
              <p className="font-medium">No submissions recorded yet.</p>
              <p className="text-xs text-gray-400">Be the first to complete this quiz!</p>
            </div>
          ) : (
            <>
              {/* Podium: Top 3 */}
              {topThree.length > 0 && (
                <div className="grid grid-cols-3 gap-3 pt-2 pb-1">
                  {/* Rank 2 */}
                  <div className="flex flex-col items-center justify-end order-1">
                    {topThree[1] ? (
                      <div className="w-full bg-gradient-to-b from-slate-50 to-slate-100/80 border border-slate-200 rounded-xl p-3 text-center flex flex-col items-center shadow-xs">
                        <div className="w-7 h-7 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center text-xs font-black shadow-xs mb-1">
                          2
                        </div>
                        <span className="text-xs font-bold text-gray-800 truncate max-w-[90px]">
                          {topThree[1].username}
                        </span>
                        <span className="text-sm font-black text-slate-700 mt-1">
                          {topThree[1].totalScore} pts
                        </span>
                        <span className="text-[10px] text-gray-400">{topThree[1].percentage}%</span>
                      </div>
                    ) : (
                      <div className="w-full h-20 bg-gray-50 rounded-xl border border-dashed border-gray-200" />
                    )}
                  </div>

                  {/* Rank 1 */}
                  <div className="flex flex-col items-center justify-end order-2">
                    {topThree[0] && (
                      <div className="w-full bg-gradient-to-b from-amber-50 to-amber-100/90 border-2 border-amber-300 rounded-xl p-4 text-center flex flex-col items-center shadow-md relative -translate-y-1">
                        <div className="absolute -top-3 w-8 h-8 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center text-sm font-black shadow-sm border border-amber-300">
                          👑
                        </div>
                        <span className="text-xs font-bold text-gray-900 truncate max-w-[100px] mt-2">
                          {topThree[0].username}
                        </span>
                        <span className="text-base font-black text-amber-900 mt-1">
                          {topThree[0].totalScore} pts
                        </span>
                        <span className="text-[10px] font-semibold text-amber-700">{topThree[0].percentage}%</span>
                      </div>
                    )}
                  </div>

                  {/* Rank 3 */}
                  <div className="flex flex-col items-center justify-end order-3">
                    {topThree[2] ? (
                      <div className="w-full bg-gradient-to-b from-orange-50 to-orange-100/80 border border-orange-200 rounded-xl p-3 text-center flex flex-col items-center shadow-xs">
                        <div className="w-7 h-7 rounded-full bg-orange-300 text-orange-900 flex items-center justify-center text-xs font-black shadow-xs mb-1">
                          3
                        </div>
                        <span className="text-xs font-bold text-gray-800 truncate max-w-[90px]">
                          {topThree[2].username}
                        </span>
                        <span className="text-sm font-black text-orange-800 mt-1">
                          {topThree[2].totalScore} pts
                        </span>
                        <span className="text-[10px] text-gray-400">{topThree[2].percentage}%</span>
                      </div>
                    ) : (
                      <div className="w-full h-20 bg-gray-50 rounded-xl border border-dashed border-gray-200" />
                    )}
                  </div>
                </div>
              )}

              {/* Full Standings Table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100/70 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">Rank</th>
                      <th className="py-2.5 px-3">Student</th>
                      <th className="py-2.5 px-3 text-center">Score</th>
                      <th className="py-2.5 px-3 text-center">Accuracy</th>
                      <th className="py-2.5 px-3 text-right">Submitted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {leaderboard.map((entry) => (
                      <tr key={entry.userId} className="hover:bg-amber-50/40 transition-colors">
                        <td className="py-2.5 px-3 text-center font-bold">
                          {entry.rank === 1 ? (
                            <span className="inline-block w-5 h-5 rounded-full bg-amber-400 text-amber-950 text-[11px] leading-5 font-black">
                              1
                            </span>
                          ) : entry.rank === 2 ? (
                            <span className="inline-block w-5 h-5 rounded-full bg-slate-300 text-slate-800 text-[11px] leading-5 font-black">
                              2
                            </span>
                          ) : entry.rank === 3 ? (
                            <span className="inline-block w-5 h-5 rounded-full bg-orange-300 text-orange-900 text-[11px] leading-5 font-black">
                              3
                            </span>
                          ) : (
                            <span className="text-gray-500 font-medium">{entry.rank}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-gray-900">
                          <div className="flex items-center gap-2">
                            <span>{entry.username}</span>
                            {entry.email && (
                              <button
                                type="button"
                                onClick={() => setSelectedStudent({ userId: entry.userId, username: entry.username })}
                                className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-200 transition-colors flex items-center gap-0.5"
                                title="View student trajectory"
                              >
                                <TrendingUp size={10} /> Stats
                              </button>
                            )}
                          </div>
                          {entry.email && (
                            <span className="block text-[10px] text-gray-400 font-normal truncate max-w-xs">
                              {entry.email}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-gray-800">
                          {entry.totalScore}{" "}
                          <span className="text-[10px] text-gray-400 font-normal">
                            / {maxPossibleScore}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${Math.min(100, entry.percentage)}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-bold text-gray-700">
                              {entry.percentage}%
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right text-[11px] text-gray-500">
                          {new Date(entry.submittedAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50/70 flex justify-between items-center text-xs text-gray-500 flex-shrink-0">
          <span>Ties broken by earliest submission time</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg font-semibold text-gray-700 transition-colors"
          >
            Close
          </button>
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

