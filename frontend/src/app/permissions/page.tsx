"use client"

import { useState, useEffect } from "react"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import { useProjects } from "@/context/ProjectContext"
import { ShareModal } from "@/components/project/ShareModal"
import { getCurrentUser } from "@/lib/api/authFetch"

export default function PermissionsPage() {
  const { projects, loading } = useProjects()
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)

  useEffect(() => {
    getCurrentUser().then(user => setCurrentUser(user))
  }, [])

  const ownedProjects = projects.filter(p => p.ownerId === currentUser?.id)

  const handleManagePermissions = (projectId: string) => {
    setSelectedProjectId(projectId)
    setIsShareModalOpen(true)
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-white">
      <Navbar />
      <main className="flex-1 w-full">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Project Permissions</h1>
          <p className="text-gray-600 mb-8">Manage annotation permissions for projects you own.</p>

          {loading ? (
            <p className="text-sm text-gray-500">Loading projects...</p>
          ) : ownedProjects.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">You don't own any projects yet.</p>
              <a
                href="/home"
                className="inline-block bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800"
              >
                Go to Dashboard
              </a>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {ownedProjects.map(project => (
                <div
                  key={project.id}
                  className="border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{project.name}</h2>
                      <p className="text-sm text-gray-500 mt-1">
                        Created: {new Date(project.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleManagePermissions(project.id)}
                      className="px-4 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800"
                    >
                      Manage Permissions
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
      {selectedProjectId && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => {
            setIsShareModalOpen(false)
            setSelectedProjectId(null)
          }}
          projectId={selectedProjectId}
          isOwner={true}
        />
      )}
    </div>
  )
}
