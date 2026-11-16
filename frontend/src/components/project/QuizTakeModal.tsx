import { useState, useEffect, useCallback, useRef } from "react"
import type { Quiz, QuizQuestion } from "@/types/quiz"
import { submitQuiz, getQuizById, getMySubmission } from "@/lib/api/quizzes"
import { useSocket } from "@/context/SocketContext"
import {
  CheckCircle2,
  Award,
  Clock,
  RefreshCw,
  Lock,
  Sparkles,
  Users,
  Trophy,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  CheckSquare,
  Square,
  MinusCircle,
  Info,
  Scale,
} from "lucide-react"
import { QuizLeaderboardModal } from "./QuizLeaderboardModal"
import { StudentPerformanceModal } from "./StudentPerformanceModal"
import { MarkingSchemeGuideModal } from "./MarkingSchemeGuideModal"

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
const getAlphabetLabel = (index: number) => ALPHABET[index] || ""

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
  const [isOutdated, setIsOutdated] = useState(false)
  const [pastSubmission, setPastSubmission] = useState<any>(null)
  const [showPastScore, setShowPastScore] = useState(false)
  const [newQuestionNotice, setNewQuestionNotice] = useState<string | null>(null)
  const prevQuestionCountRef = useRef<number>(0)
  const [isClosedQuiz, setIsClosedQuiz] = useState(initialQuiz.status === "CLOSED")
  const [closedTotalMarks, setClosedTotalMarks] = useState<number>(initialQuiz.totalMarks || 0)
  const [activeStudents, setActiveStudents] = useState<number>(1)
  const [leaderboardOpen, setLeaderboardOpen] = useState(false)
  const [performanceOpen, setPerformanceOpen] = useState(false)
  const [markingGuideOpen, setMarkingGuideOpen] = useState(false)
  const [shouldRevealAnswers, setShouldRevealAnswers] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(initialQuiz.showLeaderboard ?? true)

  const [questionStates, setQuestionStates] = useState<
    Record<
      string,
      {
        status: "UNCHANGED" | "MODIFIED" | "NEW"
        previousAnswer: string | null
        score: number | null
        isCorrect: boolean | null
      }
    >
  >({})

  const { socket, joinProject } = useSocket()

  const refreshQuizData = useCallback(async (showNotice = false) => {
    try {
      const [quizData, subStatus] = await Promise.all([
        getQuizById(projectId, initialQuiz.id),
        getMySubmission(projectId, initialQuiz.id).catch(() => ({
          submitted: false,
          isOutdated: false,
          isClosed: false,
          isOwner: false,
          totalMarks: 0,
          submission: null,
          questionStates: {},
          shouldRevealAnswers: false,
          showLeaderboard: true,
          quiz: null,
        })),
      ])

      const isOwnerUser = subStatus?.isOwner === true
      const isClosedNow = !isOwnerUser && (quizData?.status === "CLOSED" || subStatus?.isClosed === true)
      setIsClosedQuiz(isClosedNow)
      if (quizData?.totalMarks !== undefined) {
        setClosedTotalMarks(quizData.totalMarks)
      } else if (subStatus?.totalMarks !== undefined) {
        setClosedTotalMarks(subStatus.totalMarks)
      }

      if (subStatus?.shouldRevealAnswers !== undefined) {
        setShouldRevealAnswers(!!subStatus.shouldRevealAnswers)
      }
      if (subStatus?.showLeaderboard !== undefined) {
        setShowLeaderboard(!!subStatus.showLeaderboard)
      } else if (quizData?.showLeaderboard !== undefined) {
        setShowLeaderboard(!!quizData.showLeaderboard)
      }

      const activeQuizData = subStatus?.quiz || quizData

      if (activeQuizData?.questions) {
        const newCount = activeQuizData.questions.length
        if (showNotice && prevQuestionCountRef.current > 0 && newCount > prevQuestionCountRef.current) {
          const diff = newCount - prevQuestionCountRef.current
          setNewQuestionNotice(`A new question has been published (${diff} new question${diff > 1 ? "s" : ""} added)!`)
        }
        prevQuestionCountRef.current = newCount
      }

      setQuiz(activeQuizData)

      if (subStatus.questionStates) {
        setQuestionStates(subStatus.questionStates as any)
        setAnswers((prevAnswers) => {
          const merged = { ...prevAnswers }
          for (const [qId, st] of Object.entries(subStatus.questionStates as any)) {
            const state = st as any
            if (state.previousAnswer !== null && state.previousAnswer !== undefined) {
              if (state.status === "UNCHANGED") {
                merged[qId] = state.previousAnswer
              } else if (merged[qId] === undefined) {
                merged[qId] = state.previousAnswer
              }
            }
          }
          return merged
        })
      }

      // Check if any question in activeQuizData is missing an answer or has an empty answer in the submission
      const sub = subStatus.submission
      const answersMap = new Map((sub?.answers || []).map((a: any) => [a.questionId, a.answerText]))
      const hasUnansweredQuestion = (activeQuizData?.questions || []).some((q: any) => {
        const ans = answersMap.get(q.id)
        return !ans || (typeof ans === "string" && ans.trim() === "")
      })

      if (isClosedNow) {
        setIsOutdated(false)
        if (subStatus.submission) {
          setSubmittedData(subStatus.submission)
        } else {
          setSubmittedData(null)
        }
      } else if (subStatus.isOutdated || (sub && hasUnansweredQuestion)) {
        setIsOutdated(true)
        setPastSubmission(subStatus.submission)
        setSubmittedData(null)
      } else if (subStatus.submitted && subStatus.submission) {
        setSubmittedData(subStatus.submission)
      }
      setLoading(false)
    } catch (err) {
      console.error("Failed to load quiz", err)
      setLoading(false)
    }
  }, [projectId, initialQuiz.id])

  useEffect(() => {
    refreshQuizData(false)
  }, [refreshQuizData])

  useEffect(() => {
    if (projectId) {
      joinProject(projectId)
    }
  }, [projectId, joinProject])

  // Live Student Presence via Socket
  useEffect(() => {
    if (!socket || !initialQuiz.id) return

    // Announce presence in quiz room
    socket.emit("join_quiz", { quizId: initialQuiz.id })

    const handlePresence = (data: { quizId: string; activeCount: number }) => {
      if (data.quizId === initialQuiz.id) {
        setActiveStudents(data.activeCount)
      }
    }

    const handleSubmission = (data: { quizId: string }) => {
      if (data.quizId === initialQuiz.id) {
        // Optional live refresh
      }
    }

    socket.on("quiz_presence_update", handlePresence)
    socket.on("submission_recorded", handleSubmission)

    return () => {
      socket.emit("leave_quiz", { quizId: initialQuiz.id })
      socket.off("quiz_presence_update", handlePresence)
      socket.off("submission_recorded", handleSubmission)
    }
  }, [socket, initialQuiz.id])

  // Sync when parent passes an updated quiz prop
  useEffect(() => {
    if (initialQuiz) {
      refreshQuizData(true)
    }
  }, [initialQuiz?.updatedAt, initialQuiz?.questions?.length, refreshQuizData])

  // Real-time synchronization via WebSockets
  useEffect(() => {
    if (!socket) return

    const handleQuizUpdated = (data: any) => {
      const targetQuizId = data?.quizId || data?.id || data?.quiz?.id
      if (!targetQuizId || targetQuizId === initialQuiz.id || (quiz && targetQuizId === quiz.id)) {
        refreshQuizData(true)
      }
    }

    socket.on("quiz_updated", handleQuizUpdated)
    socket.on("question_published", handleQuizUpdated)
    socket.on("quiz_created", handleQuizUpdated)

    return () => {
      socket.off("quiz_updated", handleQuizUpdated)
      socket.off("question_published", handleQuizUpdated)
      socket.off("quiz_created", handleQuizUpdated)
    }
  }, [socket, initialQuiz.id, quiz?.id, refreshQuizData])

  // Live polling and window focus synchronization while modal is open
  useEffect(() => {
    const handleFocus = () => {
      refreshQuizData(true)
    }
    window.addEventListener("focus", handleFocus)

    const interval = setInterval(() => {
      refreshQuizData(true)
    }, 4000)

    return () => {
      window.removeEventListener("focus", handleFocus)
      clearInterval(interval)
    }
  }, [refreshQuizData])

  useEffect(() => {
    if (newQuestionNotice) {
      const timer = setTimeout(() => setNewQuestionNotice(null), 6000)
      return () => clearTimeout(timer)
    }
  }, [newQuestionNotice])

  const handleAnswerChange = (questionId: string, value: string) => {
    if (questionStates[questionId]?.status === "UNCHANGED") return
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const handleMultipleCorrectToggle = (questionId: string, letter: string) => {
    if (questionStates[questionId]?.status === "UNCHANGED") return
    const current = (answers[questionId] || "")
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)

    let updated: string[]
    if (current.includes(letter)) {
      updated = current.filter((l) => l !== letter)
    } else {
      updated = [...current, letter].sort()
    }
    setAnswers((prev) => ({ ...prev, [questionId]: updated.join(",") }))
  }

  const handleSubmit = async () => {
    if (!quiz || isClosedQuiz) return
    setIsSubmitting(true)
    try {
      const answerPayload = Object.entries(answers).map(([questionId, answerText]) => ({
        questionId,
        answerText,
      }))
      const res = await submitQuiz(projectId, quiz.id, answerPayload)
      setSubmittedData(res)
      // Refresh to grab updated answer reveal state if immediate
      refreshQuizData(false)
    } catch (error: any) {
      console.error("Failed to submit quiz", error)
      alert(error.message || "Failed to submit quiz. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const maxScore =
    closedTotalMarks ||
    quiz?.totalMarks ||
    (quiz?.questions?.length ? quiz.questions.reduce((sum, q) => sum + (q.marks || 0), 0) : 0)

  // Show detailed submission review if answers are revealed OR if quiz is not closed yet
  const canShowDetailedReview =
    submittedData &&
    (!isClosedQuiz || shouldRevealAnswers) &&
    submittedData.answers &&
    submittedData.answers.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="flex justify-between items-center p-4 sm:p-5 border-b border-gray-200 bg-gray-50/70 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-gray-900">{quiz?.title || initialQuiz.title}</h2>
              {isClosedQuiz && (
                <span className="text-[11px] font-bold text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                  <Lock size={10} /> Closed
                </span>
              )}
              {/* Live Presence Count */}
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <Users size={11} /> {activeStudents} online
              </span>
            </div>
            {submittedData && !isClosedQuiz && (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded inline-flex items-center gap-1 mt-1 border border-emerald-200">
                <CheckCircle2 size={12} /> Previously Submitted
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Leaderboard Action Button */}
            {showLeaderboard && (
              <button
                type="button"
                onClick={() => setLeaderboardOpen(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-amber-900 bg-amber-100/80 hover:bg-amber-200/90 border border-amber-300 px-3 py-1.5 rounded-lg transition-colors shadow-xs"
                title="View Quiz Leaderboard"
              >
                <Trophy size={13} className="text-amber-600" />
                <span>Leaderboard</span>
              </button>
            )}

            {/* Performance Tracker Button */}
            <button
              type="button"
              onClick={() => setPerformanceOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-blue-900 bg-blue-100/80 hover:bg-blue-200/90 border border-blue-300 px-3 py-1.5 rounded-lg transition-colors shadow-xs"
              title="View your quiz performance trajectory"
            >
              <TrendingUp size={13} className="text-blue-600" />
              <span>My Stats</span>
            </button>

            {/* Marking Scheme Guide Button */}
            <button
              type="button"
              onClick={() => setMarkingGuideOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 px-3 py-1.5 rounded-lg transition-colors shadow-xs"
              title="View how questions and partial marking are calculated"
            >
              <Scale size={13} className="text-gray-600" />
              <span>Marking Rules</span>
            </button>

            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-200/60 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500 gap-3">
              <div className="w-8 h-8 border-3 border-[#a17038] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium">Loading quiz details...</span>
            </div>
          ) : isClosedQuiz && !canShowDetailedReview ? (
            // Quiz Closed and no detailed review allowed (MARKS_ONLY or NEVER or not yet answered)
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <div className="w-16 h-16 bg-rose-50 border border-rose-200 text-rose-600 rounded-full flex items-center justify-center shadow-sm mb-3">
                <Lock size={30} className="text-rose-500" />
              </div>

              <span className="text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-100/90 px-3 py-1 rounded-full border border-rose-200">
                Quiz Closed
              </span>

              <h3 className="text-2xl font-black text-gray-900 mt-3">This Quiz is Closed</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-md">
                The instructor has closed submissions for this quiz. Question details and answer keys are kept confidential according to the quiz policy.
              </p>

              {/* Show Total Marks Only */}
              {submittedData ? (
                <div className="mt-6 bg-gradient-to-br from-amber-50 to-orange-50/50 border-2 border-amber-300/80 rounded-2xl px-10 py-6 text-center shadow-md max-w-sm w-full">
                  <span className="text-xs font-bold text-amber-900 uppercase tracking-widest block">
                    Your Total Score
                  </span>
                  <div className="flex items-baseline justify-center gap-1.5 mt-2">
                    <span className="text-5xl font-black text-[#a17038]">
                      {submittedData.totalScore !== null && submittedData.totalScore !== undefined
                        ? submittedData.totalScore
                        : 0}
                    </span>
                    {maxScore > 0 && (
                      <span className="text-2xl font-bold text-amber-700/80">
                        / {maxScore}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-medium text-amber-800/80 mt-1 block">
                    {maxScore > 0 && submittedData.totalScore !== null
                      ? `${Math.round((submittedData.totalScore / maxScore) * 100)}% achieved`
                      : "Total Marks"}
                  </span>
                  {submittedData.submittedAt && (
                    <div className="mt-4 pt-3 border-t border-amber-200/80 text-[11px] text-gray-500 flex items-center justify-center gap-1">
                      <Clock size={12} />
                      Submitted on {new Date(submittedData.submittedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-6 bg-gray-50 border border-gray-200 rounded-2xl px-10 py-6 text-center shadow-sm max-w-sm w-full">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest block">
                    Total Marks of Quiz
                  </span>
                  <div className="mt-2 text-4xl font-black text-gray-800">
                    {maxScore} {maxScore === 1 ? "mark" : "marks"}
                  </div>
                  <div className="mt-3 text-xs text-rose-600 font-medium bg-rose-50 py-1.5 px-3 rounded-lg border border-rose-100">
                    You did not submit this quiz before it was closed.
                  </div>
                </div>
              )}

              {showLeaderboard && (
                <div className="mt-6">
                  <button
                    onClick={() => setLeaderboardOpen(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs shadow-sm transition-colors"
                  >
                    <Trophy size={14} /> Open Quiz Leaderboard
                  </button>
                </div>
              )}
            </div>
          ) : submittedData ? (
            // Quiz Submitted Review View (with optional model answers & answer reveal)
            <div className="flex flex-col items-center justify-center py-6 gap-6">
              <div className="w-20 h-20 bg-emerald-100/80 text-emerald-600 rounded-full flex items-center justify-center shadow-inner">
                <Award size={44} />
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-extrabold text-gray-900">Quiz Completed</h3>
                <p className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1">
                  <Clock size={12} />
                  Submitted on {new Date(submittedData.submittedAt || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
                {isClosedQuiz && shouldRevealAnswers && (
                  <span className="inline-block mt-2 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
                    Quiz Closed &bull; Answers and Model Solutions Revealed
                  </span>
                )}
              </div>

              {submittedData.totalScore !== null && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-8 py-4 text-center shadow-sm">
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">Your Result</span>
                  <span className="text-4xl font-extrabold text-[#a17038] block mt-1">
                    {submittedData.totalScore} {maxScore > 0 ? `/ ${maxScore}` : "marks"}
                  </span>
                  {maxScore > 0 && (
                    <span className="text-xs text-amber-700 font-medium block mt-0.5">
                      {Math.round((submittedData.totalScore / maxScore) * 100)}% accuracy
                    </span>
                  )}
                </div>
              )}

              {/* Submitted Answers Review */}
              {quiz && quiz.questions && (
                <div className="w-full text-left space-y-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-gray-900">Your Submitted Responses & Evaluation:</h4>
                    {shouldRevealAnswers ? (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        Answer Key & Model Answers Visible
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        Detailed Answer Key Hidden By Instructor
                      </span>
                    )}
                  </div>

                  {quiz.questions.map((q, idx) => {
                    const ans = submittedData.answers?.find((a: any) => a.questionId === q.id)
                    const isScorePositive = (ans?.score || 0) > 0
                    const isScoreNegative = (ans?.score || 0) < 0
                    const isPerfect = ans?.isCorrect === true || (ans?.score !== undefined && ans.score === q.marks)

                    return (
                      <div
                        key={q.id}
                        className={`p-4 rounded-xl border text-xs space-y-2.5 transition-all ${
                          isPerfect
                            ? "bg-emerald-50/40 border-emerald-200"
                            : isScoreNegative
                            ? "bg-rose-50/40 border-rose-200"
                            : "bg-gray-50/70 border-gray-200"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="font-semibold text-gray-900 text-sm">
                            {idx + 1}. {q.questionText}
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-xs text-gray-600 bg-white px-2 py-0.5 rounded border border-gray-200 font-medium">
                              {q.marks} {q.marks === 1 ? "mark" : "marks"}
                            </span>
                            {ans?.score !== undefined && ans?.score !== null && (
                              <span
                                className={`px-2 py-0.5 rounded font-bold text-xs ${
                                  isScorePositive
                                    ? "bg-emerald-100 text-emerald-800"
                                    : isScoreNegative
                                    ? "bg-rose-100 text-rose-800"
                                    : "bg-gray-200 text-gray-700"
                                }`}
                              >
                                {ans.score > 0 ? `+${ans.score}` : `${ans.score}`} pts
                              </span>
                            )}
                          </div>
                        </div>

                        {/* User submitted answer */}
                        <div className="text-gray-800">
                          <span className="font-semibold text-gray-600">Your Answer:</span>{" "}
                          <span className="font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200">
                            {ans?.answerText || "No answer provided"}
                          </span>
                        </div>

                        {/* Correct Answer (if revealed) */}
                        {shouldRevealAnswers && q.correctAnswer && (
                          <div className="text-emerald-800 bg-emerald-100/70 border border-emerald-200 px-2.5 py-1.5 rounded-lg flex items-center gap-2">
                            <CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0" />
                            <span>
                              <strong>Correct Answer:</strong> {q.correctAnswer}
                            </span>
                          </div>
                        )}

                        {/* Model Answer (for descriptive / long answer or explanation) */}
                        {shouldRevealAnswers && q.modelAnswer && (
                          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-950">
                            <div className="flex items-center gap-1 font-bold text-blue-900 text-xs mb-1">
                              <Sparkles size={13} className="text-blue-600" />
                              <span>Model Answer &amp; Explanation:</span>
                            </div>
                            <p className="whitespace-pre-wrap leading-relaxed text-blue-900 font-normal">
                              {q.modelAnswer}
                            </p>
                          </div>
                        )}

                        {/* Negative marking or partial marking disclosure */}
                        <div className="flex items-center gap-2 pt-1 text-[11px] text-gray-500 flex-wrap">
                          {q.type === "MULTIPLE_CORRECT" && (
                            <button
                              type="button"
                              onClick={() => setMarkingGuideOpen(true)}
                              className="bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 px-2 py-0.5 rounded flex items-center gap-1 transition-colors font-medium"
                              title="Click to view marking rule explanation"
                            >
                              <Scale size={11} />
                              Multiple Correct ({q.partialMarkingRule ? q.partialMarkingRule.replace(/_/g, " ").toLowerCase() : "proportional"})
                            </button>
                          )}
                          {(q.negativeMarks ?? 0) > 0 && (
                            <button
                              type="button"
                              onClick={() => setMarkingGuideOpen(true)}
                              className="text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-0.5 rounded flex items-center gap-1 transition-colors font-medium"
                              title="Click to view penalty details"
                            >
                              <MinusCircle size={10} /> Penalty rule: -{q.negativeMarks} marks on incorrect
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : quiz ? (
            // Quiz Taking View
            <>
              {isOutdated && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-medium">
                      <RefreshCw size={16} className="text-amber-700 flex-shrink-0" />
                      <span>
                        <strong>Quiz Updated:</strong> The instructor updated this quiz since your previous attempt. You can retake the updated version below.
                      </span>
                    </div>
                    {pastSubmission && (
                      <button
                        onClick={() => setShowPastScore(!showPastScore)}
                        className="text-amber-800 font-bold underline hover:text-amber-950 flex-shrink-0"
                      >
                        {showPastScore ? "Hide Previous Score" : "View Previous Score"}
                      </button>
                    )}
                  </div>
                  {showPastScore && pastSubmission && (
                    <div className="pt-2 border-t border-amber-200/70 text-amber-900 font-medium">
                      Previous attempt score: <strong>{pastSubmission.totalScore} pts</strong> (submitted on {new Date(pastSubmission.submittedAt).toLocaleDateString()})
                    </div>
                  )}
                </div>
              )}

              {newQuestionNotice && (
                <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs px-4 py-2.5 rounded-lg flex items-center justify-between shadow-sm">
                  <span className="font-semibold flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    {newQuestionNotice}
                  </span>
                  <button onClick={() => setNewQuestionNotice(null)} className="text-emerald-700 hover:text-emerald-900 font-bold ml-2">✕</button>
                </div>
              )}

              {quiz.description && (
                <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">{quiz.description}</p>
              )}

              {/* Marking Scheme Active Reminder Banner */}
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 flex items-center justify-between gap-3 text-xs text-amber-950">
                <div className="flex items-center gap-2">
                  <Scale size={15} className="text-amber-700 flex-shrink-0" />
                  <span>
                    <strong>Marking Scheme Active:</strong> Check question marks, penalties, and partial credit rules below.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMarkingGuideOpen(true)}
                  className="text-xs font-bold text-amber-900 underline hover:text-black flex-shrink-0"
                >
                  View Rules Guide
                </button>
              </div>

              <div className="flex flex-col gap-8 mt-2">
                {quiz.questions && quiz.questions.length > 0 ? (
                  quiz.questions.map((q: QuizQuestion, index: number) => {
                    const options: string[] = q.options ? JSON.parse(q.options) : []
                    const qState = questionStates[q.id]
                    const isLocked = qState?.status === "UNCHANGED"
                    const isModified = qState?.status === "MODIFIED"
                    const isNew = qState?.status === "NEW"

                    return (
                      <div
                        key={q.id}
                        className={`flex flex-col gap-3 p-4 rounded-xl border transition-all ${
                          isLocked
                            ? "bg-gray-100/70 border-gray-200"
                            : isModified
                            ? "bg-amber-50/40 border-amber-200 shadow-sm"
                            : "bg-gray-50/60 border-gray-200/80"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2 flex-1">
                            <span className="font-bold text-gray-900">{index + 1}.</span>
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 text-sm">{q.questionText}</p>
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <span className="text-xs text-gray-600 bg-white px-2 py-0.5 border border-gray-200 rounded font-medium">
                                  {q.marks} {q.marks === 1 ? "mark" : "marks"}
                                </span>
                                {q.type === "MULTIPLE_CORRECT" && (
                                  <button
                                    type="button"
                                    onClick={() => setMarkingGuideOpen(true)}
                                    className="text-[11px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-colors"
                                    title="Click to view marking rule explanation"
                                  >
                                    <Scale size={10} className="text-purple-600" />
                                    <span>
                                      {q.partialMarkingRule === "POSITIVE_ONLY"
                                        ? "Positive Partial (No penalty)"
                                        : q.partialMarkingRule === "NONE"
                                        ? "All or Nothing"
                                        : "Proportional with Penalty"}
                                    </span>
                                  </button>
                                )}
                                {(q.negativeMarks ?? 0) > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setMarkingGuideOpen(true)}
                                    className="text-[11px] font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-colors"
                                    title="Click to view penalty details"
                                  >
                                    <MinusCircle size={10} /> -{q.negativeMarks} penalty
                                  </button>
                                )}
                                {isLocked && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-200 text-gray-700">
                                    <Lock size={11} className="text-gray-500" />
                                    Answer Preserved (Locked)
                                  </span>
                                )}
                                {isModified && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                    <Sparkles size={11} className="text-amber-600" />
                                    Updated Question &mdash; Answer required
                                  </span>
                                )}
                                {isNew && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                                    <Sparkles size={11} className="text-blue-600" />
                                    New Question
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {isModified && qState?.previousAnswer && (
                          <div className="ml-6 text-xs text-amber-800 bg-amber-50 p-2 rounded border border-amber-200/60">
                            Previously submitted answer: <strong>&ldquo;{qState.previousAnswer}&rdquo;</strong> (You can update it below)
                          </div>
                        )}

                        {isLocked && (
                          <div className="ml-6 text-xs text-gray-500 italic">
                            This question was not modified. Your previously submitted answer has been preserved and cannot be changed.
                          </div>
                        )}

                        <div className="ml-6">
                          {/* Single Choice Radio Options */}
                          {q.type === "MULTIPLE_CHOICE" && (
                            <div className="flex flex-col gap-2.5">
                              {options.map((opt: string, i: number) => {
                                const letter = getAlphabetLabel(i)
                                const isSelected = answers[q.id] === letter
                                return (
                                  <button
                                    key={i}
                                    type="button"
                                    disabled={isLocked}
                                    onClick={() => handleAnswerChange(q.id, letter)}
                                    className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all text-left ${
                                      isLocked
                                        ? "cursor-not-allowed opacity-85 border-gray-200 bg-gray-50"
                                        : isSelected
                                        ? "border-[#a17038] bg-amber-50/60 shadow-sm ring-1 ring-[#a17038]/50"
                                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer"
                                    }`}
                                  >
                                    <span
                                      className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0 transition-colors ${
                                        isSelected
                                          ? "bg-[#a17038] text-white"
                                          : "bg-gray-200 text-gray-700"
                                      }`}
                                    >
                                      {letter}
                                    </span>
                                    <span className={`text-sm ${isLocked ? "text-gray-700 font-medium" : "text-gray-800 font-medium"}`}>
                                      {opt}
                                    </span>
                                  </button>
                                )
                              })}
                            </div>
                          )}

                          {/* Multiple Correct Checkbox Options */}
                          {q.type === "MULTIPLE_CORRECT" && (
                            <div className="space-y-2">
                              <p className="text-xs text-purple-800 font-medium flex items-center gap-1 mb-2">
                                <Info size={12} /> Select all correct options (one or more):
                              </p>
                              <div className="flex flex-col gap-2.5">
                                {options.map((opt: string, i: number) => {
                                  const letter = getAlphabetLabel(i)
                                  const selectedList = (answers[q.id] || "")
                                    .split(",")
                                    .map((s) => s.trim().toUpperCase())
                                    .filter(Boolean)
                                  const isSelected = selectedList.includes(letter)

                                  return (
                                    <button
                                      key={i}
                                      type="button"
                                      disabled={isLocked}
                                      onClick={() => handleMultipleCorrectToggle(q.id, letter)}
                                      className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all text-left ${
                                        isLocked
                                          ? "cursor-not-allowed opacity-85 border-gray-200 bg-gray-50"
                                          : isSelected
                                          ? "border-purple-600 bg-purple-50/70 shadow-sm ring-1 ring-purple-500/50"
                                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer"
                                      }`}
                                    >
                                      <div className="flex-shrink-0 text-purple-700">
                                        {isSelected ? (
                                          <CheckSquare size={18} className="text-purple-600" />
                                        ) : (
                                          <Square size={18} className="text-gray-400" />
                                        )}
                                      </div>
                                      <span
                                        className={`w-6 h-6 flex items-center justify-center rounded text-xs font-bold flex-shrink-0 transition-colors ${
                                          isSelected
                                            ? "bg-purple-600 text-white"
                                            : "bg-gray-200 text-gray-700"
                                        }`}
                                      >
                                        {letter}
                                      </span>
                                      <span className={`text-sm ${isLocked ? "text-gray-700 font-medium" : "text-gray-800 font-medium"}`}>
                                        {opt}
                                      </span>
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* One Word Input */}
                          {q.type === "ONE_WORD" && (
                            <input
                              type="text"
                              value={answers[q.id] || ""}
                              disabled={isLocked}
                              readOnly={isLocked}
                              onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                              className={`w-full max-w-md p-2.5 border rounded-lg text-sm text-gray-900 ${
                                isLocked
                                  ? "bg-gray-100/90 border-gray-300 text-gray-700 cursor-not-allowed font-medium"
                                  : "bg-white border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#a17038]"
                              }`}
                              placeholder={isLocked ? "Preserved answer" : "Type single word answer..."}
                            />
                          )}

                          {/* Short Answer / Long Answer Textarea */}
                          {q.type === "SHORT_ANSWER" && (
                            <textarea
                              value={answers[q.id] || ""}
                              disabled={isLocked}
                              readOnly={isLocked}
                              onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                              className={`w-full p-2.5 border rounded-lg min-h-[110px] text-sm text-gray-900 ${
                                isLocked
                                  ? "bg-gray-100/90 border-gray-300 text-gray-700 cursor-not-allowed font-medium"
                                  : "bg-white border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#a17038]"
                              }`}
                              placeholder={isLocked ? "Preserved answer" : "Type your detailed response..."}
                            />
                          )}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-12 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-gray-500 text-sm">
                    No published questions available for this quiz yet.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-red-500 py-8 text-center">Failed to load quiz questions.</div>
          )}
        </div>

        {/* Footer */}
        {!loading && (
          <div className="p-4 sm:p-5 border-t border-gray-200 flex justify-end gap-3 bg-gray-50/70">
            {isClosedQuiz || submittedData ? (
              <button
                onClick={onClose}
                className="px-6 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-95 shadow-sm"
                style={{ backgroundColor: "#a17038" }}
              >
                Close
              </button>
            ) : quiz ? (
              <>
                <button
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-black"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !quiz.questions || quiz.questions.length === 0}
                  className={`px-6 py-2 text-sm font-semibold text-white rounded-lg transition-all shadow-sm ${
                    !quiz.questions || quiz.questions.length === 0
                      ? "opacity-50 cursor-not-allowed bg-gray-400"
                      : "hover:opacity-95"
                  }`}
                  style={{ backgroundColor: !quiz.questions || quiz.questions.length === 0 ? undefined : "#a17038" }}
                >
                  {isSubmitting ? "Submitting..." : isOutdated ? "Submit Updated Quiz" : "Submit Answers"}
                </button>
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* Leaderboard Modal Portal */}
      {leaderboardOpen && quiz && (
        <QuizLeaderboardModal
          projectId={projectId}
          quizId={quiz.id}
          quizTitle={quiz.title}
          onClose={() => setLeaderboardOpen(false)}
        />
      )}

      {/* Performance Tracker Modal Portal */}
      {performanceOpen && (
        <StudentPerformanceModal
          projectId={projectId}
          onClose={() => setPerformanceOpen(false)}
        />
      )}

      {/* Marking Scheme Guide Modal Portal */}
      {markingGuideOpen && (
        <MarkingSchemeGuideModal
          onClose={() => setMarkingGuideOpen(false)}
        />
      )}
    </div>
  )
}
