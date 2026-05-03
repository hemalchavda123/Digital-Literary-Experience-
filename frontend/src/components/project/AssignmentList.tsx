"use client"

import { useState } from "react"
import { useProjects } from "@/context/ProjectContext"
import type { Assignment } from "@/types/assignment"

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-500",
  SUBMITTED: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  SUBMITTED: "Submitted",
  COMPLETED: "Completed",
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function isPastDue(dueDate: string | null) {
  if (!dueDate) return false
  return new Date(dueDate) < new Date()
}

// ─── Assignment Card ──────────────────────────────────────────────────────────

function AssignmentItem({
  assignment,
  projectId,
  isOwner,
  currentUserId,
}: {
  assignment: Assignment
  projectId: string
  isOwner: boolean
  currentUserId?: string
}) {
  const { deleteAssignment, updateAssignmentStatus } = useProjects()
  const [showMembers, setShowMembers] = useState(false)
  const [gradingUserId, setGradingUserId] = useState<string | null>(null)
  const [gradeInput, setGradeInput] = useState("")
  const [loading, setLoading] = useState(false)

  const myStatus = assignment.statuses.find((s) => s.userId === currentUserId)
  const pastDue = isPastDue(assignment.dueDate)
  const completedCount = assignment.statuses.filter((s) => s.status === "COMPLETED").length
  const submittedCount = assignment.statuses.filter((s) => s.status === "SUBMITTED").length

  const doUpdate = async (userId: string, status?: string, grade?: string) => {
    setLoading(true)
    try {
      await updateAssignmentStatus(projectId, assignment.id, userId, status, grade)
    } finally {
      setLoading(false)
    }
  }

  const handleGrade = async (userId: string) => {
    if (!gradeInput.trim()) return
    await doUpdate(userId, "COMPLETED", gradeInput.trim())
    setGradingUserId(null)
    setGradeInput("")
  }

  return (
    <div className="border border-gray-200 rounded-md p-5 bg-white shadow-sm flex flex-col gap-3 relative group">
      {/* Delete button (owner only) */}
      {isOwner && (
        <button
          onClick={() => {
            if (window.confirm(`Delete assignment "${assignment.title}"?`)) {
              deleteAssignment(projectId, assignment.id)
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
          <span className="text-base font-extrabold text-black">{assignment.title}</span>
          {!isOwner && myStatus && (
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[myStatus.status]}`}>
              {STATUS_LABELS[myStatus.status]}
            </span>
          )}
          {/* Remove top-level grade badge — now shown inline in the header row */}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
          {assignment.dueDate && (
            <span className={pastDue && myStatus?.status !== "COMPLETED" ? "text-red-500 font-medium" : ""}>
              Due {formatDate(assignment.dueDate)}
              {pastDue && myStatus?.status !== "COMPLETED" ? " · Overdue" : ""}
            </span>
          )}
          {assignment.totalMarks && (
            <span>{assignment.totalMarks} marks</span>
          )}
          {isOwner && assignment.statuses.length > 0 && (
            <span>
              {completedCount}/{assignment.statuses.length} completed
              {submittedCount > 0 && ` · ${submittedCount} submitted`}
            </span>
          )}
          {!isOwner && myStatus?.grade && (
            <span className="font-medium text-amber-600">
              Score: {myStatus.grade}{assignment.totalMarks ? ` / ${assignment.totalMarks}` : ""}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {assignment.description && (
        <p className="text-sm text-gray-900 whitespace-pre-wrap">{assignment.description}</p>
      )}

      {/* Actions row */}
      <div className="mt-1 flex items-center gap-4">
        {/* Member: Submit / Unsubmit */}
        {!isOwner && myStatus?.status === "PENDING" && (
          <button
            onClick={() => doUpdate(currentUserId!, "SUBMITTED")}
            disabled={loading}
            className="text-xs font-semibold text-[#a17038] hover:text-[#8a5f2e] disabled:opacity-50 transition-colors"
          >
            Mark as Submitted
          </button>
        )}
        {!isOwner && myStatus?.status === "SUBMITTED" && (
          <button
            onClick={() => doUpdate(currentUserId!, "PENDING")}
            disabled={loading}
            className="text-xs font-medium text-gray-500 hover:text-gray-800 disabled:opacity-50 transition-colors"
          >
            Unsubmit
          </button>
        )}

        {/* Owner: expand members */}
        {isOwner && (
          <button
            onClick={() => setShowMembers((v) => !v)}
            className="text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors flex items-center gap-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            {showMembers ? "Hide Members" : `Members (${assignment.statuses.length})`}
          </button>
        )}
      </div>

      {/* Owner: members panel */}
      {isOwner && showMembers && (
        <div className="mt-2 flex flex-col gap-3 pl-4 border-l-2 border-gray-100">
          {assignment.statuses.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No members yet.</p>
          ) : (
            assignment.statuses.map((s) => (
              <div key={s.id} className="flex items-center gap-3 group/member relative">
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-gray-700">{s.user.username}</span>
                  {s.grade && (
                    <span className="ml-2 text-xs font-medium text-amber-600">
                      · {s.grade}{assignment.totalMarks ? ` / ${assignment.totalMarks}` : ""}
                    </span>
                  )}
                </div>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[s.status]}`}>
                  {STATUS_LABELS[s.status]}
                </span>

                {/* Grade input */}
                {gradingUserId === s.userId ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={gradeInput}
                      onChange={(e) => setGradeInput(e.target.value)}
                      placeholder={assignment.totalMarks ? `/ ${assignment.totalMarks}` : "e.g. A+, 9/10"}
                      className="w-24 border-b border-gray-300 bg-transparent text-xs text-black py-0.5 px-1 focus:outline-none focus:border-[#a17038] placeholder:text-gray-400"
                      onKeyDown={(e) => e.key === "Enter" && handleGrade(s.userId)}
                      autoFocus
                    />
                    <button
                      onClick={() => handleGrade(s.userId)}
                      disabled={loading}
                      className="text-xs font-semibold text-[#a17038] hover:text-[#8a5f2e] disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setGradingUserId(null); setGradeInput("") }}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    {s.status === "SUBMITTED" && (
                      <button
                        onClick={() => { setGradingUserId(s.userId); setGradeInput(s.grade ?? "") }}
                        className="text-xs font-medium text-black hover:text-[#a17038] transition-colors"
                      >
                        Grade
                      </button>
                    )}
                    {s.status === "COMPLETED" && (
                      <button
                        onClick={() => { setGradingUserId(s.userId); setGradeInput(s.grade ?? "") }}
                        className="text-xs font-medium text-black hover:text-[#a17038] transition-colors"
                      >
                        Edit Grade
                      </button>
                    )}
                    {s.status === "PENDING" && (
                      <button
                        onClick={() => doUpdate(s.userId, "COMPLETED")}
                        disabled={loading}
                        className="text-xs font-medium text-black hover:text-[#a17038] disabled:opacity-50 transition-colors"
                      >
                        Mark Done
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main List ────────────────────────────────────────────────────────────────

interface Props {
  projectId: string
  isOwner: boolean
  currentUserId?: string
}

export function AssignmentList({ projectId, isOwner, currentUserId }: Props) {
  const { assignmentsForProject, createAssignment } = useProjects()
  const assignments = assignmentsForProject(projectId)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [totalMarks, setTotalMarks] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setIsSubmitting(true)
    try {
      await createAssignment(
        projectId,
        title.trim(),
        description.trim(),
        dueDate || undefined,
        totalMarks ? parseInt(totalMarks, 10) : undefined
      )
      setTitle("")
      setDescription("")
      setDueDate("")
      setTotalMarks("")
    } catch (error) {
      console.error("Failed to create assignment", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 mt-4">
      {/* Create form — owner only */}
      {isOwner && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border-2 border-transparent hover:border-[#a17038]/50 transition-colors duration-200 p-5 rounded-md flex flex-col gap-3 shadow-sm"
        >
          <h3 className="text-base font-extrabold text-black">New Assignment</h3>

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full p-3 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black bg-white text-[#0f120f] placeholder:text-gray-500 font-medium"
            disabled={isSubmitting}
            required
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="w-full min-h-[80px] p-3 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black bg-white text-[#0f120f] placeholder:text-gray-500 font-medium resize-none"
            disabled={isSubmitting}
          />

          <div className="flex items-start gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Due date (optional)</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black bg-white text-[#0f120f]"
                disabled={isSubmitting}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Total marks (optional)</label>
              <input
                type="number"
                min="1"
                value={totalMarks}
                onChange={(e) => setTotalMarks(e.target.value)}
                placeholder="100"
                className="w-28 text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black bg-white text-black placeholder:text-gray-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                disabled={isSubmitting}
              />
            </div>
            <div className="flex-1 flex justify-end items-end pt-5">
              <button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="px-5 py-2 text-sm font-semibold rounded hover:opacity-95 disabled:opacity-50 transition-opacity"
                style={{ backgroundColor: "#a17038", color: "#ffffff" }}
              >
                {isSubmitting ? "Posting..." : "Post Assignment"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Assignment list */}
      <div className="flex flex-col gap-4">
        {assignments.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">
            {isOwner ? "Create your first assignment above." : "No assignments yet."}
          </p>
        ) : (
          assignments.map((a) => (
            <AssignmentItem
              key={a.id}
              assignment={a}
              projectId={projectId}
              isOwner={isOwner}
              currentUserId={currentUserId}
            />
          ))
        )}
      </div>
    </div>
  )
}
