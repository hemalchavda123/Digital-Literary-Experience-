"use client"

import React, { useState } from "react"
import { GoogleDriveModal, GoogleDriveIcon } from "./GoogleDriveModal"

type Props = {
  projectId?: string
  onUpload?: (file: File) => void
}

export function UploadFileButton({ projectId, onUpload }: Props) {
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false)

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.type !== "application/pdf") {
      window.alert("Only PDF files are supported for now.")
      return
    }
    if (onUpload) {
      onUpload(file)
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <label className="inline-flex cursor-pointer items-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
        Upload PDF
        <input
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleChange}
        />
      </label>

      {projectId && (
        <>
          <button
            type="button"
            onClick={() => setIsDriveModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <GoogleDriveIcon className="w-4 h-4" />
            <span>Google Drive</span>
          </button>

          <GoogleDriveModal
            isOpen={isDriveModalOpen}
            onClose={() => setIsDriveModalOpen(false)}
            projectId={projectId}
          />
        </>
      )}
    </div>
  )
}
