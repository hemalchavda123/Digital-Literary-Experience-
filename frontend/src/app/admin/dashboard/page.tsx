"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
  FileCheck2,
  Settings,
  LogOut,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Sliders,
  X,
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
      if (err.message?.includes("Forbidden") || err.message?.includes("Access denied") || err.message?.includes("Invalid or missing token")) {
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center shadow-md">
            <ShieldCheck size={22} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-white tracking-tight">Admin Console</h1>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  stats?.isSuperAdmin
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                }`}
              >
                {stats?.isSuperAdmin ? "Superadmin" : "Admin"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Control center for project access & designated administrators</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Refresh dashboard"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 text-xs font-semibold text-rose-400 hover:text-white hover:bg-rose-600/20 border border-rose-500/20 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                {stats?.isSuperAdmin ? "Total Platform Users" : "Designated Users"}
              </span>
              <span className="text-2xl font-black text-white mt-1 block">
                {loading ? "..." : stats?.totalUsers || 0}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Users size={20} />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Superadmins
              </span>
              <span className="text-2xl font-black text-amber-400 mt-1 block">
                {loading ? "..." : stats?.totalSuperAdmins || 0}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Crown size={20} />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Designated Admins
              </span>
              <span className="text-2xl font-black text-indigo-400 mt-1 block">
                {loading ? "..." : stats?.totalAdmins || 0}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                {stats?.isSuperAdmin ? "All Projects" : "Managed Projects"}
              </span>
              <span className="text-2xl font-black text-white mt-1 block">
                {loading ? "..." : stats?.totalProjects || 0}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <FolderLock size={20} />
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab("projects")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "projects"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <FolderLock size={15} />
            <span>Project Access Rules</span>
            <span className="bg-black/20 px-2 py-0.5 rounded-full text-[10px]">{projects.length}</span>
          </button>

          {stats?.isSuperAdmin && (
            <>
              <button
                onClick={() => setActiveTab("users")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === "users"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                <Users size={15} />
                <span>Superadmin: User & Role Management</span>
                <span className="bg-black/20 px-2 py-0.5 rounded-full text-[10px]">{users.length}</span>
              </button>

              <button
                onClick={() => setActiveTab("settings")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === "settings"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                <Globe size={15} />
                <span>Superadmin: Platform-Wide Restrictions</span>
              </button>
            </>
          )}
        </div>

        {/* Tab 1: Project Access Control (Admins & Superadmins) */}
        {activeTab === "projects" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-white">Project Email Login & Join Control</h2>
                <p className="text-xs text-slate-400">
                  Restrict entry to your project so only students with designated email patterns (e.g.{" "}
                  <code className="text-amber-400 bg-slate-900 px-1 py-0.5 rounded">2023*@dau.ac.in</code>) can join.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  placeholder="Filter projects..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Project Name</th>
                    <th className="py-3 px-4">Owner</th>
                    <th className="py-3 px-4">Allowed Email Pattern(s)</th>
                    <th className="py-3 px-4 text-center">Members</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredProjects.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500">
                        No projects found.
                      </td>
                    </tr>
                  ) : (
                    filteredProjects.map((proj) => (
                      <tr key={proj.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-white">{proj.name}</td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-300 block">{proj.owner?.username}</span>
                          <span className="text-[10px] text-slate-500 block truncate max-w-xs">
                            {proj.owner?.email}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {proj.allowedEmailPatterns ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                              <ShieldCheck size={12} />
                              {proj.allowedEmailPatterns}
                            </span>
                          ) : (
                            <span className="text-slate-500 italic text-[11px]">Unrestricted (Any authenticated user)</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center text-slate-300 font-semibold">
                          {proj._count?.members || 1}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setEditingProject(proj)
                              setEmailPatternInput(proj.allowedEmailPatterns || "")
                            }}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold text-xs transition-colors shadow-sm inline-flex items-center gap-1.5"
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
                <h2 className="text-base font-bold text-white">System Users & Designated Admin Roles</h2>
                <p className="text-xs text-slate-400">
                  Assign or revoke Administrator status. Only Superadmins have permission to modify roles.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Filter users..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Email Address</th>
                    <th className="py-3 px-4 text-center">Current Role</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Assign Designated Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const isDesignatedSuper =
                        user.email === "202301131@dau.ac.in" || user.email === "202301451@dau.ac.in"

                      return (
                        <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                            {user.systemRole === "SUPERADMIN" && <Crown size={14} className="text-amber-400" />}
                            {user.systemRole === "ADMIN" && <ShieldCheck size={14} className="text-indigo-400" />}
                            <span>{user.username}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">{user.email}</td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                user.systemRole === "SUPERADMIN"
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                  : user.systemRole === "ADMIN"
                                  ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                                  : "bg-slate-800 text-slate-400 border-slate-700"
                              }`}
                            >
                              {user.systemRole}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {user.isVerified ? (
                              <span className="text-emerald-400 font-semibold text-[10px] flex items-center justify-center gap-1">
                                <CheckCircle2 size={11} /> Verified
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[10px]">Unverified</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isDesignatedSuper ? (
                              <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                                Permanent Superadmin
                              </span>
                            ) : (
                              <select
                                value={user.systemRole}
                                onChange={(e) =>
                                  handleRoleChange(user.id, e.target.value as "USER" | "ADMIN" | "SUPERADMIN")
                                }
                                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 max-w-2xl">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Globe size={18} className="text-indigo-400" />
                <span>Platform-Wide Email Login Restrictions</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Configure a mandatory platform-wide email policy. If enabled, only emails matching this pattern can
                register or sign in on the entire platform.
              </p>
            </div>

            <form onSubmit={handleSavePlatformPattern} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Allowed Email Pattern(s)
                </label>
                <input
                  type="text"
                  value={platformPatternInput}
                  onChange={(e) => setPlatformPatternInput(e.target.value)}
                  placeholder="e.g. *@dau.ac.in, *@*.dau.ac.in"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Leave blank to allow any email domain. Multiple patterns can be separated by commas.
                </p>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-start gap-2">
                <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
                <span>
                  Superadmins (<code className="font-bold">202301131@dau.ac.in</code> &{" "}
                  <code className="font-bold">202301451@dau.ac.in</code>) are permanently exempt from email blocks.
                </span>
              </div>

              <button
                type="submit"
                disabled={savingPlatform}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-md transition-all disabled:opacity-50"
              >
                {savingPlatform ? "Saving Policy..." : "Update Platform Policy"}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Edit Project Allowed Email Patterns Modal */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl relative">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block mb-0.5">
                  Access Control
                </span>
                <h3 className="text-lg font-bold text-white">Configure Project Email Pattern</h3>
                <p className="text-xs text-slate-400 mt-0.5">{editingProject.name}</p>
              </div>
              <button
                onClick={() => setEditingProject(null)}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProjectPattern} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Allowed Email Pattern
                </label>
                <input
                  type="text"
                  value={emailPatternInput}
                  onChange={(e) => setEmailPatternInput(e.target.value)}
                  placeholder="e.g. 2023*@dau.ac.in"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              {/* Live Pattern Matching Preview */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
                <span className="font-semibold text-slate-400 block text-[11px] uppercase tracking-wider">
                  Pattern Behavior Preview:
                </span>
                <div className="space-y-1 font-mono text-[11px]">
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-slate-300">202301131@dau.ac.in</span>
                    <span className="text-emerald-400 font-bold">Allowed</span>
                  </div>
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-slate-300">202301451@dau.ac.in</span>
                    <span className="text-emerald-400 font-bold">Allowed</span>
                  </div>
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-slate-300">202401001@dau.ac.in</span>
                    <span className={emailPatternInput.includes("2023*") ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
                      {emailPatternInput.includes("2023*") ? "Blocked" : "Allowed"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-slate-300">student@gmail.com</span>
                    <span className={emailPatternInput ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
                      {emailPatternInput ? "Blocked" : "Allowed"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPattern}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs transition-colors shadow-md disabled:opacity-50"
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
