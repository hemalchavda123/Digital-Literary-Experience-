"use client"

import { useParams, useRouter } from "next/navigation"
import Navbar from "@/components/Navbar"
import { useProjects } from "@/context/ProjectContext"
import { DocumentList } from "@/components/project/DocumentList"
import { CreateDocumentButton } from "@/components/project/CreateDocumentButton"
import { ShareModal } from "@/components/project/ShareModal"
import { AnnouncementList } from "@/components/project/AnnouncementList"
import { AssignmentList } from "@/components/project/AssignmentList"
import { QuizList } from "@/components/project/QuizList"
import { useState, useEffect } from "react"
import { getCurrentUser } from "@/lib/api/authFetch"
import { getProjectMembers } from "@/lib/api/projects"
import type { Role, ProjectMember } from "@/types/project"

export default function ProjectPage() {
  const params = useParams<{ projectId: string }>()
  const router = useRouter()
  const { getProjectById, documentsForProject, fetchDocuments, fetchAnnouncements, fetchAssignments, fetchQuizzes, renameProject, deleteProject, loading } = useProjects()
  const projectId = params.projectId
  const project = getProjectById(projectId)
  const docs = documentsForProject(projectId)
  const [name, setName] = useState(project?.name ?? "")
  const [docsLoaded, setDocsLoaded] = useState(false)
  const [annsLoaded, setAnnsLoaded] = useState(false)
  const [assignsLoaded, setAssignsLoaded] = useState(false)
  const [quizzesLoaded, setQuizzesLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState<"documents" | "announcements" | "assignments" | "quizzes">("documents")
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null)
  const [memberRole, setMemberRole] = useState<Role | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      try {
        const user = await getCurrentUser()
        if (!user) {
          router.replace("/signup2")
        } else {
          setCurrentUser(user)
          setIsAuthenticated(true)
        }
      } catch (error) {
        router.replace("/signup2")
      } finally {
        setAuthChecked(true)
      }
    }
    checkAuth()
  }, [router])

  // Fetch documents and announcements when the project page loads
  useEffect(() => {
    if (projectId && !docsLoaded) {
      fetchDocuments(projectId).then(() => setDocsLoaded(true))
    }
    if (projectId && !annsLoaded) {
      fetchAnnouncements(projectId).then(() => setAnnsLoaded(true))
    }
    if (projectId && !assignsLoaded) {
      fetchAssignments(projectId).then(() => setAssignsLoaded(true))
    }
    if (projectId && !quizzesLoaded) {
      fetchQuizzes(projectId).then(() => setQuizzesLoaded(true))
    }
  }, [projectId, docsLoaded, annsLoaded, assignsLoaded, quizzesLoaded, fetchDocuments, fetchAnnouncements, fetchAssignments, fetchQuizzes])

  // Sync name when project data arrives
  useEffect(() => {
    if (project) setName(project.name)
  }, [project])

  // Resolve current user's role in the project
  useEffect(() => {
    if (!projectId || !currentUser?.id) return

    if (project?.ownerId === currentUser.id) {
      setMemberRole("OWNER")
      return
    }

    const myMember = project?.members?.find((m) => m.userId === currentUser.id)
    if (myMember?.role) {
      setMemberRole(myMember.role)
      return
    }

    let isMounted = true
    getProjectMembers(projectId)
      .then((members: ProjectMember[]) => {
        if (!isMounted) return
        const me = members?.find((m) => m.userId === currentUser.id)
        if (me?.role) {
          setMemberRole(me.role)
        } else {
          setMemberRole("VIEWER")
        }
      })
      .catch((err) => {
        console.error("Failed to load project members for role check:", err)
        if (isMounted) setMemberRole("VIEWER")
      })

    return () => {
      isMounted = false
    }
  }, [projectId, currentUser?.id, project?.ownerId, project?.members])

  const isOwner = Boolean(currentUser?.id && project?.ownerId && currentUser.id === project.ownerId)
  const isEditor = memberRole === "EDITOR" || Boolean(project?.members?.some((m) => m.userId === currentUser?.id && m.role === "EDITOR"))
  const canUploadDocument = isOwner || isEditor

  if (!authChecked) {
    return (
      <div className="min-h-screen w-full flex flex-col bg-white">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-500">Loading…</p>
        </main>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col bg-white">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-500">Loading…</p>
        </main>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen w-full flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-gray-900 mb-4">Project not found.</p>
            <button
              type="button"
              onClick={() => router.push("/home")}
              className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
            >
              Back to dashboard
            </button>
          </div>
        </main>
      </div>
    )
  }

  const handleRenameBlur = async () => {
    if (!isOwner) return
    if (name.trim() && name.trim() !== project.name) {
      await renameProject(project.id, name.trim())
    } else {
      setName(project.name)
    }
  }

  const handleDelete = async () => {
    if (!isOwner) return
    const confirmed = window.confirm("Delete this project and all its documents?")
    if (!confirmed) return
    await deleteProject(project.id)
    router.push("/home")
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-white">
      <Navbar />
      <main className="flex-1 w-full">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => isOwner && setName(e.target.value)}
              onBlur={handleRenameBlur}
              readOnly={!isOwner}
              className={`flex-1 border-none bg-transparent text-2xl font-semibold text-gray-900 placeholder-gray-500 focus:outline-none ${
                !isOwner ? "cursor-default" : ""
              }`}
            />
            <div className="flex gap-2">
              {isOwner && (
                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(true)}
                  className="rounded-md bg-black px-3 py-2 text-xs font-medium text-white hover:bg-gray-800"
                >
                  Share
                </button>
              )}
              {isOwner && (
                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(true)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Permissions
                </button>
              )}
              {isOwner && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-md border border-red-300 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  Delete project
                </button>
              )}
            </div>
          </div>

          <div className="mt-8 border-b border-gray-200">
            <nav className="-mb-px flex gap-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab("documents")}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "documents"
                    ? "border-black text-black"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Documents
              </button>
              <button
                onClick={() => setActiveTab("announcements")}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "announcements"
                    ? "border-black text-black"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Announcements
              </button>
              <button
                onClick={() => setActiveTab("assignments")}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "assignments"
                    ? "border-black text-black"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Assignments
              </button>
              <button
                onClick={() => setActiveTab("quizzes")}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "quizzes"
                    ? "border-black text-black"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Quizzes
              </button>
            </nav>
          </div>

          <div className="mt-6">
            {activeTab === "documents" && (
              <>
                {canUploadDocument && (
                  <div className="flex flex-wrap items-center gap-3 mb-6">
                    <CreateDocumentButton projectId={project.id} canUpload={canUploadDocument} />
                  </div>
                )}
                <DocumentList documents={docs} canUpload={canUploadDocument} />
              </>
            )}
            {activeTab === "announcements" && (
              <AnnouncementList projectId={project.id} isOwner={isOwner} currentUserId={currentUser?.id} />
            )}
            {activeTab === "assignments" && (
              <AssignmentList projectId={project.id} isOwner={isOwner} currentUserId={currentUser?.id} />
            )}
            {activeTab === "quizzes" && (
              <QuizList projectId={project.id} isOwner={isOwner} currentUserId={currentUser?.id} />
            )}
          </div>
        </div>
      </main>
      <ShareModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        projectId={project.id}
        isOwner={isOwner}
      />
    </div>
  )
}
