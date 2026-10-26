"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import type { Project } from "@/types/project"

type Props = {
  project: Project
  onRename?: (id: string, newName: string) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  isOwner?: boolean
}

export function ProjectCard({ project, onRename, onDelete, isOwner }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(project.name)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClick)
      return () => document.removeEventListener("mousedown", handleClick)
    }
  }, [menuOpen])

  const handleRenameStart = () => {
    setEditName(project.name)
    setIsEditing(true)
    setMenuOpen(false)
  }

  const handleRenameSubmit = async () => {
    const trimmed = editName.trim()
    if (!trimmed || trimmed === project.name) {
      setIsEditing(false)
      setEditName(project.name)
      return
    }
    setSaving(true)
    try {
      await onRename?.(project.id, trimmed)
    } catch {
      setEditName(project.name)
    } finally {
      setSaving(false)
      setIsEditing(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleRenameSubmit()
    } else if (e.key === "Escape") {
      setIsEditing(false)
      setEditName(project.name)
    }
  }

  return (
    <div className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow relative">
      <div>
        <div className="flex items-start justify-between gap-2">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={handleKeyDown}
              disabled={saving}
              className="flex-1 text-lg font-semibold text-gray-900 border border-gray-300 rounded-md px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
          ) : (
            <h3 className="text-lg font-semibold mb-1 text-gray-900 flex-1">{project.name}</h3>
          )}

          {isOwner && !isEditing && (
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setMenuOpen((prev) => !prev)
                }}
                className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Project options"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <circle cx="8" cy="3" r="1.5" />
                  <circle cx="8" cy="8" r="1.5" />
                  <circle cx="8" cy="13" r="1.5" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-8 z-10 w-36 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleRenameStart()
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setMenuOpen(false)
                      const confirmed = window.confirm("Delete this project and all its documents?")
                      if (confirmed) {
                        onDelete?.(project.id)
                      }
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-900 mb-1">
          Owner: {project.owner?.username || "Unknown"}
        </p>
        <p className="text-xs text-gray-900">
          Last edited: {project.updatedAt.slice(0, 10)}
        </p>
      </div>
      <div className="mt-4 flex justify-end">
        <Link
          href={`/project/${project.id}`}
          className="inline-flex items-center text-sm font-medium text-black hover:underline"
        >
          Open →
        </Link>
      </div>
    </div>
  )
}
