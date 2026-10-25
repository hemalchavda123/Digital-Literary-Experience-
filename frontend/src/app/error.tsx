"use client"

import { useEffect } from "react"
import { AlertCircle, RefreshCw } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Global application error:", error)

    // Check if error is a chunk loading failure (caused by a new deployment or network issue)
    const isChunkError =
      error?.name === "ChunkLoadError" ||
      error?.message?.includes("Failed to load chunk") ||
      error?.message?.includes("Loading chunk") ||
      error?.message?.includes("Loading failed for the <script>")

    if (isChunkError && typeof window !== "undefined") {
      const reloadKey = "chunk_load_auto_reload"
      const lastReload = sessionStorage.getItem(reloadKey)
      const now = Date.now()

      // Automatically reload once if not attempted in the last 15 seconds
      if (!lastReload || now - Number(lastReload) > 15000) {
        sessionStorage.setItem(reloadKey, String(now))
        window.location.reload()
      }
    }
  }, [error])

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-sm text-gray-600 mb-6">
          {error?.name === "ChunkLoadError" || error?.message?.includes("chunk")
            ? "A new version of the app was deployed or a resource failed to load. Please refresh the page."
            : error?.message || "An unexpected error occurred while loading this page."}
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition-colors shadow-sm"
          >
            <RefreshCw size={16} />
            Reload Page
          </button>
          <button
            type="button"
            onClick={() => reset()}
            className="w-full px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  )
}
