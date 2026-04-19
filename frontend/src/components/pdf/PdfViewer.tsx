"use client"

import { useEffect, useRef, useState } from "react"
import type { Document as AppDocument } from "@/types/document"
import { TextAnnotation } from "@/types/annotation"
import { useAnnotations } from "@/context/AnnotationContext"
import * as pdfjsLib from "pdfjs-dist"
import { TextLayer } from "pdfjs-dist"
import "pdfjs-dist/web/pdf_viewer.css"

type Props = {
  doc: AppDocument
  onAnnotationClick?: (annotations: TextAnnotation[]) => void
}

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

export function PdfViewer({ doc, onAnnotationClick }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isRendered, setIsRendered] = useState(false)
  const { annotations, labels, addAnnotation } = useAnnotations()
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; start: number; end: number } | null>(null)
  const [highlights, setHighlights] = useState<{ top: number; left: number; width: number; height: number; color: string; annotationIds: string[] }[]>([])

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) {
      setContextMenu(null)
      return
    }

    if (!containerRef.current?.contains(selection.anchorNode)) return

    const range = selection.getRangeAt(0)
    const preSelectionRange = range.cloneRange()
    preSelectionRange.selectNodeContents(containerRef.current)
    preSelectionRange.setEnd(range.startContainer, range.startOffset)
    const start = preSelectionRange.toString().length
    const end = start + range.toString().length

    if (start !== end) {
      setContextMenu({ x: e.clientX, y: e.clientY, start, end })
    }
  }

  const handleAddAnnotation = async (labelId: string) => {
    if (contextMenu) {
      await addAnnotation(doc.id, labelId, contextMenu.start, contextMenu.end, "")
      setContextMenu(null)
      window.getSelection()?.removeAllRanges()
    }
  }

  useEffect(() => {
    const closeMenu = () => setContextMenu(null)
    window.addEventListener("click", closeMenu)
    return () => window.removeEventListener("click", closeMenu)
  }, [])

  // Helper to find a DOM Range for global text offsets
  const getRangeForOffsets = (container: Node, startOffset: number, endOffset: number): Range | null => {
    const range = document.createRange()
    let currentOffset = 0
    let startNode: Node | null = null
    let endNode: Node | null = null
    let startNodeOffset = 0
    let endNodeOffset = 0

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null)
    let node = walker.nextNode()

    while (node) {
      const nodeLength = node.nodeValue?.length || 0
      if (!startNode && currentOffset + nodeLength >= startOffset) {
        startNode = node
        startNodeOffset = startOffset - currentOffset
      }
      if (!endNode && currentOffset + nodeLength >= endOffset) {
        endNode = node
        endNodeOffset = endOffset - currentOffset
        break
      }
      currentOffset += nodeLength
      node = walker.nextNode()
    }

    if (startNode && endNode) {
      try {
        range.setStart(startNode, startNodeOffset)
        range.setEnd(endNode, endNodeOffset)
        return range
      } catch (e) {
        return null
      }
    }
    return null
  }

  useEffect(() => {
    if (!isRendered || !containerRef.current) return
    const container = containerRef.current
    const containerRect = container.getBoundingClientRect()
    
    const newHighlights: { top: number; left: number; width: number; height: number; color: string; annotationIds: string[] }[] = []
    
    annotations.forEach(ann => {
      const label = labels.find(l => l.id === ann.labelId)
      if (!label) return
      
      const range = getRangeForOffsets(container, ann.startOffset, ann.endOffset)
      if (!range) return
      
      const rects = range.getClientRects()
      for (let i = 0; i < rects.length; i++) {
        const rect = rects[i]
        newHighlights.push({
          top: rect.top - containerRect.top,
          left: rect.left - containerRect.left,
          width: rect.width,
          height: rect.height,
          color: label.color,
          annotationIds: [ann.id]
        })
      }
    })
    
    setHighlights(newHighlights)
  }, [annotations, isRendered, labels])

  useEffect(() => {
    if (!doc.pdfUrl || !containerRef.current) return

    let cancelled = false
    setIsRendered(false)
    setHighlights([])
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

          // Page wrapper — positions canvas and text layer together
          const pageDiv = document.createElement("div")
          pageDiv.style.position = "relative"
          pageDiv.style.width = `${viewport.width}px`
          pageDiv.style.margin = "0 auto 24px auto"

          // Canvas layer
          const canvas = document.createElement("canvas")
          const context = canvas.getContext("2d")
          if (!context) continue

          canvas.width = viewport.width
          canvas.height = viewport.height
          canvas.style.display = "block"
          pageDiv.appendChild(canvas)

          // Text layer div — overlays on top of the canvas
          const textLayerDiv = document.createElement("div")
          textLayerDiv.className = "textLayer"
          textLayerDiv.style.position = "absolute"
          textLayerDiv.style.top = "0"
          textLayerDiv.style.left = "0"
          textLayerDiv.style.width = `${viewport.width}px`
          textLayerDiv.style.height = `${viewport.height}px`
          pageDiv.appendChild(textLayerDiv)

          container.appendChild(pageDiv)

          // Render the canvas
          await page.render({
            canvasContext: context,
            viewport,
          }).promise

          // Render the selectable text layer
          const textContent = await page.getTextContent()
          const textLayer = new TextLayer({
            textContentSource: textContent,
            container: textLayerDiv,
            viewport,
          })
          await textLayer.render()
        }
        if (!cancelled) {
          setIsRendered(true)
        }
      } catch (e: any) {
        if (!cancelled) {
          if (doc.pdfUrl.startsWith('blob:')) {
            setError("This mock PDF is no longer available in memory after a page reload. Please upload it again or create a new document.")
          } else {
            setError("Failed to render PDF.")
          }
          // Use console.warn instead of console.error to prevent Next.js full-screen dev overlay
          console.warn("PDF rendering error:", e)
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
    return <p className="text-sm text-gray-900 mt-4">No PDF data available.</p>
  }

  if (error) {
    return <p className="text-sm text-red-500 mt-4">{error}</p>
  }

  return (
    <div 
      className="w-full h-full overflow-auto bg-gray-100 px-6 py-8"
      onContextMenu={handleContextMenu}
    >
      <div className="relative mx-auto w-max">
        <div ref={containerRef} />

        {/* Render Highlights Overlay */}
        {isRendered && highlights.map((h, i) => (
          <div
            key={i}
            className="absolute cursor-pointer transition-colors hover:brightness-95 mix-blend-multiply opacity-50"
            style={{
              top: h.top,
              left: h.left,
              width: h.width,
              height: h.height,
              backgroundColor: h.color,
              zIndex: 10
            }}
            onClick={(e) => {
              e.stopPropagation()
              if (onAnnotationClick) {
                const clickedAnns = annotations.filter(a => h.annotationIds.includes(a.id))
                onAnnotationClick(clickedAnns)
              }
            }}
          />
        ))}
      </div>

      {contextMenu && (
        <div
          className="fixed z-50 min-w-[160px] rounded-md border border-gray-200 bg-white shadow-lg py-1 text-sm"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 font-medium text-xs text-gray-500 uppercase tracking-wider">
            Add Annotation
          </div>
          {labels.length === 0 ? (
            <div className="px-3 py-2 text-gray-500 italic text-xs">No labels created yet.</div>
          ) : (
            labels.map((label) => (
              <button
                key={label.id}
                onClick={() => handleAddAnnotation(label.id)}
                className="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center gap-2"
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: label.color }} />
                <span className="truncate text-gray-900">{label.name}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
