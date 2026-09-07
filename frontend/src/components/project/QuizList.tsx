"use client"

import { useState } from "react"
import { useProjects } from "@/context/ProjectContext"
import type { Quiz } from "@/types/quiz"
import { CreateQuizModal } from "./CreateQuizModal"
import { QuizTakeModal } from "./QuizTakeModal"
import { QuizSubmissionsModal } from "./QuizSubmissionsModal"
import { ManageQuizModal } from "./ManageQuizModal"
import { QuizAnalyticsModal } from "./QuizAnalyticsModal"
import { BarChart2 } from "lucide-react"

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-500",
  PUBLISHED: "bg-green-100 text-green-700",
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function QuizItem({
  quiz,
  projectId,
  isOwner,
  currentUserId,
}: {
  quiz: Quiz
  projectId: string
  isOwner: boolean
  currentUserId?: string
}) {
  const { deleteQuiz, updateQuiz } = useProjects()
  const [takeModalOpen, setTakeModalOpen] = useState(false)
  const [submissionsModalOpen, setSubmissionsModalOpen] = useState(false)
  const [manageModalOpen, setManageModalOpen] = useState(false)
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false)

  const handlePublish = async () => {
    if (window.confirm(`Publish quiz "${quiz.title}"? Project members will be able to take it.`)) {
      await updateQuiz(projectId, quiz.id, {
        title: quiz.title,
        description: quiz.description,
        status: "PUBLISHED"
      })
    }
  }

  return (
    <div className="border border-gray-200 rounded-md p-5 bg-white shadow-sm flex flex-col gap-3 relative group">
      {/* Delete button (owner only) */}
      {isOwner && (
        <button
          onClick={() => {
            if (window.confirm(`Delete quiz "${quiz.title}"?`)) {
              deleteQuiz(projectId, quiz.id)
            }
          }}
          className="absolute top-4 right-4 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Delete"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
        </button>
      )}

      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base font-extrabold text-black">{quiz.title}</span>
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[quiz.status]}`}>
            {STATUS_LABELS[quiz.status]}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
          <span>Created {formatDate(quiz.createdAt)}</span>
          {quiz._count?.questions !== undefined && (
            <span>{quiz._count.questions} question{quiz._count.questions !== 1 ? 's' : ''}</span>
          )}
          {isOwner && quiz._count?.submissions !== undefined && (
            <span>{quiz._count.submissions} submission{quiz._count.submissions !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      {/* Description */}
      {quiz.description && (
        <p className="text-sm text-gray-900 whitespace-pre-wrap">{quiz.description}</p>
      )}

      {/* Actions */}
      <div className="mt-1 flex items-center gap-4 flex-wrap">
        {isOwner ? (
          <>
            {quiz.status === 'DRAFT' && (
              <button
                onClick={handlePublish}
                className="text-xs font-semibold text-[#a17038] hover:text-[#8a5f2e] transition-colors"
              >
                Publish Quiz
              </button>
            )}
            <button
              onClick={() => setManageModalOpen(true)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
            >
              Manage Quiz
            </button>
            <button
              onClick={() => setSubmissionsModalOpen(true)}
              className="text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors"
            >
              View Submissions
            </button>
            <button
              onClick={() => setAnalyticsModalOpen(true)}
              className="text-xs font-semibold text-purple-700 hover:text-purple-900 transition-colors flex items-center gap-1 bg-purple-50 px-2.5 py-1 rounded"
            >
              <BarChart2 size={13} />
              Analytics
            </button>
          </>
        ) : (
          <button
            onClick={() => setTakeModalOpen(true)}
            className="text-xs font-semibold text-[#a17038] hover:text-[#8a5f2e] transition-colors"
          >
            Take Quiz
          </button>
        )}
      </div>

      {takeModalOpen && (
        <QuizTakeModal
          quiz={quiz}
          projectId={projectId}
          onClose={() => setTakeModalOpen(false)}
        />
      )}

      {submissionsModalOpen && (
        <QuizSubmissionsModal
          quiz={quiz}
          projectId={projectId}
          onClose={() => setSubmissionsModalOpen(false)}
        />
      )}

      {manageModalOpen && (
        <ManageQuizModal
          quizId={quiz.id}
          projectId={projectId}
          onClose={() => setManageModalOpen(false)}
        />
      )}

      {analyticsModalOpen && (
        <QuizAnalyticsModal
          projectId={projectId}
          quizId={quiz.id}
          quizTitle={quiz.title}
          onClose={() => setAnalyticsModalOpen(false)}
        />
      )}
    </div>
  )
}

interface Props {
  projectId: string
  isOwner: boolean
  currentUserId?: string
}

export function QuizList({ projectId, isOwner, currentUserId }: Props) {
  const { quizzesForProject } = useProjects()
  const quizzes = quizzesForProject(projectId)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  return (
    <div className="flex flex-col gap-6 mt-4">
      {isOwner && (
        <div className="flex justify-end">
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-5 py-2 text-sm font-semibold rounded hover:opacity-95 transition-opacity"
            style={{ backgroundColor: "#a17038", color: "#ffffff" }}
          >
            Create New Quiz
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {quizzes.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">
            {isOwner ? "Create your first quiz above." : "No quizzes yet."}
          </p>
        ) : (
          quizzes.map((q) => (
            <QuizItem
              key={q.id}
              quiz={q}
              projectId={projectId}
              isOwner={isOwner}
              currentUserId={currentUserId}
            />
          ))
        )}
      </div>

      {createModalOpen && (
        <CreateQuizModal
          projectId={projectId}
          onClose={() => setCreateModalOpen(false)}
        />
      )}
    </div>
  )
}
