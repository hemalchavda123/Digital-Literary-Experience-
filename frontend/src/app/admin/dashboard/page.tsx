"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  fetchAdminStats,
  fetchAdminProjects,
  fetchAdminUsers,
  updateProjectAccessRules,
  updateUserSystemRole,
  updatePlatformSetting,
  AdminStats,
  AdminProject,
  AdminUser,
} from "@/lib/api/admin"
import {
  ShieldCheck,
  Crown,
  Users,
  FolderLock,
  LogOut,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Sliders,
  X,
  ArrowLeft,
  Check,
} from "lucide-react"

export default function AdminDashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [projects, setProjects] = useState<AdminProject[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Active Tab: 'projects' | 'users' (Superadmin) | 'settings' (Superadmin)
  const [activeTab, setActiveTab] = useState<"projects" | "users" | "settings">("projects")

  // Search & Filter
  const [projectSearch, setProjectSearch] = useState("")
  const [userSearch, setUserSearch] = useState("")

  // Edit Project Access Rules Modal
  const [editingProject, setEditingProject] = useState<AdminProject | null>(null)
  const [emailPatternInput, setEmailPatternInput] = useState("")
  const [savingPattern, setSavingPattern] = useState(false)

  // Platform setting update
  const [platformPatternInput, setPlatformPatternInput] = useState("")
  const [savingPlatform, setSavingPlatform] = useState(false)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const statsData = await fetchAdminStats()
      setStats(statsData)
      setPlatformPatternInput(statsData.platformEmailPattern || "")

      const projectsData = await fetchAdminProjects()
      setProjects(projectsData)

      if (statsData.isSuperAdmin) {
        const usersData = await fetchAdminUsers()
        setUsers(usersData)
      }
    } catch (err: any) {
      if (
        err.message?.includes("Forbidden") ||
        err.message?.includes("Access denied") ||
        err.message?.includes("Invalid or missing token")
      ) {
        router.push("/admin/login")
        return
      }
      setError(err.message || "Failed to load admin dashboard")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSaveProjectPattern = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProject) return
    setSavingPattern(true)
    try {
      const updated = await updateProjectAccessRules(editingProject.id, emailPatternInput.trim() || null)
      setProjects((prev) =>
        prev.map((p) => (p.id === editingProject.id ? { ...p, allowedEmailPatterns: updated.allowedEmailPatterns } : p))
      )
      setEditingProject(null)
    } catch (err: any) {
      alert(err.message || "Failed to update project pattern")
    } finally {
      setSavingPattern(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: "USER" | "ADMIN" | "SUPERADMIN") => {
    try {
      await updateUserSystemRole(userId, newRole)
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, systemRole: newRole } : u)))
      // refresh stats
      const newStats = await fetchAdminStats()
      setStats(newStats)
    } catch (err: any) {
      alert(err.message || "Failed to change user role")
    }
  }

  const handleSavePlatformPattern = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingPlatform(true)
    try {
      await updatePlatformSetting("PLATFORM_ALLOWED_EMAIL_PATTERNS", platformPatternInput.trim())
      setStats((prev) => (prev ? { ...prev, platformEmailPattern: platformPatternInput.trim() || null } : null))
      alert("Platform-wide login email restriction updated successfully.")
    } catch (err: any) {
      alert(err.message || "Failed to save platform restriction")
    } finally {
      setSavingPlatform(false)
    }
  }

  const handleLogout = () => {
    document.cookie = "accessToken=; path=/; max-age=0;"
    document.cookie = "refreshToken=; path=/; max-age=0;"
    router.push("/admin/login")
  }

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
      p.owner?.email.toLowerCase().includes(projectSearch.toLowerCase()) ||
      p.owner?.username.toLowerCase().includes(projectSearch.toLowerCase())
  )

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.username.toLowerCase().includes(userSearch.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-white text-stone-900 flex flex-col font-sans">
      {/* Top Navigation Header */}
      <header className="border-b border-stone-200 bg-white/95 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#a17038] text-white flex items-center justify-center shadow-xs">
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-stone-900 tracking-tight">Admin Console</h1>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                  stats?.isSuperAdmin
                    ? "bg-[#faf6ee] text-[#845624] border-[#ebdcc8]"
                    : "bg-blue-50 text-blue-700 border-blue-200"
                }`}
              >
                {stats?.isSuperAdmin ? "Superadmin" : "Admin"}
              </span>
            </div>
            <p className="text-[11px] text-stone-500">Control center for project access &amp; administrators</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/home"
            className="px-3 py-1.5 text-xs font-semibold text-stone-700 hover:text-stone-900 hover:bg-stone-100 border border-stone-200 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Back to Exegesis</span>
          </Link>
          <button
            onClick={loadData}
            className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors border border-stone-200"
            title="Refresh dashboard"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2 shadow-xs">
            <AlertTriangle size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-stone-200 rounded-2xl p-5 flex items-center justify-between shadow-xs hover:border-[#a17038]/30 transition-all">
            <div>
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                {stats?.isSuperAdmin ? "Total Users" : "Designated Users"}
              </span>
              <span className="text-2xl font-black text-stone-900 mt-1 block">
                {loading ? "..." : stats?.totalUsers || 0}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Users size={20} />
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-2xl p-5 flex items-center justify-between shadow-xs hover:border-[#a17038]/30 transition-all">
            <div>
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                Superadmins
              </span>
              <span className="text-2xl font-black text-[#a17038] mt-1 block">
                {loading ? "..." : stats?.totalSuperAdmins || 0}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#faf6ee] text-[#845624] flex items-center justify-center border border-[#ebdcc8]">
              <Crown size={20} />
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-2xl p-5 flex items-center justify-between shadow-xs hover:border-[#a17038]/30 transition-all">
            <div>
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                Designated Admins
              </span>
              <span className="text-2xl font-black text-[#a17038] mt-1 block">
                {loading ? "..." : stats?.totalAdmins || 0}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#a17038]/10 text-[#a17038] flex items-center justify-center border border-[#a17038]/20">
              <ShieldCheck size={20} />
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-2xl p-5 flex items-center justify-between shadow-xs hover:border-[#a17038]/30 transition-all">
            <div>
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                {stats?.isSuperAdmin ? "All Projects" : "Managed Projects"}
              </span>
              <span className="text-2xl font-black text-stone-900 mt-1 block">
                {loading ? "..." : stats?.totalProjects || 0}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <FolderLock size={20} />
            </div>
          </div>
        </div>

        {/* Tab Navigation with Clear Superadmin Separation */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Project Access Rules - Available to Admins & Superadmins */}
            <button
              onClick={() => setActiveTab("projects")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                activeTab === "projects"
                  ? "bg-[#a17038] text-white shadow-xs"
                  : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
              }`}
            >
              <FolderLock size={15} />
              <span>Project Access Rules</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  activeTab === "projects" ? "bg-white/20 text-white" : "bg-stone-100 text-stone-600"
                }`}
              >
                {projects.length}
              </span>
            </button>

            {/* Superadmin Dedicated Section Separator */}
            {stats?.isSuperAdmin && (
              <>
                <div className="h-5 w-px bg-stone-300 mx-2 hidden sm:block" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#a17038] bg-[#faf6ee] px-2 py-1 rounded-md border border-[#ebdcc8]">
                  Superadmin Only
                </span>

                <button
                  onClick={() => setActiveTab("users")}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                    activeTab === "users"
                      ? "bg-[#a17038] text-white shadow-xs"
                      : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                  }`}
                >
                  <Users size={15} />
                  <span>User Role Management</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      activeTab === "users" ? "bg-white/20 text-white" : "bg-stone-100 text-stone-600"
                    }`}
                  >
                    {users.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab("settings")}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                    activeTab === "settings"
                      ? "bg-[#a17038] text-white shadow-xs"
                      : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                  }`}
                >
                  <Globe size={15} />
                  <span>Platform Restrictions</span>
                  {stats?.platformEmailPattern ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] text-stone-400">
                      Open
                    </span>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tab 1: Project Access Control (Admin restrictions) */}
        {activeTab === "projects" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-stone-900">Project Access Rules</h2>
                <p className="text-xs text-stone-500">
                  Restrict entry to your project so only users with designated email patterns can join.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-2.5 text-stone-400" />
                <input
                  type="text"
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  placeholder="Filter projects..."
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#a17038] shadow-xs"
                />
              </div>
            </div>

            <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50/70 border-b border-stone-200 text-stone-600 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Project Name</th>
                    <th className="py-3.5 px-4">Owner</th>
                    <th className="py-3.5 px-4">Allowed Email Pattern(s)</th>
                    <th className="py-3.5 px-4 text-center">Members</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredProjects.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-stone-400">
                        No projects found.
                      </td>
                    </tr>
                  ) : (
                    filteredProjects.map((proj) => (
                      <tr key={proj.id} className="hover:bg-stone-50/40 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-stone-900">{proj.name}</td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-stone-800 block">{proj.owner?.username}</span>
                          <span className="text-[10px] text-stone-400 block truncate max-w-xs">
                            {proj.owner?.email}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {proj.allowedEmailPatterns ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#faf6ee] text-[#845624] border border-[#ebdcc8] font-mono">
                              <ShieldCheck size={12} className="text-[#a17038]" />
                              {proj.allowedEmailPatterns}
                            </span>
                          ) : (
                            <span className="text-stone-400 italic text-[11px]">Unrestricted (Any authenticated user)</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center text-stone-700 font-semibold">
                          {proj._count?.members || 1}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => {
                              setEditingProject(proj)
                              setEmailPatternInput(proj.allowedEmailPatterns || "")
                            }}
                            className="px-3 py-1.5 bg-[#a17038] hover:bg-[#8c5f2b] text-white rounded-lg font-medium text-xs transition-colors shadow-xs inline-flex items-center gap-1.5"
                          >
                            <Sliders size={12} />
                            <span>Configure Pattern</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Superadmin User Role Management */}
        {activeTab === "users" && stats?.isSuperAdmin && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-stone-900">User Role Management</h2>
                <p className="text-xs text-stone-500">
                  Assign or revoke Administrator status. Only Superadmins have permission to modify roles.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-2.5 text-stone-400" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Filter users..."
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#a17038] shadow-xs"
                />
              </div>
            </div>

            <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50/70 border-b border-stone-200 text-stone-600 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">User</th>
                    <th className="py-3.5 px-4">Email Address</th>
                    <th className="py-3.5 px-4 text-center">Current Role</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Assign Designated Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-stone-400">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const isDesignatedSuper =
                        user.email === "202301131@dau.ac.in" || user.email === "202301451@dau.ac.in"

                      return (
                        <tr key={user.id} className="hover:bg-stone-50/40 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-stone-900 flex items-center gap-2">
                            {user.systemRole === "SUPERADMIN" && <Crown size={14} className="text-[#a17038]" />}
                            {user.systemRole === "ADMIN" && <ShieldCheck size={14} className="text-blue-600" />}
                            <span>{user.username}</span>
                          </td>
                          <td className="py-3.5 px-4 text-stone-600 font-mono text-[11px]">{user.email}</td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                user.systemRole === "SUPERADMIN"
                                  ? "bg-[#faf6ee] text-[#845624] border-[#ebdcc8]"
                                  : user.systemRole === "ADMIN"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-stone-100 text-stone-600 border-stone-200"
                              }`}
                            >
                              {user.systemRole}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {user.isVerified ? (
                              <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold text-[10px] inline-flex items-center gap-1">
                                <CheckCircle2 size={11} /> Verified
                              </span>
                            ) : (
                              <span className="text-stone-400 text-[10px]">Unverified</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {isDesignatedSuper ? (
                              <span className="text-[10px] text-[#845624] font-bold bg-[#faf6ee] px-2.5 py-1 rounded-md border border-[#ebdcc8]">
                                Permanent Superadmin
                              </span>
                            ) : (
                              <select
                                value={user.systemRole}
                                onChange={(e) =>
                                  handleRoleChange(user.id, e.target.value as "USER" | "ADMIN" | "SUPERADMIN")
                                }
                                className="bg-white border border-stone-300 rounded-lg px-2.5 py-1 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#a17038] cursor-pointer shadow-xs"
                              >
                                <option value="USER">User</option>
                                <option value="ADMIN">Admin</option>
                                <option value="SUPERADMIN">Superadmin</option>
                              </select>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Superadmin Platform Restrictions Displayed Separately */}
        {activeTab === "settings" && stats?.isSuperAdmin && (
          <div className="space-y-6 max-w-3xl">
            {/* Header Description */}
            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#faf6ee] text-[#a17038] flex items-center justify-center border border-[#ebdcc8]">
                    <Globe size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-stone-900">Platform-Wide Email Restrictions</h2>
                    <p className="text-xs text-stone-500">Superadmin global sign-in &amp; registration policy</p>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                    stats?.platformEmailPattern
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-emerald-50 text-emerald-800 border-emerald-200"
                  }`}
                >
                  {stats?.platformEmailPattern ? "Policy Active" : "Unrestricted"}
                </span>
              </div>

              <p className="text-xs text-stone-600 leading-relaxed">
                Configure a mandatory platform-wide email policy. When active, only users matching this pattern can
                register or sign in on the entire platform. This applies globally across all projects.
              </p>

              {/* Current Active Status Card */}
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                  Current Platform Policy
                </span>
                {stats?.platformEmailPattern ? (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-[#845624] bg-[#faf6ee] border border-[#ebdcc8] px-3 py-1 rounded-lg">
                      {stats.platformEmailPattern}
                    </span>
                    <span className="text-xs text-stone-500">Only matching emails can access the platform.</span>
                  </div>
                ) : (
                  <span className="text-xs text-stone-500 italic">
                    No global restriction configured. Users from any email domain may sign in.
                  </span>
                )}
              </div>

              {/* Policy Edit Form */}
              <form onSubmit={handleSavePlatformPattern} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1.5 uppercase tracking-wider">
                    Allowed Email Pattern(s)
                  </label>
                  <input
                    type="text"
                    value={platformPatternInput}
                    onChange={(e) => setPlatformPatternInput(e.target.value)}
                    placeholder="Enter platform allowed pattern..."
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#a17038]/30 focus:border-[#a17038] font-mono shadow-xs"
                  />
                  <p className="text-[11px] text-stone-500 mt-1.5">
                    Leave blank to allow any email domain. Multiple patterns can be separated by commas.
                  </p>
                </div>

                <div className="p-3 bg-[#faf6ee] border border-[#ebdcc8] rounded-xl text-xs text-[#845624] flex items-start gap-2">
                  <Check size={15} className="flex-shrink-0 mt-0.5 text-[#a17038]" />
                  <span>Superadmins are permanently exempt from email restrictions.</span>
                </div>

                <button
                  type="submit"
                  disabled={savingPlatform}
                  className="px-5 py-2.5 bg-[#a17038] hover:bg-[#8c5f2b] text-white rounded-xl font-bold text-xs shadow-xs transition-all disabled:opacity-50"
                >
                  {savingPlatform ? "Saving Policy..." : "Update Platform Policy"}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Edit Project Allowed Email Patterns Modal */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-xl relative">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-[#a17038] uppercase tracking-widest block mb-0.5">
                  Access Control
                </span>
                <h3 className="text-lg font-bold text-stone-900">Configure Project Email Pattern</h3>
                <p className="text-xs text-stone-500 mt-0.5">{editingProject.name}</p>
              </div>
              <button
                onClick={() => setEditingProject(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProjectPattern} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5 uppercase tracking-wider">
                  Allowed Email Pattern
                </label>
                <input
                  type="text"
                  value={emailPatternInput}
                  onChange={(e) => setEmailPatternInput(e.target.value)}
                  placeholder="Enter allowed email pattern..."
                  className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#a17038]/30 focus:border-[#a17038] font-mono shadow-xs"
                />
                <p className="text-xs text-stone-500 mt-2 leading-relaxed">
                  Users will only be allowed to join or access this project if their email matches this pattern. Leave blank
                  to allow any authenticated user.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-medium text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPattern}
                  className="px-5 py-2 bg-[#a17038] hover:bg-[#8c5f2b] text-white rounded-xl font-bold text-xs transition-colors shadow-xs disabled:opacity-50"
                >
                  {savingPattern ? "Saving..." : "Save Access Pattern"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
