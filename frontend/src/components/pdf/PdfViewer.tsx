"use client"

import { useEffect, useRef, useState } from "react"
import type { Document as AppDocument } from "@/types/document"
import * as pdfjsLib from "pdfjs-dist"
import "pdfjs-dist/build/pdf.worker.mjs"

type Props = {
  doc: AppDocument
}

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString()

export function PdfViewer({ doc }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!doc.pdfUrl || !containerRef.current) return

    let cancelled = false
    const container = containerRef.current
    container.innerHTML = ""

    const render = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument(doc.pdfUrl)
        const pdf = await loadingTask.promise

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancelled) break
          const page = await pdf.getPage(pageNum)
          const viewport = page.getViewport({ scale: 1.3 })

          const canvas = document.createElement("canvas")
          const context = canvas.getContext("2d")
          if (!context) continue

          canvas.width = viewport.width
          canvas.height = viewport.height
          canvas.style.display = "block"
          canvas.style.margin = "0 auto 24px auto"

          container.appendChild(canvas)

          await page.render({
            canvasContext: context,
            viewport,
          }).promise
        }
      } catch (e) {
        if (!cancelled) {
          setError("Failed to render PDF.")
          // eslint-disable-next-line no-console
          console.error(e)
        }
      }
    }

    render()

    return () => {
      cancelled = true
      container.innerHTML = ""
    }
  }, [doc.pdfUrl])

  if (!doc.pdfUrl) {
    return <p className="text-sm text-gray-500 mt-4">No PDF data available.</p>
  }

  if (error) {
    return <p className="text-sm text-red-500 mt-4">{error}</p>
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-auto bg-white px-6 py-8"
    />
  )
}

