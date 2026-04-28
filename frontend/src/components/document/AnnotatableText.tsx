"use client"

import { useState, useRef, useEffect } from "react"
import { TextAnnotation } from "@/types/annotation"
import { useAnnotations } from "@/context/AnnotationContext"

type Props = {
  text: string
  docId: string
  onAnnotationClick: (annotations: TextAnnotation[]) => void
  filteredAnnotations?: TextAnnotation[]
}

type Segment = {
  text: string
  annotations: TextAnnotation[]
  startOffset: number
  endOffset: number
}

function stableAnnotationSort(a: TextAnnotation, b: TextAnnotation) {
  const ca = a.createdAt ?? ""
  const cb = b.createdAt ?? ""
  if (ca !== cb) return ca.localeCompare(cb)
  return a.id.localeCompare(b.id)
}

function buildStripedBackground(colors: string[]) {
  const unique = Array.from(new Set(colors)).filter(Boolean)
  const max = 5
  const used = unique.slice(0, max)
  const extra = unique.length - used.length

  const finalColors = extra > 0 ? [...used.slice(0, Math.max(1, used.length - 1)), "#e5e7eb"] : used
  if (finalColors.length === 1) return finalColors[0]

  const step = 100 / finalColors.length
  const stops = finalColors
    .map((c, idx) => {
      const from = idx * step
      const to = (idx + 1) * step
      return `${c} ${from}%, ${c} ${to}%`
    })
    .join(", ")

  return `linear-gradient(90deg, ${stops})`
}

export function AnnotatableText({ text, docId, onAnnotationClick, filteredAnnotations }: Props) {
  const { annotations: contextAnnotations, labels, addAnnotation } = useAnnotations()
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; start: number; end: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Use filtered annotations if provided, otherwise use all annotations from context
  const annotations = filteredAnnotations || contextAnnotations

  // Segment the text to handle overlapping annotations
  const segments = (): Segment[] => {
    if (!text) return []
    const charAnns: TextAnnotation[][] = Array.from({ length: text.length }, () => [])
    
    const ordered = [...annotations].sort(stableAnnotationSort)
    ordered.forEach((ann) => {
      // Validate offsets
      const start = Math.max(0, ann.startOffset)
      const end = Math.min(text.length, ann.endOffset)
      for (let i = start; i < end; i++) {
        charAnns[i].push(ann)
      }
    })

    const result: Segment[] = []
    let currentAnns = charAnns[0]
    let currentText = text[0]
    let currentStart = 0

    for (let i = 1; i < text.length; i++) {
      const anns = charAnns[i]
      // Compare current annotations with previous
      const isSame =
        anns.length === currentAnns.length &&
        anns.every((a, idx) => a.id === currentAnns[idx].id)

      if (isSame) {
        currentText += text[i]
      } else {
        result.push({
          text: currentText,
          annotations: currentAnns,
          startOffset: currentStart,
          endOffset: i,
        })
        currentAnns = anns
        currentText = text[i]
        currentStart = i
      }
    }
    if (currentText) {
      result.push({
        text: currentText,
        annotations: currentAnns,
        startOffset: currentStart,
        endOffset: text.length,
      })
    }
    return result
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) {
      setContextMenu(null)
      return
    }

    if (!containerRef.current?.contains(selection.anchorNode)) return

    // Calculate exact start and end offsets across segments
    // This requires finding where the nodes are in our text.
    // A simpler way: string search if it"s unique, or walk DOM.
    // Let"s walk DOM to find absolute offset.
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
      await addAnnotation(docId, labelId, start, end, "")
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

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        onContextMenu={handleContextMenu}
        className="whitespace-pre-wrap leading-relaxed text-gray-900"
      >
        {segments().map((seg, i) => {
          if (seg.annotations.length === 0) {
            return <span key={i}>{seg.text}</span>
          }

          const colors = seg.annotations
            .map((ann) => labels.find((l) => l.id === ann.labelId)?.color)
            .filter((c): c is string => !!c)

          const style =
            colors.length <= 1
              ? { backgroundColor: colors[0] || "#fbbf24" }
              : { backgroundImage: buildStripedBackground(colors) }

          return (
            <span
              key={i}
              onClick={(e) => {
                e.stopPropagation()
                if (e.shiftKey) {
                  onAnnotationClick(seg.annotations)
                }
              }}
              className="cursor-pointer transition-colors hover:brightness-95"
              style={style}
            >
              {seg.text}
            </span>
          )
        })}
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
