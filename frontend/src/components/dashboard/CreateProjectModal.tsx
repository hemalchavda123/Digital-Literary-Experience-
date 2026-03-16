"use client"

import { useState } from "react"
import { useProjects } from "@/context/ProjectContext"

type Props = {
  isOpen: boolean
  onClose: () => void
}

export function CreateProjectModal({ isOpen, onClose }: Props) {
  const { createProject } = useProjects()
  const [name, setName] = useState("")

  if (!isOpen) return null

  const handleCreate = () => {
    if (!name.trim()) return
    createProject(name.trim())
    setName("")
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold mb-4">New Project</h2>
        <label className="block text-sm mb-2">Project name</label>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          placeholder="My First Novel"
        />
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  )
}

