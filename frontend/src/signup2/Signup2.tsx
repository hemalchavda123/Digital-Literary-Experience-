"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"

export default function Signup2(): JSX.Element {
  const [viewIndex, setViewIndex] = useState<number>(0) // 0=signup,1=login,2=forgot,3=post
  const [isMobile, setIsMobile] = useState<boolean>(false)
  const router = useRouter()

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 900)
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  function handleSignIn(e?: React.FormEvent) {
    e?.preventDefault()
    setViewIndex(3)
    setTimeout(() => router.push("/home"), 600)
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #e6e6e6",
    fontSize: 15,
    boxSizing: "border-box",
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

  const linkStyle: React.CSSProperties = {
    marginTop: 16,
    background: "none",
    border: "none",
    color: "#6b3f2c",
    cursor: "pointer",
    fontSize: 14,
    padding: 0,
  }

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
      {/* Animated Navbar */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          transform: viewIndex === 3 ? "translateY(0)" : "translateY(-120%)",
          transition: "transform 500ms cubic-bezier(.2,.95,.2,1)",
          zIndex: 50,
        }}
      >
        <Navbar />
      </div>

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
              Lorem ipsum.
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
                    <p style={{ margin: "6px 0 18px", color: "#666" }}>
                      Join us — it only takes a minute.
                    </p>

                    <form
                      onSubmit={handleSignIn}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 14,
                      }}
                    >
                      <input placeholder="Full name" style={inputStyle} />
                      <input placeholder="Email" style={inputStyle} />
                      <input
                        type="password"
                        placeholder="Password"
                        style={inputStyle}
                      />
                      <button type="submit" style={primaryButtonStyle}>
                        Sign up
                      </button>
                    </form>

                    <button
                      onClick={() => setViewIndex(1)}
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
                    <p style={{ margin: "6px 0 18px", color: "#666" }}>
                      Sign in to continue
                    </p>

                    <form
                      onSubmit={handleSignIn}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 14,
                      }}
                    >
                      <input placeholder="Email" style={inputStyle} />
                      <input
                        type="password"
                        placeholder="Password"
                        style={inputStyle}
                      />

                      <button
                        type="button"
                        onClick={() => setViewIndex(2)}
                        style={{
                          ...linkStyle,
                          textAlign: "right",
                          marginTop: -6,
                        }}
                      >
                        Forgot password?
                      </button>

                      <button type="submit" style={primaryButtonStyle}>
                        Sign in
                      </button>
                    </form>

                    <button
                      onClick={() => setViewIndex(0)}
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
                    <p style={{ margin: "6px 0 18px", color: "#666" }}>
                      We’ll send a link to your email.
                    </p>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        setViewIndex(1)
                      }}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 14,
                      }}
                    >
                      <input placeholder="Email" style={inputStyle} />
                      <button type="submit" style={primaryButtonStyle}>
                        Send reset link
                      </button>
                    </form>

                    <button
                      onClick={() => setViewIndex(1)}
                      style={linkStyle}
                    >
                      Back to login
                    </button>
                  </div>

                  {/* POST */}
                  <div
                    style={{
                      width: "100%",
                      flexShrink: 0,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                    }}
                  >
                    <h3 style={{ margin: 0, fontSize: 22 }}>
                      All set
                    </h3>
                    <p style={{ marginTop: 10, color: "#666" }}>
                      Redirecting to the app…
                    </p>
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

      {/* Animated Footer */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          transform:
            viewIndex === 3 ? "translateY(0)" : "translateY(120%)",
          transition: "transform 500ms cubic-bezier(.2,.95,.2,1)",
          zIndex: 50,
        }}
      >
        <Footer />
      </div>
    </div>
  )
}