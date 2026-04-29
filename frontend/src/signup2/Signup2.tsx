"use client"

import React, { useState, useEffect, JSX } from "react"
import { useRouter } from "next/navigation"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

export default function Signup2(): JSX.Element {
  const [viewIndex, setViewIndex] = useState<number>(0) // 0=signup,1=login,2=forgot
  const [isMobile, setIsMobile] = useState<boolean>(false)
  const [showSignupPassword, setShowSignupPassword] = useState(false)
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null)
  const router = useRouter()

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 900)
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  /* ---- helpers ---- */

  function setTokenCookie(accessToken: string, refreshToken: string) {
    // Store tokens in cookies accessible by the Next.js middleware
    document.cookie = `accessToken=${accessToken}; path=/; max-age=${60 * 60}; SameSite=Lax` // 1 hour
    document.cookie = `refreshToken=${refreshToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax` // 7 days
  }

  /* ---- form handlers ---- */

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage(null)

    const form = e.currentTarget
    const formData = new FormData(form)
    const username = formData.get("username") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        const errMsg =
          data?.error?.details
            ? Object.values(data.error.details).flat().join(". ")
            : data?.error?.message || "Registration failed"
        setMessage({ text: errMsg, type: "error" })
        setIsSubmitting(false)
        return
      }

      // Registration succeeded — auto-login
      const loginRes = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const loginData = await loginRes.json()

      if (!loginRes.ok) {
        setMessage({ text: "Account created! Please sign in.", type: "success" })
        setViewIndex(1)
        setIsSubmitting(false)
        return
      }

      setTokenCookie(loginData.accessToken, loginData.refreshToken)
      router.push("/home")
    } catch {
      setMessage({ text: "Network error. Is the backend running?", type: "error" })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage(null)

    const form = e.currentTarget
    const formData = new FormData(form)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        const errMsg = data?.error?.message || "Login failed"
        setMessage({ text: errMsg, type: "error" })
        setIsSubmitting(false)
        return
      }

      setTokenCookie(data.accessToken, data.refreshToken)
      router.push("/home")
    } catch {
      setMessage({ text: "Network error. Is the backend running?", type: "error" })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleForgotPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage(null)

    const form = e.currentTarget
    const formData = new FormData(form)
    const email = formData.get("email") as string

    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        const errMsg = data?.error?.message || "Request failed"
        setMessage({ text: errMsg, type: "error" })
      } else {
        setMessage({ text: data.message || "If the email exists, a reset link has been sent.", type: "success" })
      }
    } catch {
      setMessage({ text: "Network error. Is the backend running?", type: "error" })
    } finally {
      setIsSubmitting(false)
    }
  }

  /* ---- styles ---- */

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #e6e6e6",
    fontSize: 15,
    boxSizing: "border-box",
    color: "#333"
  }

  const primaryButtonStyle: React.CSSProperties = {
    width: "100%",
    backgroundColor: "#6b3f2c",
    color: "#ffffff",
    padding: "12px",
    borderRadius: 12,
    border: "none",
    fontWeight: 700,
    cursor: "pointer",
  }

  const disabledButtonStyle: React.CSSProperties = {
    ...primaryButtonStyle,
    opacity: 0.7,
    cursor: "not-allowed",
  }

  const linkStyle: React.CSSProperties = {
    marginTop: 16,
    background: "none",
    border: "none",
    color: "#6b3f2c",
    cursor: "pointer",
    fontSize: 14,
    padding: 0,
  }

  const eyeButtonStyle: React.CSSProperties = {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#6b7280",
  }

  const errorStyle: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    fontSize: 13,
    marginBottom: 14,
    backgroundColor: "#fef2f2",
    color: "#991b1b",
    border: "1px solid #fecaca",
  }

  const successStyle: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    fontSize: 13,
    marginBottom: 14,
    backgroundColor: "#f0fdf4",
    color: "#166534",
    border: "1px solid #bbf7d0",
  }

  const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )

  const EyeOffIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    </svg>
  )

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        backgroundColor: "#ffffff",
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Main Layout */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          height: "100%",
        }}
      >
        {/* Left Column */}
        <div
          style={{
            flex: 1,
            backgroundColor: "#a17038",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: isMobile ? 30 : 60,
          }}
        >
          <div style={{ width: "100%", maxWidth: 420 }}>
            <h2
              style={{
                fontSize: isMobile ? 28 : 48,
                fontWeight: 800,
                marginBottom: 20,
                color: "#000",
              }}
            >
              Digital Literary Studio
            </h2>

            <p
              style={{
                marginBottom: 30,
                fontSize: 15,
                color: "#0f120f",
              }}
            >
              Discover and create literary projects with a beautiful,
              distraction-free workspace.
            </p>

            {/* Card */}
            <div
              style={{
                width: "100%",
                backgroundColor: "#ffffff",
                borderRadius: 20,
                boxShadow: "0 30px 60px rgba(0,0,0,0.18)",
                padding: 32,
                boxSizing: "border-box",
              }}
            >
              {/* Show messages */}
              {message && (
                <div style={message.type === "error" ? errorStyle : successStyle}>
                  {message.text}
                </div>
              )}

              <div style={{ overflow: "hidden", width: "100%" }}>
                <div
                  style={{
                    display: "flex",
                    transition:
                      "transform 320ms cubic-bezier(.2,.95,.2,1)",
                    transform: `translateX(-${viewIndex * 100}%)`,
                  }}
                >
                  {/* SIGNUP */}
                  <div style={{ width: "100%", flexShrink: 0 }}>
                    <h3 style={{ margin: 0, fontSize: 22, color: "#000" }}>
                      Create account
                    </h3>
                    <p style={{ margin: "6px 0 18px", color: "#111827" }}>
                      Join us — it only takes a minute.
                    </p>

                    <form
                      onSubmit={handleSignup}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 14,
                      }}
                    >
                      <input
                        name="username"
                        placeholder="Full name"
                        required
                        minLength={3}
                        style={inputStyle}
                      />
                      <input
                        name="email"
                        type="email"
                        placeholder="Email"
                        required
                        style={inputStyle}
                      />
                      <div style={{ position: "relative" }}>
                        <input
                          name="password"
                          type={showSignupPassword ? "text" : "password"}
                          placeholder="Password"
                          required
                          minLength={8}
                          style={{ ...inputStyle, paddingRight: 42 }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignupPassword(!showSignupPassword)}
                          style={eyeButtonStyle}
                          aria-label={showSignupPassword ? "Hide password" : "Show password"}
                        >
                          {showSignupPassword ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                      </div>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        style={isSubmitting ? disabledButtonStyle : primaryButtonStyle}
                      >
                        {isSubmitting ? "Signing up…" : "Sign up"}
                      </button>
                    </form>

                    <button
                      onClick={() => { setViewIndex(1); setMessage(null) }}
                      style={linkStyle}
                    >
                      Already have an account? Login
                    </button>
                  </div>

                  {/* LOGIN */}
                  <div style={{ width: "100%", flexShrink: 0 }}>
                    <h3 style={{ margin: 0, fontSize: 22, color: "#000" }}>
                      Welcome back
                    </h3>
                    <p style={{ margin: "6px 0 18px", color: "#111827" }}>
                      Sign in to continue
                    </p>

                    <form
                      onSubmit={handleLogin}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 14,
                      }}
                    >
                      <input
                        name="email"
                        type="email"
                        placeholder="Email"
                        required
                        style={inputStyle}
                      />
                      <div style={{ position: "relative" }}>
                        <input
                          name="password"
                          type={showLoginPassword ? "text" : "password"}
                          placeholder="Password"
                          required
                          style={{ ...inputStyle, paddingRight: 42 }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          style={eyeButtonStyle}
                          aria-label={showLoginPassword ? "Hide password" : "Show password"}
                        >
                          {showLoginPassword ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => { setViewIndex(2); setMessage(null) }}
                        style={{
                          ...linkStyle,
                          textAlign: "right",
                          marginTop: -6,
                        }}
                      >
                        Forgot password?
                      </button>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        style={isSubmitting ? disabledButtonStyle : primaryButtonStyle}
                      >
                        {isSubmitting ? "Signing in…" : "Sign in"}
                      </button>
                    </form>

                    <button
                      onClick={() => { setViewIndex(0); setMessage(null) }}
                      style={linkStyle}
                    >
                      Create account
                    </button>
                  </div>

                  {/* FORGOT */}
                  <div style={{ width: "100%", flexShrink: 0 }}>
                    <h3 style={{ margin: 0, fontSize: 22, color: "#000" }}>
                      Reset password
                    </h3>
                    <p style={{ margin: "6px 0 18px", color: "#111827" }}>
                      We'll send a link to your email.
                    </p>

                    <form
                      onSubmit={handleForgotPassword}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 14,
                      }}
                    >
                      <input
                        name="email"
                        type="email"
                        placeholder="Email"
                        required
                        style={inputStyle}
                      />
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        style={isSubmitting ? disabledButtonStyle : primaryButtonStyle}
                      >
                        {isSubmitting ? "Sending…" : "Send reset link"}
                      </button>
                    </form>

                    <button
                      onClick={() => { setViewIndex(1); setMessage(null) }}
                      style={linkStyle}
                    >
                      Back to login
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        {!isMobile && (
          <div
            style={{
              flex: 1,
              backgroundImage: "url('/home_background.png')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        )}
      </div>
    </div>
  )
}