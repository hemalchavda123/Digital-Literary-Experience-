"use client"

import { useState, useEffect } from "react"
import { X, Copy, Check, UserMinus } from "lucide-react"
import { getProjectMembers, removeProjectMember, updateMemberRole, createInviteLink } from "@/lib/api/projects"
import type { ProjectMember, Role } from "@/types/project"

type Props = {
  isOpen: boolean
  onClose: () => void
  projectId: string
}

export function ShareModal({ isOpen, onClose, projectId }: Props) {
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [loading, setLoading] = useState(false)
  const [inviteRole, setInviteRole] = useState<Role>("VIEWER")
  const [inviteLink, setInviteLink] = useState("")
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (isOpen) {
      loadMembers()
      setInviteLink("")
      setCopied(false)
    }
  }, [isOpen, projectId])

  const loadMembers = async () => {
    try {
      setLoading(true)
      const data = await getProjectMembers(projectId)
      setMembers(data)
    } catch (err: any) {
      setError(err.message || "Failed to load members")
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateLink = async () => {
    try {
      setError("")
      const { token } = await createInviteLink(projectId, inviteRole)
      // Construct full URL
      const url = `${window.location.origin}/invite/${token}`
      setInviteLink(url)
    } catch (err: any) {
      setError(err.message || "Failed to generate link")
    }
  }

  const handleCopy = () => {
    if (!inviteLink) return
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRemoveMember = async (memberId: string) => {
    try {
      await removeProjectMember(projectId, memberId)
      setMembers(prev => prev.filter(m => m.userId !== memberId))
    } catch (err: any) {
      setError(err.message || "Failed to remove member")
    }
  }

  const handleRoleChange = async (memberId: string, role: Role) => {
    try {
      await updateMemberRole(projectId, memberId, role)
      setMembers(prev => prev.map(m => m.userId === memberId ? { ...m, role } : m))
    } catch (err: any) {
      setError(err.message || "Failed to update role")
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Share Project</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded border border-red-100">
              {error}
            </div>
          )}

          {/* Invite Link Section */}
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-gray-900">Generate Shareable Link</h3>
            <div className="flex gap-2">
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as Role)}
                className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-black"
              >
                <option value="VIEWER">Can View</option>
                <option value="EDITOR">Can Edit</option>
              </select>
              <button
                onClick={handleGenerateLink}
                className="px-4 py-2 bg-black text-white text-sm font-medium rounded hover:bg-gray-800"
              >
                Generate Link
              </button>
            </div>
            {inviteLink && (
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteLink}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-700 focus:outline-none"
                />
                <button
                  onClick={handleCopy}
                  className="p-2 border border-gray-300 rounded hover:bg-gray-50"
                  title="Copy link"
                >
                  {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-gray-600" />}
                </button>
              </div>
            )}
          </div>

          <hr className="border-gray-200" />

          {/* Members List */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-medium text-gray-900">Project Members</h3>
            {loading ? (
              <p className="text-sm text-gray-500">Loading members...</p>
            ) : members.length === 0 ? (
              <p className="text-sm text-gray-500">No members yet. Share a link to invite others.</p>
            ) : (
              <ul className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                {members.map(member => (
                  <li key={member.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded border border-gray-100">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">{member.user?.username || "Unknown"}</span>
                      <span className="text-xs text-gray-500">{member.user?.email || ""}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={member.role}
                        onChange={e => handleRoleChange(member.userId, e.target.value as Role)}
                        className="text-xs border-none bg-transparent text-gray-700 font-medium focus:outline-none cursor-pointer"
                      >
                        <option value="VIEWER">Viewer</option>
                        <option value="EDITOR">Editor</option>
                      </select>
                      <button
                        onClick={() => handleRemoveMember(member.userId)}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Remove member"
                      >
                        <UserMinus size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
