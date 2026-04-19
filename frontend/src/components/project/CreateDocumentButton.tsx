"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useProjects } from "@/context/ProjectContext"

type Props = {
  projectId: string
}

export function CreateDocumentButton({ projectId }: Props) {
  const { createPdfDocument } = useProjects()
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)

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
          // result is "data:application/pdf;base64,XXXX..." — extract the base64 part
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
      event.target.value = ""
    }
  }

  return (
    <label className={`inline-flex cursor-pointer items-center rounded-md bg-black px-3 py-2 text-sm font-medium text-white ${isUploading ? "opacity-60 pointer-events-none" : ""}`}>
      {isUploading ? "Uploading…" : "+ New Document"}
      <input
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
        disabled={isUploading}
      />
    </label>
  )
}
