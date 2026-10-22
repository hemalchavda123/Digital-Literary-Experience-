"use client"

import React, { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useProjects } from "@/context/ProjectContext"
import { GoogleDriveModal, GoogleDriveIcon } from "./GoogleDriveModal"
import { Upload, ChevronDown, Laptop, Cloud } from "lucide-react"

type Props = {
  projectId: string
}

export function CreateDocumentButton({ projectId }: Props) {
  const { createPdfDocument } = useProjects()
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isMenuOpen])

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.type !== "application/pdf") {
      window.alert("Only PDF documents are supported for now.")
      return
    }

    setIsUploading(true)
    try {
      // Read the PDF file as base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          resolve(result)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const title = file.name.replace(/\.pdf$/i, "")
      const doc = await createPdfDocument(projectId, title, base64)
      router.push(`/document/${doc.id}`)
    } catch (err) {
      console.error("Failed to upload document:", err)
      window.alert("Failed to upload document. Please try again.")
    } finally {
      setIsUploading(false)
      // Reset the input so the same file can be selected again
      if (event.target) {
        event.target.value = ""
      }
    }
  }

  const triggerLocalUpload = () => {
    setIsMenuOpen(false)
    fileInputRef.current?.click()
  }

  return (
    <div className="flex items-center gap-2 relative" ref={menuRef}>
      {/* Hidden native file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
        disabled={isUploading}
      />

      {/* Main "+ New Document" button group */}
      <div className="inline-flex rounded-lg shadow-xs">
        <button
          type="button"
          onClick={triggerLocalUpload}
          disabled={isUploading}
          className={`inline-flex items-center gap-2 rounded-l-lg bg-black px-3.5 py-2 text-sm font-medium text-white hover:bg-neutral-800 active:scale-98 transition-all ${
            isUploading ? "opacity-60 pointer-events-none" : ""
          }`}
        >
          <Upload size={15} />
          <span>{isUploading ? "Uploading…" : "Upload PDF"}</span>
        </button>

        <button
          type="button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          disabled={isUploading}
          aria-label="Upload options"
          className="inline-flex items-center justify-center rounded-r-lg border-l border-neutral-700 bg-black px-2 py-2 text-white hover:bg-neutral-800 transition-colors"
        >
          <ChevronDown size={14} className={`transition-transform duration-150 ${isMenuOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Direct Google Drive action button */}
      <button
        type="button"
        onClick={() => setIsDriveModalOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-xs hover:bg-gray-50 hover:border-gray-300 active:scale-98 transition-all cursor-pointer"
      >
        <GoogleDriveIcon className="w-4 h-4" />
        <span>Google Drive</span>
      </button>

      {/* Dropdown Menu */}
      {isMenuOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-60 rounded-xl bg-white shadow-xl border border-gray-100 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 border-b border-gray-100">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Add PDF Document
            </span>
          </div>

          <button
            type="button"
            onClick={triggerLocalUpload}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
              <Laptop size={15} />
            </div>
            <div>
              <span className="font-semibold block leading-tight text-gray-900">Upload from Device</span>
              <span className="text-xs text-gray-500">Pick a PDF from your computer</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsMenuOpen(false)
              setIsDriveModalOpen(true)
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left text-sm text-gray-700 hover:bg-blue-50/50 transition-colors group"
          >
            <div className="w-7 h-7 rounded-lg bg-white border border-gray-100 shadow-2xs flex items-center justify-center">
              <GoogleDriveIcon className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold block leading-tight text-gray-900 group-hover:text-blue-700">
                Google Drive
              </span>
              <span className="text-xs text-gray-500">Browse files or paste Drive link</span>
            </div>
          </button>
        </div>
      )}

      {/* Google Drive Modal */}
      <GoogleDriveModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        projectId={projectId}
      />
    </div>
  )
}
