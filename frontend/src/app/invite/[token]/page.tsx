"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { joinProjectViaLink } from "@/lib/api/projects"

export default function InvitePage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [errorMsg, setErrorMsg] = useState("")
  const [projectId, setProjectId] = useState("")

  useEffect(() => {
    async function join() {
      try {
        const token = params.token
        if (!token) throw new Error("No token provided")

        const result = await joinProjectViaLink(token)
        setProjectId(result.projectId)
        setStatus("success")
      } catch (err: any) {
        // If not authenticated, the fetch layer might redirect to login.
        // If it throws an error here, it's either an invalid token, expired, or already owner.
        setErrorMsg(err.message || "Failed to join project. The link may be invalid or expired.")
        setStatus("error")
      }
    }
    join()
  }, [params.token])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Processing invite...</p>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="bg-white p-8 rounded-lg shadow-sm max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-red-600 mb-4">Invite Failed</h2>
          <p className="text-gray-700 mb-6">{errorMsg}</p>
          <button
            onClick={() => router.push("/home")}
            className="px-4 py-2 bg-black text-white rounded font-medium hover:bg-gray-800"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-lg shadow-sm max-w-md w-full text-center">
        <h2 className="text-xl font-bold text-green-600 mb-4">Successfully Joined!</h2>
        <p className="text-gray-700 mb-6">You have been added to the project.</p>
        <button
          onClick={() => router.push(`/project/${projectId}`)}
          className="px-4 py-2 bg-black text-white rounded font-medium hover:bg-gray-800"
        >
          View Project
        </button>
      </div>
    </div>
  )
}
