"use client"

import { useState, useEffect, useRef } from "react"
import { X, Copy, Check, UserMinus, Mail, Plus, AlertCircle, CheckCircle2 } from "lucide-react"
import { getProjectMembers, removeProjectMember, updateMemberRole, createInviteLink, updateMemberPermissions, updateDefaultPermissions, getProjectById, inviteUserById, inviteUserByEmail } from "@/lib/api/projects"
import type { ProjectMember, Role, Project } from "@/types/project"

type Props = {
  isOpen: boolean
  onClose: () => void
  projectId: string
  isOwner?: boolean
}

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

export function ShareModal({ isOpen, onClose, projectId, isOwner = false }: Props) {
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [loading, setLoading] = useState(false)
  const [inviteRole, setInviteRole] = useState<Role>("VIEWER")
  const [inviteLink, setInviteLink] = useState("")
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [defaultPermissions, setDefaultPermissions] = useState({
    canViewOthersAnnotations: false,
    canAnnotate: true,
    canViewAdminAnnotations: false
  })
  const [inviteType, setInviteType] = useState<"link" | "userId" | "email">("link")
  const [inviteUserId, setInviteUserId] = useState("")
  const [emailTags, setEmailTags] = useState<string[]>([])
  const [emailInput, setEmailInput] = useState("")
  const [invitingEmails, setInvitingEmails] = useState(false)
  const emailInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      loadMembers()
      loadDefaultPermissions()
      setInviteLink("")
      setCopied(false)
      setError("")
      setSuccessMessage("")
      setEmailTags([])
      setEmailInput("")
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
      setSuccessMessage("")
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
      setSuccessMessage("")
      if (!inviteUserId.trim()) {
        setError("User ID is required")
        return
      }
      const member = await inviteUserById(projectId, inviteUserId.trim(), inviteRole)
      setMembers(prev => [...prev, member])
      setInviteUserId("")
      setSuccessMessage("Member successfully invited!")
    } catch (err: any) {
      setError(err.message || "Failed to invite user")
    }
  }

  // --- Multi-email helpers ---

  const addEmailsFromInput = (raw: string) => {
    // Split by comma, semicolon, space, newline, or tab
    const candidates = raw.split(/[,;\s]+/).map(s => s.trim().toLowerCase()).filter(Boolean)
    const valid: string[] = []
    const invalid: string[] = []

    for (const c of candidates) {
      if (isValidEmail(c)) {
        if (!emailTags.includes(c) && !valid.includes(c)) {
          valid.push(c)
        }
      } else {
        invalid.push(c)
      }
    }

    if (valid.length) {
      setEmailTags(prev => [...prev, ...valid])
      setError("")
    }

    if (invalid.length) {
      setError(`Invalid email address: ${invalid.join(", ")}`)
    }
  }

  const handleEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === ";") {
      e.preventDefault()
      if (emailInput.trim()) {
        addEmailsFromInput(emailInput)
        setEmailInput("")
      }
    } else if (e.key === "Backspace" && !emailInput && emailTags.length > 0) {
      // Remove last tag on backspace when input is empty
      setEmailTags(prev => prev.slice(0, -1))
    }
  }

  const handleEmailPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text")
    if (pasted) {
      addEmailsFromInput(pasted)
      setEmailInput("")
    }
  }

  const removeEmailTag = (email: string) => {
    setEmailTags(prev => prev.filter(t => t !== email))
  }

  const handleInviteByEmails = async () => {
    setError("")
    setSuccessMessage("")

    // Also commit anything still typed in the input
    let allEmails = [...emailTags]
    if (emailInput.trim()) {
      const candidates = emailInput.split(/[,;\s]+/).map(s => s.trim().toLowerCase()).filter(Boolean)
      const valid = candidates.filter(c => isValidEmail(c) && !allEmails.includes(c))
      const invalid = candidates.filter(c => !isValidEmail(c))
      allEmails = [...allEmails, ...valid]
      if (invalid.length > 0) {
        setError(`Invalid email address: ${invalid.join(", ")}`)
        return
      }
    }

    if (allEmails.length === 0) {
      setError("Please enter at least one valid email address")
      return
    }

    setInvitingEmails(true)

    // Execute in parallel using Promise.allSettled
    const results = await Promise.allSettled(
      allEmails.map(async (email) => {
        const member = await inviteUserByEmail(projectId, email, inviteRole)
        return { email, member }
      })
    )

    const newMembers: ProjectMember[] = []
    const failed: { email: string; reason: string }[] = []

    results.forEach((res, index) => {
      const email = allEmails[index]
      if (res.status === "fulfilled") {
        newMembers.push(res.value.member)
      } else {
        const reason = res.reason?.message || "Failed to invite"
        failed.push({ email, reason })
      }
    })

    if (newMembers.length > 0) {
      setMembers(prev => [...prev, ...newMembers])
      setSuccessMessage(`Successfully invited ${newMembers.length} member${newMembers.length > 1 ? "s" : ""}!`)
    }

    if (failed.length > 0) {
      setError(`Could not invite: ${failed.map(f => `${f.email} (${f.reason})`).join("; ")}`)
      // Keep only failed emails in chips so the user can easily review or retry
      setEmailTags(failed.map(f => f.email))
      setEmailInput("")
    } else {
      setEmailTags([])
      setEmailInput("")
    }

    setInvitingEmails(false)
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
      
      const updatedValue = !member[permission]
      const updatedPermissions = {
        [permission]: updatedValue
      }
      
      // Optimistically update UI
      setMembers(prev => prev.map(m => m.userId === memberId ? { ...m, ...updatedPermissions } : m))
      
      await updateMemberPermissions(projectId, memberId, updatedPermissions)
    } catch (err: any) {
      setError(err.message || "Failed to update permissions")
      // Revert UI on error
      setMembers(prev => prev.map(m => {
        if (m.userId === memberId) {
          const member = members.find(orig => orig.userId === memberId)
          return member ? { ...m, [permission]: member[permission] } : m
        }
        return m
      }))
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">Share Project & Permissions</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-6 min-h-0">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100 flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 text-sm text-green-700 bg-green-50 rounded-lg border border-green-100 flex items-start gap-2">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-green-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Invite Link Section */}
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-gray-900">Invite Members</h3>
            
            {/* Invite Type Tabs */}
            <div className="flex gap-2 border-b border-gray-200">
              <button
                onClick={() => {
                  setInviteType("link")
                  setError("")
                  setSuccessMessage("")
                }}
                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${inviteType === "link" ? "border-black text-black" : "border-transparent text-gray-500 hover:text-gray-700"}`}
              >
                Shareable Link
              </button>
              <button
                onClick={() => {
                  setInviteType("userId")
                  setError("")
                  setSuccessMessage("")
                }}
                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${inviteType === "userId" ? "border-black text-black" : "border-transparent text-gray-500 hover:text-gray-700"}`}
              >
                User ID
              </button>
              <button
                onClick={() => {
                  setInviteType("email")
                  setError("")
                  setSuccessMessage("")
                }}
                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${inviteType === "email" ? "border-black text-black" : "border-transparent text-gray-500 hover:text-gray-700"}`}
              >
                Email
              </button>
            </div>

            {/* Invite Link Content */}
            {inviteType === "link" && (
              <div className="flex flex-col gap-2 pt-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-700">Role:</label>
                  <select
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value as Role)}
                    className="text-xs border border-gray-300 rounded px-2.5 py-1.5 bg-white text-gray-800 focus:outline-none focus:border-black"
                  >
                    <option value="VIEWER">Viewer</option>
                    <option value="EDITOR">Editor</option>
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
                    className="text-xs border border-gray-300 rounded px-2.5 py-1.5 bg-white text-gray-800 focus:outline-none focus:border-black"
                  >
                    <option value="VIEWER">Viewer</option>
                    <option value="EDITOR">Editor</option>
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
              <div className="flex flex-col gap-3 pt-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Enter one or multiple email addresses:</span>
                  {emailTags.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setEmailTags([])
                        setEmailInput("")
                        setError("")
                      }}
                      className="text-gray-400 hover:text-red-600 text-xs transition-colors"
                    >
                      Clear all ({emailTags.length})
                    </button>
                  )}
                </div>

                {/* Multi-email chip input container */}
                <div
                  onClick={() => emailInputRef.current?.focus()}
                  className="min-h-[96px] max-h-48 overflow-y-auto p-2 bg-white border border-gray-300 rounded-lg focus-within:border-black focus-within:ring-1 focus-within:ring-black cursor-text flex flex-wrap gap-1.5 items-start content-start transition-all"
                >
                  {emailTags.map(email => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md text-xs font-medium transition-colors"
                    >
                      <Mail size={12} className="text-gray-500 shrink-0" />
                      <span className="truncate max-w-[220px]">{email}</span>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation()
                          removeEmailTag(email)
                        }}
                        className="text-gray-400 hover:text-gray-700 p-0.5 rounded-full hover:bg-gray-300 transition-colors"
                        title={`Remove ${email}`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  <input
                    ref={emailInputRef}
                    type="text"
                    value={emailInput}
                    onChange={e => {
                      setError("")
                      setEmailInput(e.target.value)
                    }}
                    onKeyDown={handleEmailKeyDown}
                    onPaste={handleEmailPaste}
                    onBlur={() => {
                      if (emailInput.trim()) {
                        addEmailsFromInput(emailInput)
                        setEmailInput("")
                      }
                    }}
                    placeholder={
                      emailTags.length === 0
                        ? "Type or paste emails separated by commas, spaces, or Enter..."
                        : "Add another email..."
                    }
                    className="flex-1 min-w-[180px] border-none outline-none text-sm text-gray-900 bg-transparent py-1 px-1 placeholder:text-gray-400"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-500">
                  <span>
                    Separate with <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-200 rounded text-gray-700 font-mono">Enter</kbd>, <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-200 rounded text-gray-700 font-mono">,</kbd> or <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-200 rounded text-gray-700 font-mono">space</kbd>
                  </span>
                  {emailInput.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        addEmailsFromInput(emailInput)
                        setEmailInput("")
                      }}
                      className="text-xs text-black font-medium hover:underline flex items-center gap-1"
                    >
                      <Plus size={12} /> Add
                    </button>
                  )}
                </div>

                {/* Role selection & Invite button */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-1">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-gray-700">Role:</label>
                    <select
                      value={inviteRole}
                      onChange={e => setInviteRole(e.target.value as Role)}
                      className="text-xs border border-gray-300 rounded px-2.5 py-1.5 bg-white text-gray-800 focus:outline-none focus:border-black"
                    >
                      <option value="VIEWER">Viewer</option>
                      <option value="EDITOR">Editor</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    disabled={invitingEmails || (emailTags.length === 0 && !emailInput.trim())}
                    onClick={handleInviteByEmails}
                    className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors shadow-sm"
                  >
                    {invitingEmails ? (
                      <>
                        <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Inviting...</span>
                      </>
                    ) : (
                      <span>
                        {emailTags.length > 1
                          ? `Invite All (${emailTags.length})`
                          : emailTags.length === 1
                          ? "Invite (1)"
                          : "Invite"}
                      </span>
                    )}
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
                <ul className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
                  {members.map(member => (
                    <li key={member.id} className="p-3 rounded border border-gray-200 bg-white">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">{member.user?.username || "Unknown"}</span>
                          <span className="text-xs text-gray-500">{member.user?.email || ""}</span>
                        </div>
                        {isOwner && (
                          <button
                            onClick={() => handleRemoveMember(member.userId)}
                            className="p-1 text-gray-400 hover:text-red-600"
                            title="Remove member"
                          >
                            <UserMinus size={16} />
                          </button>
                        )}
                      </div>
                      {isOwner && (
                        <div className="flex flex-col gap-2 pl-2 border-l-2 border-gray-100">
                          <div className="flex items-center justify-between">
                            <label className="text-xs text-gray-600">Can view others' annotations</label>
                            <button
                              onClick={() => handlePermissionToggle(member.userId, 'canViewOthersAnnotations')}
                              className={`w-10 h-5 rounded-full transition-colors ${member.canViewOthersAnnotations ? 'bg-black' : 'bg-gray-300'} relative`}
                            >
                              <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${member.canViewOthersAnnotations ? 'translate-x-5' : 'translate-x-0.5'}`} />
                            </button>
                          </div>
                          <div className="flex items-center justify-between">
                            <label className="text-xs text-gray-600">Can annotate</label>
                            <button
                              onClick={() => handlePermissionToggle(member.userId, 'canAnnotate')}
                              className={`w-10 h-5 rounded-full transition-colors ${member.canAnnotate ? 'bg-black' : 'bg-gray-300'} relative`}
                            >
                              <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${member.canAnnotate ? 'translate-x-5' : 'translate-x-0.5'}`} />
                            </button>
                          </div>
                          <div className="flex items-center justify-between">
                            <label className="text-xs text-gray-600">Can view admin annotations</label>
                            <button
                              onClick={() => handlePermissionToggle(member.userId, 'canViewAdminAnnotations')}
                              className={`w-10 h-5 rounded-full transition-colors ${member.canViewAdminAnnotations ? 'bg-black' : 'bg-gray-300'} relative`}
                            >
                              <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${member.canViewAdminAnnotations ? 'translate-x-5' : 'translate-x-0.5'}`} />
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
