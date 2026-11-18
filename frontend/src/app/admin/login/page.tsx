"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { adminLogin, adminGoogleLogin } from "@/lib/api/admin"
import { GoogleLogin } from "@react-oauth/google"
import {
  ShieldCheck,
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
} from "lucide-react"

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPasswordFallback, setShowPasswordFallback] = useState(false)

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential) {
      setError("Google authentication token not received.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await adminGoogleLogin(credentialResponse.credential)
      const role = data.user?.systemRole
      if (role !== "ADMIN" && role !== "SUPERADMIN") {
        throw new Error("Access denied: You do not have administrator permissions")
      }
      router.push("/admin/dashboard")
    } catch (err: any) {
      setError(err.message || "Failed to authenticate with Google")
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return

    setLoading(true)
    setError(null)

    try {
      const data = await adminLogin(email.trim(), password)
      const role = data.user?.systemRole
      if (role !== "ADMIN" && role !== "SUPERADMIN") {
        throw new Error("Access denied: You do not have administrator permissions")
      }
      router.push("/admin/dashboard")
    } catch (err: any) {
      setError(err.message || "Failed to authenticate as administrator")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-white text-gray-900 font-sans">
      {/* Left Column: Signature Cognac Branding */}
      <div className="md:w-5/12 bg-[#a17038] text-white p-8 md:p-14 flex flex-col justify-between relative overflow-hidden">
        {/* Subtle decorative circles */}
        <div className="absolute -top-16 -left-16 w-56 h-56 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full bg-black/10 blur-2xl pointer-events-none" />

        <div className="relative z-10">
          <Link
            href="/home"
            className="inline-flex items-center gap-2 text-xs font-bold text-black/80 hover:text-black bg-white/70 hover:bg-white px-3 py-1.5 rounded-lg transition-colors mb-10 shadow-xs"
          >
            <ArrowLeft size={14} />
            <span>Back to Exegesis</span>
          </Link>

          <div className="w-14 h-14 bg-black text-white rounded-2xl flex items-center justify-center shadow-lg mb-6 border border-white/20">
            <ShieldCheck size={30} className="text-[#a17038]" />
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold text-black tracking-tight leading-tight">
            Exegesis
          </h1>
          <p className="text-sm font-semibold text-black/80 uppercase tracking-widest mt-1">
            Admin &amp; Superadmin Portal
          </p>

          <div className="mt-8 space-y-3 max-w-sm text-xs text-black/85 leading-relaxed">
            <p>
              Dedicated management console for platform administrators and project moderators.
            </p>
            <div className="flex items-center gap-2 pt-2 text-black font-semibold">
              <CheckCircle2 size={16} />
              <span>Platform-wide access controls &amp; rules</span>
            </div>
            <div className="flex items-center gap-2 text-black font-semibold">
              <CheckCircle2 size={16} />
              <span>User roles &amp; administrator assignments</span>
            </div>
            <div className="flex items-center gap-2 text-black font-semibold">
              <CheckCircle2 size={16} />
              <span>Institutional security &amp; domain policies</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-8 mt-8 border-t border-black/15 text-[11px] text-black/70">
          Digital Literary Experience &bull; Authorized Personnel Only
        </div>
      </div>

      {/* Right Column: Google Sign In Form */}
      <div className="flex-1 bg-white p-8 md:p-16 flex items-center justify-center">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold tracking-widest uppercase text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 inline-block mb-1">
              Restricted Area
            </span>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              Sign In as Administrator
            </h2>
            <p className="text-xs text-gray-500">
              Sign in with your authorized institutional Google account to access the admin dashboard.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle size={16} className="text-rose-600 flex-shrink-0 mt-0.5" />
              <span className="font-medium leading-relaxed">{error}</span>
            </div>
          )}

          {/* Primary Action: Google Sign In Button */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-col items-center justify-center p-6 bg-gray-50/70 border border-gray-200 rounded-2xl shadow-xs gap-3 text-center">
              <p className="text-xs text-gray-700 font-medium">
                Continue with your Google Account
              </p>

              <div className="flex justify-center w-full">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError("Google login failed. Please try again.")}
                  shape="rectangular"
                  theme="outline"
                  size="large"
                  text="signin_with"
                  width="320"
                />
              </div>

              <span className="text-[11px] text-gray-400 mt-1">
                Supports designated institutional superadmins and project admins.
              </span>
            </div>

            {/* Emergency fallback toggle */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setShowPasswordFallback(!showPasswordFallback)}
                className="text-xs text-gray-500 hover:text-gray-800 underline font-medium transition-colors"
              >
                {showPasswordFallback ? "Hide password fallback" : "Use email & password fallback"}
              </button>
            </div>
          </div>

          {/* Optional Password Fallback */}
          {showPasswordFallback && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4 pt-2 border-t border-gray-150">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Administrator Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-gray-400" size={16} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="admin@dau.ac.in"
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#a17038]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-gray-400" size={16} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#a17038]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-gray-900 hover:bg-black text-white font-bold rounded-lg text-xs shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <KeyRound size={14} />
                <span>{loading ? "Authenticating..." : "Sign in with Password"}</span>
              </button>
            </form>
          )}

          {/* Footer Notice */}
          <div className="pt-4 border-t border-gray-100 text-[11px] text-gray-400 text-center">
            Standard user logins are blocked on this portal. To access regular projects, sign in through the{" "}
            <Link href="/login" className="text-[#a17038] font-bold hover:underline">
              Main Login Page
            </Link>
            .
          </div>
        </div>
      </div>
    </div>
  )
}
