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
  ExternalLink,
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
    <div className="min-h-screen bg-gray-50/70 text-gray-900 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="border-b border-gray-200 bg-white/95 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#a17038] text-white flex items-center justify-center shadow-sm">
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-gray-900 tracking-tight">Admin Console</h1>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                  stats?.isSuperAdmin
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : "bg-[#a17038]/10 text-[#a17038] border-[#a17038]/20"
                }`}
              >
                {stats?.isSuperAdmin ? "Superadmin" : "Admin"}
              </span>
            </div>
            <p className="text-[11px] text-gray-500">Control center for project access & designated administrators</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/home"
            className="px-3 py-1.5 text-xs font-semibold text-gray-700 hover:text-black hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Back to Exegesis</span>
          </Link>
          <button
            onClick={loadData}
            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
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

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2 shadow-xs">
            <AlertTriangle size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                {stats?.isSuperAdmin ? "Total Platform Users" : "Designated Users"}
              </span>
              <span className="text-2xl font-black text-gray-900 mt-1 block">
                {loading ? "..." : stats?.totalUsers || 0}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Users size={20} />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                Superadmins
              </span>
              <span className="text-2xl font-black text-[#a17038] mt-1 block">
                {loading ? "..." : stats?.totalSuperAdmins || 0}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100">
              <Crown size={20} />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
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

          <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                {stats?.isSuperAdmin ? "All Projects" : "Managed Projects"}
              </span>
              <span className="text-2xl font-black text-gray-900 mt-1 block">
                {loading ? "..." : stats?.totalProjects || 0}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <FolderLock size={20} />
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
          <button
            onClick={() => setActiveTab("projects")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "projects"
                ? "bg-[#a17038] text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <FolderLock size={15} />
            <span>Project Access Rules</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                activeTab === "projects" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
              }`}
            >
              {projects.length}
            </span>
          </button>

          {stats?.isSuperAdmin && (
            <>
              <button
                onClick={() => setActiveTab("users")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === "users"
                    ? "bg-[#a17038] text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <Users size={15} />
                <span>Superadmin: Users &amp; Roles</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    activeTab === "users" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {users.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("settings")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === "settings"
                    ? "bg-[#a17038] text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <Globe size={15} />
                <span>Superadmin: Platform Restrictions</span>
              </button>
            </>
          )}
        </div>

        {/* Tab 1: Project Access Control (Admins & Superadmins) */}
        {activeTab === "projects" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-gray-900">Project Email Login &amp; Join Control</h2>
                <p className="text-xs text-gray-500">
                  Restrict entry to your project so only students with designated email patterns (e.g.{" "}
                  <code className="text-[#a17038] font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    2023*@dau.ac.in
                  </code>
                  ) can join.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  placeholder="Filter projects..."
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#a17038] shadow-xs"
                />
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Project Name</th>
                    <th className="py-3.5 px-4">Owner</th>
                    <th className="py-3.5 px-4">Allowed Email Pattern(s)</th>
                    <th className="py-3.5 px-4 text-center">Members</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProjects.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-gray-400">
                        No projects found.
                      </td>
                    </tr>
                  ) : (
                    filteredProjects.map((proj) => (
                      <tr key={proj.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-gray-900">{proj.name}</td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-gray-800 block">{proj.owner?.username}</span>
                          <span className="text-[10px] text-gray-400 block truncate max-w-xs">
                            {proj.owner?.email}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {proj.allowedEmailPatterns ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 font-mono">
                              <ShieldCheck size={12} className="text-[#a17038]" />
                              {proj.allowedEmailPatterns}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic text-[11px]">Unrestricted (Any authenticated user)</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center text-gray-700 font-semibold">
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
                <h2 className="text-base font-bold text-gray-900">System Users &amp; Designated Admin Roles</h2>
                <p className="text-xs text-gray-500">
                  Assign or revoke Administrator status. Only Superadmins have permission to modify roles.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Filter users..."
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#a17038] shadow-xs"
                />
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">User</th>
                    <th className="py-3.5 px-4">Email Address</th>
                    <th className="py-3.5 px-4 text-center">Current Role</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Assign Designated Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-gray-400">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const isDesignatedSuper =
                        user.email === "202301131@dau.ac.in" || user.email === "202301451@dau.ac.in"

                      return (
                        <tr key={user.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-gray-900 flex items-center gap-2">
                            {user.systemRole === "SUPERADMIN" && <Crown size={14} className="text-[#a17038]" />}
                            {user.systemRole === "ADMIN" && <ShieldCheck size={14} className="text-blue-600" />}
                            <span>{user.username}</span>
                          </td>
                          <td className="py-3.5 px-4 text-gray-600 font-mono text-[11px]">{user.email}</td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                user.systemRole === "SUPERADMIN"
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : user.systemRole === "ADMIN"
                                  ? "bg-blue-50 text-blue-800 border-blue-200"
                                  : "bg-gray-100 text-gray-600 border-gray-200"
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
                              <span className="text-gray-400 text-[10px]">Unverified</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {isDesignatedSuper ? (
                              <span className="text-[10px] text-amber-900 font-bold bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                                Permanent Superadmin
                              </span>
                            ) : (
                              <select
                                value={user.systemRole}
                                onChange={(e) =>
                                  handleRoleChange(user.id, e.target.value as "USER" | "ADMIN" | "SUPERADMIN")
                                }
                                className="bg-white border border-gray-300 rounded-lg px-2.5 py-1 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#a17038] cursor-pointer shadow-xs"
                              >
                                <option value="USER">User (Normal student)</option>
                                <option value="ADMIN">Admin (Project Admin)</option>
                                <option value="SUPERADMIN">Superadmin (Global Admin)</option>
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

        {/* Tab 3: Superadmin Platform-Wide Restrictions */}
        {activeTab === "settings" && stats?.isSuperAdmin && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6 max-w-2xl shadow-xs">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Globe size={18} className="text-[#a17038]" />
                <span>Platform-Wide Email Login Restrictions</span>
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Configure a mandatory platform-wide email policy. If enabled, only emails matching this pattern can
                register or sign in on the entire platform.
              </p>
            </div>

            <form onSubmit={handleSavePlatformPattern} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                  Allowed Email Pattern(s)
                </label>
                <input
                  type="text"
                  value={platformPatternInput}
                  onChange={(e) => setPlatformPatternInput(e.target.value)}
                  placeholder="e.g. *@dau.ac.in, *@*.dau.ac.in"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#a17038]/30 focus:border-[#a17038] font-mono shadow-xs"
                />
                <p className="text-[11px] text-gray-500 mt-1.5">
                  Leave blank to allow any email domain. Multiple patterns can be separated by commas.
                </p>
              </div>

              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle size={15} className="flex-shrink-0 mt-0.5 text-amber-700" />
                <span>
                  Superadmins (<code className="font-bold">202301131@dau.ac.in</code> &amp;{" "}
                  <code className="font-bold">202301451@dau.ac.in</code>) are permanently exempt from email blocks.
                </span>
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
        )}
      </main>

      {/* Edit Project Allowed Email Patterns Modal */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl relative">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-[#a17038] uppercase tracking-widest block mb-0.5">
                  Access Control
                </span>
                <h3 className="text-lg font-bold text-gray-900">Configure Project Email Pattern</h3>
                <p className="text-xs text-gray-500 mt-0.5">{editingProject.name}</p>
              </div>
              <button
                onClick={() => setEditingProject(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProjectPattern} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                  Allowed Email Pattern
                </label>
                <input
                  type="text"
                  value={emailPatternInput}
                  onChange={(e) => setEmailPatternInput(e.target.value)}
                  placeholder="e.g. 2023*@dau.ac.in"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#a17038]/30 focus:border-[#a17038] font-mono shadow-xs"
                />
              </div>

              {/* Live Pattern Matching Preview */}
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2 text-xs">
                <span className="font-semibold text-gray-600 block text-[11px] uppercase tracking-wider">
                  Pattern Behavior Preview:
                </span>
                <div className="space-y-1 font-mono text-[11px]">
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-gray-700">202301131@dau.ac.in</span>
                    <span className="text-emerald-700 font-bold">Allowed</span>
                  </div>
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-gray-700">202301451@dau.ac.in</span>
                    <span className="text-emerald-700 font-bold">Allowed</span>
                  </div>
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-gray-700">202401001@dau.ac.in</span>
                    <span
                      className={
                        emailPatternInput.includes("2023*")
                          ? "text-rose-600 font-bold"
                          : "text-emerald-700 font-bold"
                      }
                    >
                      {emailPatternInput.includes("2023*") ? "Blocked" : "Allowed"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-gray-700">student@gmail.com</span>
                    <span className={emailPatternInput ? "text-rose-600 font-bold" : "text-emerald-700 font-bold"}>
                      {emailPatternInput ? "Blocked" : "Allowed"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium text-xs transition-colors"
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
