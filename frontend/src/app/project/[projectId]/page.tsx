"use client"

import { useParams, useRouter } from "next/navigation"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import { useProjects } from "@/context/ProjectContext"
import { DocumentList } from "@/components/project/DocumentList"
import { CreateDocumentButton } from "@/components/project/CreateDocumentButton"
import { ShareModal } from "@/components/project/ShareModal"
import { useState, useEffect } from "react"
import { getCurrentUser } from "@/lib/api/authFetch"

export default function ProjectPage() {
  const params = useParams<{ projectId: string }>()
  const router = useRouter()
  const { getProjectById, documentsForProject, fetchDocuments, renameProject, deleteProject, loading } = useProjects()
  const projectId = params.projectId
  const project = getProjectById(projectId)
  const docs = documentsForProject(projectId)
  const [name, setName] = useState(project?.name ?? "")
  const [docsLoaded, setDocsLoaded] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null)

  useEffect(() => {
    getCurrentUser().then(user => setCurrentUser(user))
  }, [])

  // Fetch documents when the project page loads
  useEffect(() => {
    if (projectId && !docsLoaded) {
      fetchDocuments(projectId).then(() => setDocsLoaded(true))
    }
  }, [projectId, docsLoaded, fetchDocuments])

  // Sync name when project data arrives
  useEffect(() => {
    if (project) setName(project.name)
  }, [project])

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col bg-white">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-500">Loading…</p>
        </main>
        <Footer />
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
        <Footer />
      </div>
    )
  }

  const handleRenameBlur = async () => {
    if (name.trim() && name.trim() !== project.name) {
      await renameProject(project.id, name.trim())
    } else {
      setName(project.name)
    }
  }

  const handleDelete = async () => {
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
              onChange={(e) => setName(e.target.value)}
              onBlur={handleRenameBlur}
              className="flex-1 border-none bg-transparent text-2xl font-semibold text-gray-900 placeholder-gray-500 focus:outline-none"
            />
            <div className="flex gap-2">
              {currentUser?.id === project.ownerId && (
                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(true)}
                  className="rounded-md bg-black px-3 py-2 text-xs font-medium text-white hover:bg-gray-800"
                >
                  Share
                </button>
              )}
              {currentUser?.id === project.ownerId && (
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

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <CreateDocumentButton projectId={project.id} />
          </div>

          <DocumentList documents={docs} />
        </div>
      </main>
      <Footer />
      <ShareModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        projectId={project.id} 
      />
    </div>
  )
}
