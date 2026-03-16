"use client"

type Props = {
  onBold?: () => void
  onItalic?: () => void
}

export function EditorToolbar({ onBold, onItalic }: Props) {
  return (
    <div className="mb-3 flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs">
      <button
        type="button"
        onClick={onBold}
        className="rounded px-2 py-1 font-medium hover:bg-gray-200"
      >
        Bold
      </button>
      <button
        type="button"
        onClick={onItalic}
        className="rounded px-2 py-1 italic hover:bg-gray-200"
      >
        Italic
      </button>
    </div>
  )
}

