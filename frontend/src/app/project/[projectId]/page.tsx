"use client"

import { useParams, useRouter } from "next/navigation"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import { useProjects } from "@/context/ProjectContext"
import { DocumentList } from "@/components/project/DocumentList"
import { CreateDocumentButton } from "@/components/project/CreateDocumentButton"
import { useState } from "react"

export default function ProjectPage() {
  const params = useParams<{ projectId: string }>()
  const router = useRouter()
  const { projects, getProjectById, documentsForProject, renameProject, deleteProject } = useProjects()
  const projectId = params.projectId
  const project = getProjectById(projectId)
  const docs = documentsForProject(projectId)
  const [name, setName] = useState(project?.name ?? "")

  if (!project) {
    return (
      <div className="min-h-screen w-full flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-4">Project not found.</p>
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

  const handleRenameBlur = () => {
    if (name.trim() && name.trim() !== project.name) {
      renameProject(project.id, name.trim())
    } else {
      setName(project.name)
    }
  }

  const handleDelete = () => {
    const confirmed = window.confirm("Delete this project and all its documents?")
    if (!confirmed) return
    deleteProject(project.id)
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
              className="flex-1 border-none bg-transparent text-2xl font-semibold focus:outline-none"
            />
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-md border border-red-300 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              Delete project
            </button>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <CreateDocumentButton projectId={project.id} />
          </div>

          <DocumentList documents={docs} />
        </div>
      </main>
      <Footer />
    </div>
  )
}

