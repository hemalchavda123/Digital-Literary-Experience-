"use client"

import { useRouter } from "next/navigation"
import { useProjects } from "@/context/ProjectContext"

type Props = {
  projectId: string
}

export function CreateDocumentButton({ projectId }: Props) {
  const { createPdfDocument } = useProjects()
  const router = useRouter()

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.type !== "application/pdf") {
      window.alert("Only PDF documents are supported for now.")
      return
    }
    const objectUrl = URL.createObjectURL(file)
    const title = file.name.replace(/\.pdf$/i, "")
    const doc = createPdfDocument(projectId, title, objectUrl)
    router.push(`/document/${doc.id}`)
  }

  return (
    <label className="inline-flex cursor-pointer items-center rounded-md bg-black px-3 py-2 text-sm font-medium text-white">
      + New Document
      <input
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />
    </label>
  )
}

