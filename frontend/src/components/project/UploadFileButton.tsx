"use client"

type Props = {
  onUpload?: (file: File) => void
}

export function UploadFileButton({ onUpload }: Props) {
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
    <label className="inline-flex cursor-pointer items-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
      Upload PDF
      <input
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleChange}
      />
    </label>
  )
}

