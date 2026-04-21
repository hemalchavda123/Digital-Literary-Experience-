"use client"

import { useState, useEffect } from "react"
import { X, Copy, Check, UserMinus } from "lucide-react"
import { getProjectMembers, removeProjectMember, updateMemberRole, createInviteLink, updateMemberPermissions, updateDefaultPermissions, getProjectById, inviteUserById, inviteUserByEmail } from "@/lib/api/projects"
import type { ProjectMember, Role, Project } from "@/types/project"

type Props = {
  isOpen: boolean
  onClose: () => void
  projectId: string
  isOwner?: boolean
}

export function ShareModal({ isOpen, onClose, projectId, isOwner = false }: Props) {
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [loading, setLoading] = useState(false)
  const [inviteRole, setInviteRole] = useState<Role>("VIEWER")
  const [inviteLink, setInviteLink] = useState("")
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")
  const [selectedMemberId, setSelectedMemberId] = useState<string>("")
  const [defaultPermissions, setDefaultPermissions] = useState({
    canViewOthersAnnotations: false,
    canAnnotate: true,
    canViewAdminAnnotations: false
  })
  const [inviteType, setInviteType] = useState<"link" | "userId" | "email">("link")
  const [inviteUserId, setInviteUserId] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")

  useEffect(() => {
    if (isOpen) {
      loadMembers()
      loadDefaultPermissions()
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

  const loadDefaultPermissions = async () => {
    try {
      const project = await getProjectById(projectId) as any
      setDefaultPermissions({
        canViewOthersAnnotations: project.defaultCanViewAnnotations ?? false,
        canAnnotate: project.defaultCanAnnotate ?? true,
        canViewAdminAnnotations: project.defaultCanViewAdminAnnotations ?? false
      })
    } catch (err) {
      console.error("Failed to load default permissions:", err)
    }
  }

  const handleDefaultPermissionToggle = async (permission: keyof typeof defaultPermissions) => {
    try {
      const newPermissions = {
        ...defaultPermissions,
        [permission]: !defaultPermissions[permission]
      }
      setDefaultPermissions(newPermissions)
      await updateDefaultPermissions(projectId, {
        defaultCanViewAnnotations: newPermissions.canViewOthersAnnotations,
        defaultCanAnnotate: newPermissions.canAnnotate,
        defaultCanViewAdminAnnotations: newPermissions.canViewAdminAnnotations
      })
    } catch (err: any) {
      setError(err.message || "Failed to update default permissions")
      // Revert on error
      setDefaultPermissions(prev => ({ ...prev, [permission]: !prev[permission] }))
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

  const handleInviteById = async () => {
    try {
      setError("")
      if (!inviteUserId.trim()) {
        setError("User ID is required")
        return
      }
      const member = await inviteUserById(projectId, inviteUserId.trim(), inviteRole)
      setMembers(prev => [...prev, member])
      setInviteUserId("")
      setInviteType("link")
    } catch (err: any) {
      setError(err.message || "Failed to invite user")
    }
  }

  const handleInviteByEmail = async () => {
    try {
      setError("")
      if (!inviteEmail.trim()) {
        setError("Email is required")
        return
      }
      const member = await inviteUserByEmail(projectId, inviteEmail.trim(), inviteRole)
      setMembers(prev => [...prev, member])
      setInviteEmail("")
      setInviteType("link")
    } catch (err: any) {
      setError(err.message || "Failed to invite user")
    }
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

  const handlePermissionToggle = async (memberId: string, permission: keyof Pick<ProjectMember, 'canViewOthersAnnotations' | 'canAnnotate' | 'canViewAdminAnnotations'>) => {
    try {
      const member = members.find(m => m.userId === memberId)
      if (!member) return
      
      const updatedPermissions = {
        [permission]: !member[permission]
      }
      
      await updateMemberPermissions(projectId, memberId, updatedPermissions)
      setMembers(prev => prev.map(m => m.userId === memberId ? { ...m, ...updatedPermissions } : m))
    } catch (err: any) {
      setError(err.message || "Failed to update permissions")
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
            <h3 className="text-sm font-medium text-gray-900">Invite Members</h3>
            
            {/* Invite Type Tabs */}
            <div className="flex gap-2 border-b border-gray-200">
              <button
                onClick={() => setInviteType("link")}
                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${inviteType === "link" ? "border-black text-black" : "border-transparent text-gray-500 hover:text-gray-700"}`}
              >
                Shareable Link
              </button>
              <button
                onClick={() => setInviteType("userId")}
                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${inviteType === "userId" ? "border-black text-black" : "border-transparent text-gray-500 hover:text-gray-700"}`}
              >
                User ID
              </button>
              <button
                onClick={() => setInviteType("email")}
                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${inviteType === "email" ? "border-black text-black" : "border-transparent text-gray-500 hover:text-gray-700"}`}
              >
                Email
              </button>
            </div>

            {/* Invite Link Content */}
            {inviteType === "link" && (
              <div className="flex flex-col gap-2 pt-2">
                <div className="flex gap-2">
                  <select
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value as Role)}
                    className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-black"
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
                      className="flex-1 bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none"
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
            )}

            {/* Invite by User ID Content */}
            {inviteType === "userId" && (
              <div className="flex flex-col gap-2 pt-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inviteUserId}
                    onChange={e => setInviteUserId(e.target.value)}
                    placeholder="Enter user ID"
                    className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-black"
                  />
                  <select
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value as Role)}
                    className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-black"
                  >
                    <option value="VIEWER">Can View</option>
                    <option value="EDITOR">Can Edit</option>
                  </select>
                  <button
                    onClick={handleInviteById}
                    className="px-4 py-2 bg-black text-white text-sm font-medium rounded hover:bg-gray-800"
                  >
                    Invite
                  </button>
                </div>
              </div>
            )}

            {/* Invite by Email Content */}
            {inviteType === "email" && (
              <div className="flex flex-col gap-2 pt-2">
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-black"
                  />
                  <select
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value as Role)}
                    className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-black"
                  >
                    <option value="VIEWER">Can View</option>
                    <option value="EDITOR">Can Edit</option>
                  </select>
                  <button
                    onClick={handleInviteByEmail}
                    className="px-4 py-2 bg-black text-white text-sm font-medium rounded hover:bg-gray-800"
                  >
                    Invite
                  </button>
                </div>
              </div>
            )}
          </div>

          <hr className="border-gray-200" />

          {/* Project Permissions */}
          {isOwner && (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-medium text-gray-900">Default Permissions (New Members)</h3>
              <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded border border-gray-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-600">Can view others' annotations</label>
                  <button
                    onClick={() => handleDefaultPermissionToggle('canViewOthersAnnotations')}
                    className={`w-10 h-5 rounded-full transition-colors ${defaultPermissions.canViewOthersAnnotations ? 'bg-black' : 'bg-gray-300'} relative`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${defaultPermissions.canViewOthersAnnotations ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-600">Can annotate</label>
                  <button
                    onClick={() => handleDefaultPermissionToggle('canAnnotate')}
                    className={`w-10 h-5 rounded-full transition-colors ${defaultPermissions.canAnnotate ? 'bg-black' : 'bg-gray-300'} relative`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${defaultPermissions.canAnnotate ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-600">Can view admin annotations</label>
                  <button
                    onClick={() => handleDefaultPermissionToggle('canViewAdminAnnotations')}
                    className={`w-10 h-5 rounded-full transition-colors ${defaultPermissions.canViewAdminAnnotations ? 'bg-black' : 'bg-gray-300'} relative`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${defaultPermissions.canViewAdminAnnotations ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </div>
            </div>
          )}

          <hr className="border-gray-200" />

          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-medium text-gray-900">Project Members</h3>
            {loading ? (
              <p className="text-sm text-gray-500">Loading members...</p>
            ) : members.length === 0 ? (
              <p className="text-sm text-gray-500">No members yet. Share a link to invite others.</p>
            ) : (
              <>
                {isOwner && (
                  <select
                    value={selectedMemberId}
                    onChange={e => setSelectedMemberId(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-black"
                  >
                    <option value="">Select a member to edit permissions</option>
                    {members.map(member => (
                      <option key={member.id} value={member.userId}>
                        {member.user?.username || "Unknown"} ({member.role})
                      </option>
                    ))}
                  </select>
                )}

                <ul className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                  {members.map(member => (
                    <li key={member.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded border border-gray-100">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{member.user?.username || "Unknown"}</span>
                        <span className="text-xs text-gray-500">{member.user?.email || ""}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={member.role}
                          onChange={e => handleRoleChange(member.userId, e.target.value as Role)}
                          className="text-xs border border-gray-300 rounded px-2 py-1 text-gray-700 font-medium focus:outline-none focus:border-black cursor-pointer"
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

                {isOwner && selectedMemberId && (
                  <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded border border-gray-200 mt-2">
                    <h4 className="text-xs font-medium text-gray-900">
                      {members.find(m => m.userId === selectedMemberId)?.user?.username}'s Permissions
                    </h4>
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-gray-600">Can view others' annotations</label>
                      <button
                        onClick={() => handlePermissionToggle(selectedMemberId, 'canViewOthersAnnotations')}
                        className={`w-10 h-5 rounded-full transition-colors ${members.find(m => m.userId === selectedMemberId)?.canViewOthersAnnotations ? 'bg-black' : 'bg-gray-300'} relative`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${members.find(m => m.userId === selectedMemberId)?.canViewOthersAnnotations ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-gray-600">Can annotate</label>
                      <button
                        onClick={() => handlePermissionToggle(selectedMemberId, 'canAnnotate')}
                        className={`w-10 h-5 rounded-full transition-colors ${members.find(m => m.userId === selectedMemberId)?.canAnnotate ? 'bg-black' : 'bg-gray-300'} relative`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${members.find(m => m.userId === selectedMemberId)?.canAnnotate ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-gray-600">Can view admin annotations</label>
                      <button
                        onClick={() => handlePermissionToggle(selectedMemberId, 'canViewAdminAnnotations')}
                        className={`w-10 h-5 rounded-full transition-colors ${members.find(m => m.userId === selectedMemberId)?.canViewAdminAnnotations ? 'bg-black' : 'bg-gray-300'} relative`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${members.find(m => m.userId === selectedMemberId)?.canViewAdminAnnotations ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
