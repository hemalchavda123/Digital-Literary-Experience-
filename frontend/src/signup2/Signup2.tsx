"use client"
import React, { useState } from "react"
import { useRouter } from "next/navigation"
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export default function Signup2(): JSX.Element {
  const [viewIndex, setViewIndex] = useState<number>(0) // 0=signup,1=login,2=post
  const router = useRouter()

  function handleSignIn(e?: React.FormEvent) {
    e?.preventDefault()
    setViewIndex(3)
    setTimeout(() => router.push("/home"), 350)
  }

  const navWrapStyle: React.CSSProperties = {
    position: 'fixed',
    left: 0,
    right: 0,
    top: 0,
    transform: viewIndex === 3 ? 'translateY(0)' : 'translateY(-120%)',
    transition: 'transform 520ms cubic-bezier(.2,.95,.2,1)',
    zIndex: 60,
  }

  const footerWrapStyle: React.CSSProperties = {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    transform: viewIndex === 3 ? 'translateY(0)' : 'translateY(120%)',
    transition: 'transform 520ms cubic-bezier(.2,.95,.2,1)',
    zIndex: 60,
  }

  const leftColTransformStyle: React.CSSProperties = {
    transform: viewIndex === 3 ? 'translateX(-60px)' : 'translateX(0)',
    transition: 'transform 520ms cubic-bezier(.2,.95,.2,1)',
  }

  const rightColTransformStyle: React.CSSProperties = {
    transform: viewIndex === 3 ? 'translateX(-60px) scale(1.02)' : 'translateX(0) scale(1)',
    transition: 'transform 520ms cubic-bezier(.2,.95,.2,1)',
  }

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: '#ffffff' }}>
      <div style={navWrapStyle} aria-hidden={viewIndex !== 3}>
        <Navbar />
      </div>
      <header className="w-full">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 min-h-[70vh]">
            <div className="flex items-center" style={{ backgroundColor: '#a17038', ...leftColTransformStyle }}>
              <div className="p-8 sm:p-12 lg:p-16">
                <h2 className="text-3xl sm:text-5xl font-extrabold mb-6" style={{ color: '#000000' }}>Lorem ipsum.</h2>
                <p className="text-sm sm:text-base max-w-md mb-8" style={{ color: '#0f120f' }}>Discover and create literary projects with a beautiful, distraction-free workspace.</p>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <div style={{ width: 460, height: 520, borderRadius: 12, boxShadow: '0 16px 40px rgba(0,0,0,0.14)', overflow: 'hidden', backgroundColor: '#ffffff' }}>
                    <div style={{ width: '100%', height: '100%', overflow: 'hidden', padding: 24, boxSizing: 'border-box' }}>
                      <div style={{ width: '400%', height: '100%', display: 'flex', transform: `translateX(-${viewIndex * 25}%)`, transition: 'transform 360ms cubic-bezier(.2,.95,.2,1)' }}>
                        {/* Signup slide */}
                        <div style={{ width: '25%', paddingRight: 25, boxSizing: 'border-box', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                          <h3 style={{ margin: 0, color: '#111' }}>Create account</h3>
                          <p style={{ margin: '6px 0 12px', color: '#555' }}>Join us — it only takes a minute.</p>
                          <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <input placeholder="Full name" style={{ padding: 10, borderRadius: 8, border: '1px solid #e6e6e6' }} />
                            <input placeholder="Email" style={{ padding: 10, borderRadius: 8, border: '1px solid #e6e6e6' }} />
                            <input type="password" placeholder="Password" style={{ padding: 10, borderRadius: 8, border: '1px solid #e6e6e6' }} />
                            <button type="submit" style={{ backgroundColor: '#6b3f2c', color: '#fff', padding: '10px 12px', borderRadius: 8, border: 'none', fontWeight: 700 }}>Sign up</button>
                          </form>
                          <div style={{ marginTop: 10 }}>
                            <button style={{ background: 'none', border: 'none', color: '#6b3f2c', cursor: 'pointer' }} onClick={() => setViewIndex(1)}>Already have an account? Login</button>
                          </div>
                        </div>

                        {/* Login slide */}
                        <div style={{ width: '25%', paddingRight: 23, boxSizing: 'border-box' }}>
                          <h3 style={{ margin: 0, color: '#111' }}>Welcome back</h3>
                          <p style={{ margin: '6px 0 12px', color: '#555' }}>Sign in to continue</p>
                          <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <input placeholder="Email" style={{ padding: 12, borderRadius: 10, border: '1px solid #e6e6e6', fontSize: 15 }} />
                            <input type="password" placeholder="Password" style={{ padding: 12, borderRadius: 10, border: '1px solid #e6e6e6', fontSize: 15 }} />
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                              <button type="button" onClick={() => setViewIndex(2)} style={{ background: 'none', border: 'none', color: '#6b3f2c', cursor: 'pointer', fontSize: 14 }}>Forgot password?</button>
                            </div>
                            <button type="submit" style={{ backgroundColor: '#6b3f2c', color: '#fff', padding: '12px 14px', borderRadius: 10, border: 'none', fontWeight: 700, fontSize: 16 }}>Sign in</button>
                          </form>
                          <div style={{ marginTop: 10 }}>
                            <button style={{ background: 'none', border: 'none', color: '#6b3f2c', cursor: 'pointer', fontSize: 15 }} onClick={() => setViewIndex(0)}>Create account</button>
                          </div>
                        </div>

                        {/* Forgot Password slide */}
                        <div style={{ width: '25%', padding: 23, boxSizing: 'border-box' }}>
                          <h3 style={{ margin: 0, color: '#111' }}>Reset password</h3>
                          <p style={{ margin: '6px 0 12px', color: '#555' }}>We’ll send a link to your email.</p>
                          <form onSubmit={(e) => { e.preventDefault(); setViewIndex(1); }} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <input placeholder="Email" style={{ padding: 10, borderRadius: 8, border: '1px solid #e6e6e6' }} />
                            <button type="submit" style={{ backgroundColor: '#6b3f2c', color: '#fff', padding: '10px 12px', borderRadius: 8, border: 'none', fontWeight: 700 }}>Send reset link</button>
                          </form>
                          <div style={{ marginTop: 8 }}>
                            <button style={{ background: 'none', border: 'none', color: '#6b3f2c', cursor: 'pointer' }} onClick={() => setViewIndex(1)}>Back to login</button>
                          </div>
                        </div>

                        {/* Post-sign slide */}
                        <div style={{ width: '25%', boxSizing: 'border-box', padding: 28 }}>
                          <h3 style={{ margin: 0, color: '#111' }}>All set</h3>
                          <p style={{ margin: '6px 0 12px', color: '#555' }}>Redirecting to the app…</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="hidden md:block bg-cover bg-center" style={{ backgroundImage: "url('/home_background.png')", ...rightColTransformStyle }} />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <p className="text-center" style={{ color: '#6b7280' }}>Start a new project, explore collections, or continue where you left off.</p>
      </main>
      <div style={footerWrapStyle} aria-hidden={viewIndex !== 3}>
        <Footer />
      </div>
    </div>

  )
}
