"use client"

import { useState } from "react"
import { useAnnotations } from "@/context/AnnotationContext"
import { X, Plus, Trash2 } from "lucide-react"

type Props = {
  projectId: string
  onClose: () => void
}

const COLORS = [
  "#f87171", // red-400
  "#fb923c", // orange-400
  "#fbbf24", // amber-400
  "#34d399", // emerald-400
  "#60a5fa", // blue-400
  "#a78bfa", // violet-400
  "#f472b6", // pink-400
  "#94a3b8", // slate-400
]

export function LabelManagerModal({ projectId, onClose }: Props) {
  const { labels, addLabel, removeLabel } = useAnnotations()
  const [isCreating, setIsCreating] = useState(false)
  const [newLabelName, setNewLabelName] = useState("")
  const [newLabelColor, setNewLabelColor] = useState(COLORS[0])

  const handleCreate = async () => {
    if (!newLabelName.trim()) return
    await addLabel(projectId, newLabelName.trim(), newLabelColor)
    setIsCreating(false)
    setNewLabelName("")
  }

  const handleDelete = async (id: string) => {
    const confirm = window.confirm("Delete this label? This will not delete existing annotations using it, but they will show as Unknown Label.")
    if (confirm) {
      await removeLabel(id)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Manage Labels</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto max-h-[60vh]">
          {labels.length === 0 ? (
            <p className="text-sm text-gray-500 mb-4">No labels have been created for this project yet.</p>
          ) : (
            <div className="space-y-3 mb-6">
              {labels.map(label => (
                <div key={label.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: label.color }} />
                    <span className="text-sm font-medium text-gray-900">{label.name}</span>
                  </div>
                  <button onClick={() => handleDelete(label.id)} className="text-gray-400 hover:text-red-600 p-1">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {isCreating ? (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-3">New Label</h3>
              <input
                type="text"
                placeholder="Label Name"
                value={newLabelName}
                onChange={e => setNewLabelName(e.target.value)}
                className="w-full mb-3 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                autoFocus
              />
              <div className="flex flex-wrap gap-2 mb-4">
                {COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewLabelColor(color)}
                    className={`w-6 h-6 rounded-full border-2 ${newLabelColor === color ? "border-gray-900" : "border-transparent"}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setIsCreating(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded-md">
                  Cancel
                </button>
                <button onClick={handleCreate} className="px-3 py-1.5 text-sm bg-black text-white hover:bg-gray-800 rounded-md font-medium">
                  Create Label
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-colors"
            >
              <Plus size={16} /> Add New Label
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
