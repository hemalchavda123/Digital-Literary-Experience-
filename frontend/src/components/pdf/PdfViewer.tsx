"use client"

import { useEffect, useRef, useState } from "react"
import type { Document as AppDocument } from "@/types/document"
import { TextAnnotation } from "@/types/annotation"
import { useAnnotations } from "@/context/AnnotationContext"
import * as pdfjsLib from "pdfjs-dist"
import { TextLayer } from "pdfjs-dist"
import "pdfjs-dist/web/pdf_viewer.css"
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'

type Props = {
  doc: AppDocument
  onAnnotationClick?: (annotations: TextAnnotation[]) => void
  onTextContentChange?: (text: string) => void
  filteredAnnotations?: TextAnnotation[]
  containerRef?: React.RefObject<HTMLDivElement | null>
  hoveredAnnotationId?: string | null
}

pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`

type HighlightBox = {
  top: number
  left: number
  width: number
  height: number
  annotationIds: string[]
}

function rectsOverlap(a: HighlightBox, b: HighlightBox, eps = 1.5) {
  const ax2 = a.left + a.width
  const ay2 = a.top + a.height
  const bx2 = b.left + b.width
  const by2 = b.top + b.height
  return !(ax2 < b.left - eps || bx2 < a.left - eps || ay2 < b.top - eps || by2 < a.top - eps)
}

function mergeBoxes(a: HighlightBox, b: HighlightBox): HighlightBox {
  const left = Math.min(a.left, b.left)
  const top = Math.min(a.top, b.top)
  const right = Math.max(a.left + a.width, b.left + b.width)
  const bottom = Math.max(a.top + a.height, b.top + b.height)
  const ids = Array.from(new Set([...a.annotationIds, ...b.annotationIds]))
  return { left, top, width: right - left, height: bottom - top, annotationIds: ids }
}

function buildStripedBackground(colors: string[]) {
  if (colors.length === 0) return { backgroundColor: "#fbbf24", opacity: 0.5 }
  const step = 100 / colors.length
  const stops = colors.map((c, idx) => {
    const from = idx * step
    const to = (idx + 1) * step
    return `${c} ${from}%, ${c} ${to}%`
  })
    .join(", ")
  return { backgroundImage: `linear-gradient(90deg, ${stops})` }
}

const extractTextContent = (node: Node): string => {
  // Use the same TreeWalker approach as getRangeForOffsets
  // to ensure text extraction matches offset calculation
  let text = ''
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null)
  let textNode = walker.nextNode()
  while (textNode) {
    text += textNode.nodeValue || ''
    textNode = walker.nextNode()
  }
  return text
}

export function PdfViewer({ doc, onAnnotationClick, onTextContentChange, filteredAnnotations, containerRef: externalContainerRef, hoveredAnnotationId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const setContainerRef = (node: HTMLDivElement | null) => {
    containerRef.current = node
    if (externalContainerRef) {
      (externalContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = node
    }
  }
  const [error, setError] = useState<string | null>(null)
  const [isRendered, setIsRendered] = useState(false)
  const [naturalPdfWidth, setNaturalPdfWidth] = useState(0)
  const { annotations: contextAnnotations, labels, addAnnotation } = useAnnotations()
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; start: number; end: number } | null>(null)
  const [highlights, setHighlights] = useState<HighlightBox[]>([])
  const [zoom, setZoom] = useState(1.3)
  const [zoomInput, setZoomInput] = useState(Math.round(1.3 * 100).toString())

  const annotations = filteredAnnotations || contextAnnotations

  const handleZoomChange = (value: string) => {
    setZoomInput(value)
    const numValue = parseFloat(value)
    if (!isNaN(numValue)) {
      const newZoom = Math.max(0.6, Math.min(3, numValue / 100))
      setZoom(newZoom)
    }
  }

  const handleZoomBlur = () => {
    const numValue = parseFloat(zoomInput)
    if (!isNaN(numValue)) {
      const clamped = Math.max(60, Math.min(300, numValue))
      setZoomInput(clamped.toString())
      setZoom(clamped / 100)
    } else {
      setZoomInput(Math.round(zoom * 100).toString())
    }
  }

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
      const { start, end } = contextMenu
      setContextMenu(null)
      window.getSelection()?.removeAllRanges()
      await addAnnotation(doc.id, labelId, start, end, "")
    }
  }

  useEffect(() => {
    const closeMenu = (e: MouseEvent) => {
      if (e.shiftKey) return
      setContextMenu(null)
    }
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
    
    const raw: HighlightBox[] = []
    
    annotations.forEach(ann => {
      const label = labels.find(l => l.id === ann.labelId)
      if (!label) return
      
      const range = getRangeForOffsets(container, ann.startOffset, ann.endOffset)
      if (!range) return
      
      const rects = range.getClientRects()
      for (let i = 0; i < rects.length; i++) {
        const rect = rects[i]
        raw.push({
          top: (rect.top - containerRect.top) / zoom,
          left: (rect.left - containerRect.left) / zoom,
          width: rect.width / zoom,
          height: rect.height / zoom,
          annotationIds: [ann.id]
        })
      }
    })

    // Merge overlapping boxes so clicking an overlap selects all annotations.
    const merged: HighlightBox[] = []
    for (const box of raw) {
      let didMerge = false
      for (let i = 0; i < merged.length; i++) {
        if (rectsOverlap(merged[i], box)) {
          merged[i] = mergeBoxes(merged[i], box)
          didMerge = true
          break
        }
      }
      if (!didMerge) merged.push(box)
    }

    setHighlights(merged)
  }, [annotations, isRendered, labels, zoom])

  useEffect(() => {
    if (!doc.pdfUrl || !containerRef.current) return

    let cancelled = false
    setIsRendered(false)
    setHighlights([])
    const container = containerRef.current
    container.innerHTML = ''

    const render = async () => {
      try {
        // Handle base64 data URLs (from database storage)
        let loadingTask;
        if (doc.pdfUrl!.startsWith("data:")) {
          // Extract base64 data from the data URL
          const base64 = doc.pdfUrl!.split(",")[1]
          const binaryString = atob(base64)
          const bytes = new Uint8Array(binaryString.length)
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
          }
          loadingTask = pdfjsLib.getDocument({ data: bytes })
        } else {
          loadingTask = pdfjsLib.getDocument(doc.pdfUrl!)
        }
        const pdf = await loadingTask.promise

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancelled) break
          const page = await pdf.getPage(pageNum)
          const viewport = page.getViewport({ scale: 1.5 })

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
            canvas
          }).promise

          // Render the selectable text layer
          const textContent = await page.getTextContent()
          const textLayer = new TextLayer({
            textContentSource: textContent,
            container: textLayerDiv,
            viewport,
          })
          textLayer.render()
        }
        setIsRendered(true)
        // Capture the natural PDF width for zoom calculations
        if (containerRef.current) {
          setNaturalPdfWidth(containerRef.current.offsetWidth)
        }
        // Extract text from the same container used by getRangeForOffsets
        // This ensures text extraction matches offset calculation exactly
        if (containerRef.current && onTextContentChange) {
          const text = extractTextContent(containerRef.current)
          onTextContentChange(text)
        }
      } catch (err) {
        if (!cancelled) {
          if (doc.pdfUrl && doc.pdfUrl.startsWith('blob:')) {
            setError("This mock PDF is no longer available in memory after a page reload. Please upload it again or create a new document.")
          } else {
            // Use console.warn instead of console.error to prevent Next.js full-screen dev overlay
            console.warn("PDF rendering error:", err)
          }
        }
      }
    }

    render()

    return () => {
      cancelled = true
      if (containerRef.current) {
        while (containerRef.current.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild)
        }
      }
    }
  }, [doc.id])

  if (!doc.pdfUrl) {
    return <p className="text-sm text-gray-900 mt-4">No PDF data available.</p>
  }

  if (error) {
    return <p className="text-sm text-red-500 mt-4">{error}</p>
  }

  const handleContainerMouseDown = (e: React.MouseEvent) => {
    if (!onAnnotationClick || !containerRef.current) return
    
    const wrapper = containerRef.current.parentElement as HTMLElement
    const wrapperRect = wrapper.getBoundingClientRect()
    const scrollContainer = wrapper.closest('.overflow-auto') as HTMLElement
    const scrollTop = scrollContainer ? scrollContainer.scrollTop : 0
    const scrollLeft = scrollContainer ? scrollContainer.scrollLeft : 0
    
    const x = e.clientX - wrapperRect.left + scrollLeft
    const y = e.clientY - wrapperRect.top + scrollTop
    
    // Collect all annotations from all highlight boxes that contain the click
    const clickedAnnotationIds = new Set<string>()
    for (const h of highlights) {
      if (x >= h.left && x <= h.left + h.width && y >= h.top && y <= h.top + h.height) {
        h.annotationIds.forEach(id => clickedAnnotationIds.add(id))
      }
    }
    
    if (clickedAnnotationIds.size > 0) {
      e.stopPropagation()
      const clickedAnns = annotations.filter(a => clickedAnnotationIds.has(a.id))
      onAnnotationClick(clickedAnns)
    }
  }

  return (
    <div 
      className="w-full h-full bg-white"
      onContextMenu={handleContextMenu}
      onMouseDown={handleContainerMouseDown}
    >
      <style>{`
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none !important;
          margin: 0 !important;
        }
        input[type="number"] {
          -moz-appearance: textfield !important;
        }
      `}</style>
      {/* Zoom Controls */}
      <div className="fixed bottom-6 right-6 flex items-center gap-2 bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-50">
        <button
          onClick={() => {
            const newZoom = Math.max(0.6, zoom - 0.1)
            setZoom(newZoom)
            setZoomInput(Math.round(newZoom * 100).toString())
          }}
          className="p-2 hover:bg-gray-100 rounded text-gray-700"
          title="Zoom Out"
        >
          <ZoomOut size={18} />
        </button>
        <input
          type="number"
          min="60"
          max="300"
          autoComplete="off"
          value={zoomInput}
          onChange={(e) => handleZoomChange(e.target.value)}
          onBlur={handleZoomBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleZoomBlur()
              e.currentTarget.blur()
            }
          }}
          className="w-16 text-xs font-medium text-gray-700 text-center border border-gray-300 rounded px-2 py-1"
          style={{
            WebkitAppearance: 'none',
            MozAppearance: 'textfield',
            appearance: 'none'
          }}
        />
        <span className="text-xs font-medium text-gray-700">%</span>
        <button
          onClick={() => {
            const newZoom = Math.min(3, zoom + 0.1)
            setZoom(newZoom)
            setZoomInput(Math.round(newZoom * 100).toString())
          }}
          className="p-2 hover:bg-gray-100 rounded text-gray-700"
          title="Zoom In"
        >
          <ZoomIn size={18} />
        </button>
        <button
          onClick={() => {
            setZoom(1.3)
            setZoomInput("130")
          }}
          className="p-2 hover:bg-gray-100 rounded text-gray-700"
          title="Reset Zoom"
        >
          <RotateCcw size={18} />
        </button>
      </div>

      <div className="w-full">
        <div 
          className="relative mx-auto w-max" 
          style={{ 
            transform: `scale(${zoom})`, 
            transformOrigin: 'top center'
          }}
        >
          <div ref={setContainerRef} />

        {/* Render Highlights Overlay - inside transformed div */}
        {isRendered && highlights.map((h, i) => {
          const isHovered = h.annotationIds.includes(hoveredAnnotationId || '')
          return (
            <div
              key={i}
              className={`absolute transition-colors hover:brightness-95 mix-blend-multiply ${isHovered ? 'opacity-100 border-2 border-black' : 'opacity-50'}`}
              style={{
                top: h.top,
                left: h.left,
                width: h.width,
                height: h.height,
                ...(buildStripedBackground(
                  h.annotationIds
                    .map((id) => annotations.find((a) => a.id === id))
                    .map((a) => labels.find((l) => l.id === a?.labelId)?.color)
                    .filter((c): c is string => !!c)
                )),
                zIndex: 10,
                cursor: 'pointer'
              }}
              onClick={() => {
                const clickedAnns = annotations.filter(a => h.annotationIds.includes(a.id))
                onAnnotationClick?.(clickedAnns)
              }}
            />
          )
        })}
        </div>
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
