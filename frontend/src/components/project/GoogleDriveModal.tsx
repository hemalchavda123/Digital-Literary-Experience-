"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useGoogleLogin } from "@react-oauth/google"
import { useProjects } from "@/context/ProjectContext"
import {
  DriveFile,
  listGoogleDrivePdfs,
  formatFileSize,
  extractDriveFileId,
  openGooglePicker,
} from "@/lib/googleDrive"
import {
  X,
  Search,
  FileText,
  AlertCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  Link as LinkIcon,
  FolderOpen,
  ArrowRight,
  CheckCircle2,
} from "lucide-react"

type Props = {
  isOpen: boolean
  onClose: () => void
  projectId: string
  onSuccess?: () => void
}

export function GoogleDriveIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
      <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
      <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
      <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.25z" fill="#00832d"/>
      <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.25z" fill="#2684fc"/>
      <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
    </svg>
  )
}

export function GoogleGLogo({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  )
}

export function GoogleDriveModal({ isOpen, onClose, projectId, onSuccess }: Props) {
  const router = useRouter()
  const { importGoogleDriveDocument } = useProjects()

  const [activeTab, setActiveTab] = useState<"drive" | "link">("drive")
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [files, setFiles] = useState<DriveFile[]>([])
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Link import state
  const [shareUrl, setShareUrl] = useState("")
  const [customTitle, setCustomTitle] = useState("")

  // Active importing file
  const [importingId, setImportingId] = useState<string | null>(null)
  const [importStatus, setImportStatus] = useState<string | null>(null)

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  // Reset error when switching tabs
  const handleTabChange = (tab: "drive" | "link") => {
    setActiveTab(tab)
    setError(null)
  }

  // Load files from Google Drive
  const loadFiles = async (token: string, search = "") => {
    setIsLoadingFiles(true)
    setError(null)
    try {
      const driveFiles = await listGoogleDrivePdfs(token, search)
      setFiles(driveFiles)
    } catch (err: any) {
      console.error("Failed to list Google Drive files:", err)
      const msg = err.message || "Failed to load files from Google Drive"
      if (msg.includes("Google Drive API has not been used") || msg.includes("disabled")) {
        setError(
          "The Google Drive API is not yet enabled in your Google Cloud Console project. You can enable it in Google Cloud Console or use the 'Paste Drive Link' tab to import directly!"
        )
      } else {
        setError(msg)
      }
    } finally {
      setIsLoadingFiles(false)
    }
  }

  // Google OAuth login trigger
  const triggerGoogleLogin = useGoogleLogin({
    flow: "implicit",
    scope: "https://www.googleapis.com/auth/drive.readonly",
    onSuccess: (tokenResponse) => {
      setAccessToken(tokenResponse.access_token)
      loadFiles(tokenResponse.access_token, searchQuery)
    },
    onError: (err) => {
      console.error("Google Drive Login Error:", err)
      setError("Google Drive authorization was cancelled or failed.")
    },
  })

  // Debounced search when connected
  useEffect(() => {
    if (!accessToken) return
    const timer = setTimeout(() => {
      loadFiles(accessToken, searchQuery)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Handle importing a file from Drive
  const handleImportFile = async (file: { id: string; name: string }) => {
    setImportingId(file.id)
    setImportStatus("Importing PDF from Google Drive...")
    setError(null)

    try {
      const doc = await importGoogleDriveDocument(projectId, {
        fileId: file.id,
        accessToken: accessToken || undefined,
        title: file.name.replace(/\.pdf$/i, ""),
      })

      setImportStatus("Document imported successfully!")
      if (onSuccess) onSuccess()
      onClose()
      router.push(`/document/${doc.id}`)
    } catch (err: any) {
      console.error("Failed to import Google Drive document:", err)
      setError(err.message || "Failed to import document from Google Drive")
    } finally {
      setImportingId(null)
      setImportStatus(null)
    }
  }

  // Handle importing from URL / Link
  const handleImportLink = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedUrl = shareUrl.trim()
    if (!trimmedUrl) {
      setError("Please paste a Google Drive link or file ID")
      return
    }

    const fileId = extractDriveFileId(trimmedUrl)
    if (!fileId) {
      setError("Could not find a valid Google Drive file ID in the provided link.")
      return
    }

    setImportingId("link-import")
    setImportStatus("Downloading and importing PDF from Google Drive...")
    setError(null)

    try {
      const doc = await importGoogleDriveDocument(projectId, {
        fileId,
        shareUrl: trimmedUrl,
        accessToken: accessToken || undefined,
        title: customTitle.trim() || undefined,
      })

      setImportStatus("Document imported successfully!")
      if (onSuccess) onSuccess()
      onClose()
      router.push(`/document/${doc.id}`)
    } catch (err: any) {
      console.error("Failed to import Google Drive document via link:", err)
      setError(
        err.message ||
          "Could not download file. Ensure Google Drive link is set to 'Anyone with the link can view' or connect your Google account."
      )
    } finally {
      setImportingId(null)
      setImportStatus(null)
    }
  }

  // Handle opening Google Picker if configured
  const handleOpenGooglePicker = () => {
    if (!accessToken) {
      triggerGoogleLogin()
      return
    }
    if (!apiKey) {
      setError("NEXT_PUBLIC_GOOGLE_API_KEY is not configured in your environment for Google Picker.")
      return
    }
    openGooglePicker({
      accessToken,
      apiKey,
      clientId,
      onPick: (pickedFile) => {
        handleImportFile(pickedFile)
      },
      onError: (err) => {
        setError(err.message || "Google Picker encountered an error.")
      },
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-2xl overflow-hidden flex flex-col max-h-[88vh] transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 via-white to-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white shadow-xs border border-gray-100 flex items-center justify-center">
              <GoogleDriveIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">
                Import from Google Drive
              </h2>
              <p className="text-xs text-gray-500">
                Select or paste any PDF document from your Google Drive
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-gray-100 bg-gray-50/60 px-6 pt-2">
          <button
            type="button"
            onClick={() => handleTabChange("drive")}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all ${
              activeTab === "drive"
                ? "border-[#4285F4] text-[#4285F4] bg-white rounded-t-lg shadow-xs"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <FolderOpen size={16} />
            Browse My Drive
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("link")}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all ${
              activeTab === "link"
                ? "border-[#4285F4] text-[#4285F4] bg-white rounded-t-lg shadow-xs"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <LinkIcon size={16} />
            Paste Drive Link
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 flex-1 overflow-y-auto">
          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-sm text-red-800">
              <AlertCircle size={18} className="text-red-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <span className="font-semibold block mb-0.5">Import Error</span>
                <p className="text-xs text-red-700 leading-relaxed">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-700 text-xs font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* TAB 1: Browse My Drive */}
          {activeTab === "drive" && (
            <div className="space-y-4">
              {!accessToken ? (
                /* Unauthenticated state */
                <div className="py-10 px-6 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-2xl bg-white shadow-md border border-gray-100 flex items-center justify-center mb-4">
                    <GoogleDriveIcon className="w-9 h-9" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-1">
                    Connect with Google Drive
                  </h3>
                  <p className="text-xs text-gray-500 max-w-md mb-6 leading-relaxed">
                    Sign in to your Google Account to browse and import your PDF files directly into this project. Only read-only permission is requested.
                  </p>
                  <button
                    type="button"
                    onClick={() => triggerGoogleLogin()}
                    className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-white text-gray-800 text-sm font-semibold shadow-md hover:shadow-lg border border-gray-200 hover:bg-gray-50 active:scale-98 transition-all cursor-pointer"
                  >
                    <GoogleGLogo className="w-4 h-4" />
                    <span>Sign in with Google</span>
                  </button>
                </div>
              ) : (
                /* Authenticated state with Drive File Browser */
                <div className="space-y-4">
                  {/* Status & actions bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Connected to Google Drive
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {apiKey && (
                        <button
                          type="button"
                          onClick={handleOpenGooglePicker}
                          className="text-xs font-semibold text-gray-700 hover:text-[#4285F4] bg-white border border-gray-200 hover:border-[#4285F4]/40 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                        >
                          <ExternalLink size={13} />
                          Official Drive Picker
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => loadFiles(accessToken, searchQuery)}
                        disabled={isLoadingFiles}
                        className="text-xs font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors hover:bg-gray-50"
                        title="Refresh file list"
                      >
                        <RefreshCw
                          size={12}
                          className={isLoadingFiles ? "animate-spin" : ""}
                        />
                        Refresh
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAccessToken(null)
                          setFiles([])
                        }}
                        className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1 transition-colors"
                      >
                        Switch Account
                      </button>
                    </div>
                  </div>

                  {/* Search bar */}
                  <div className="relative">
                    <Search
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      placeholder="Search PDF files in Google Drive..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9.5 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4285F4]/30 focus:border-[#4285F4] transition-all bg-gray-50/50 hover:bg-white"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* File List */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 max-h-72 overflow-y-auto bg-white shadow-2xs">
                    {isLoadingFiles ? (
                      <div className="py-12 flex flex-col items-center justify-center text-gray-400">
                        <Loader2 size={24} className="animate-spin text-[#4285F4] mb-2" />
                        <span className="text-xs font-medium">Loading PDF files from Drive...</span>
                      </div>
                    ) : files.length === 0 ? (
                      <div className="py-10 text-center px-4">
                        <FileText size={28} className="mx-auto text-gray-300 mb-2" />
                        <p className="text-sm font-semibold text-gray-700">No PDF files found</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {searchQuery
                            ? `No PDF matches "${searchQuery}". Try a different keyword.`
                            : "Upload a PDF document to your Google Drive or use the Paste Link tab."}
                        </p>
                      </div>
                    ) : (
                      files.map((file) => {
                        const isThisImporting = importingId === file.id
                        const formattedDate = file.modifiedTime
                          ? new Date(file.modifiedTime).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : null

                        return (
                          <div
                            key={file.id}
                            className="p-3.5 flex items-center justify-between gap-3 hover:bg-blue-50/40 transition-colors group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0 text-red-600">
                                <FileText size={16} />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-gray-800 truncate group-hover:text-blue-900">
                                  {file.name}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <span>{formatFileSize(file.size)}</span>
                                  {formattedDate && (
                                    <>
                                      <span>•</span>
                                      <span>{formattedDate}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleImportFile(file)}
                              disabled={Boolean(importingId)}
                              className="shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#4285F4] text-white hover:bg-blue-600 active:scale-98 transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                            >
                              {isThisImporting ? (
                                <>
                                  <Loader2 size={12} className="animate-spin" />
                                  <span>Importing...</span>
                                </>
                              ) : (
                                <>
                                  <span>Import</span>
                                  <ArrowRight size={12} />
                                </>
                              )}
                            </button>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Paste Drive Link */}
          {activeTab === "link" && (
            <form onSubmit={handleImportLink} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                  Google Drive Share Link or File ID
                </label>
                <div className="relative">
                  <LinkIcon
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    required
                    placeholder="https://drive.google.com/file/d/1BxiMVs.../view?usp=sharing"
                    value={shareUrl}
                    onChange={(e) => setShareUrl(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4285F4]/30 focus:border-[#4285F4] transition-all bg-gray-50/50 hover:bg-white"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1.5">
                  Paste any public or shared link to a PDF stored on Google Drive.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                  Document Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Literary Analysis Essay"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4285F4]/30 focus:border-[#4285F4] transition-all bg-gray-50/50 hover:bg-white"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave blank to automatically use the file name from Google Drive.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-800 flex items-start gap-2.5">
                <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Tip:</strong> In Google Drive, ensure file sharing is set to{" "}
                  <em>&quot;Anyone with the link can view&quot;</em>, or use the{" "}
                  <strong>Browse My Drive</strong> tab to authenticate directly.
                </span>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={Boolean(importingId) || !shareUrl.trim()}
                  className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-[#4285F4] text-white hover:bg-blue-600 active:scale-98 transition-all flex items-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {importingId === "link-import" ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Importing Document...</span>
                    </>
                  ) : (
                    <>
                      <span>Import PDF Document</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Global Loading Overlay */}
        {importStatus && (
          <div className="px-6 py-3 bg-blue-50 border-t border-blue-100 flex items-center justify-between text-xs font-semibold text-blue-900 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-[#4285F4]" />
              <span>{importStatus}</span>
            </div>
            <span className="text-[10px] text-blue-600 uppercase tracking-wider font-bold">
              Processing
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
