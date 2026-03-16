"use client"

import { useEffect, useRef, useState } from "react"

type Props = {
  initialContent: string
  onChange: (content: string) => void
}

export function DocumentEditor({ initialContent, onChange }: Props) {
  const [value, setValue] = useState(initialContent)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setValue(initialContent)
  }, [initialContent])

  const handleInput = () => {
    const next = ref.current?.innerText ?? ""
    setValue(next)
    onChange(next)
  }

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className="min-h-[50vh] w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-black"
      onInput={handleInput}
    >
      {value}
    </div>
  )
}

