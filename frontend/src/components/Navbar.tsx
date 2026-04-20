"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { logout } from "@/app/auth/actions"
import { getCurrentUser } from "@/lib/api/users"

export default function Navbar() {
    const router = useRouter()
    const [profileOpen, setProfileOpen] = useState(false)
    const [user, setUser] = useState<any>(null)

    const profileRef = useRef<HTMLDivElement>(null)

    const defaultImage = "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y"

    useEffect(() => {
        async function fetchUser() {
            try {
                const data = await getCurrentUser()
                setUser(data)
            } catch (err) {
                console.error("Failed to fetch user in Navbar:", err)
            }
        }
        fetchUser()

        function handleClickOutside(e: MouseEvent) {
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
                setProfileOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    /* =========================
       Reusable Button Component
    ========================== */
    const Button = ({ children, href, onClick, variant = "primary", style = {} }: { children: any; href?: any; onClick?: any; variant?: string; style?: {} }) => {
        const baseStyle = {
            padding: "8px 16px",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            textDecoration: "none",
            border: "1px solid black",
            display: "inline-flex",
            alignItems: "center",
            transition: "0.2s ease",
        }

        const variants: Record<string, any> = {
            primary: {
                backgroundColor: "#000",
                color: "#fff",
            },
            secondary: {
                backgroundColor: "#fff",
                color: "#000",
            }
        }

        const combinedStyle = {
            ...baseStyle,
            ...variants[variant],
            ...style
        }

        if (href) {
            return (
                <Link href={href} style={combinedStyle}>
                    {children}
                </Link>
            )
        }

        return (
            <button onClick={onClick} style={combinedStyle}>
                {children}
            </button>
        )
    }

    return (
        <nav style={{
            width: "100%",
            backgroundColor: "#fff",
            borderBottom: "1px solid #e5e7eb",
            position: "sticky",
            top: 0,
            zIndex: 50
        }}>
            <div style={{
                maxWidth: "1100px",
                margin: "0 auto",
                padding: "0 20px"
            }}>
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    height: "64px"
                }}>

                    {/* Logo */}
                    <Link href="/home" style={{
                        fontSize: "20px",
                        fontWeight: 700,
                        textDecoration: "none",
                        color: "#000"
                    }}>
                        Digital Literary Experience
                    </Link>

                    {/* Center Links */}
                    <div style={{ display: "none", gap: "30px" }} className="md:flex">
                        <Link href="/about" style={{ color: "#000", textDecoration: "none", fontWeight: 500 }}>About</Link>
                        <Link href="/projects" style={{ color: "#000", textDecoration: "none", fontWeight: 500 }}>Projects</Link>
                        <Link href="/contact" style={{ color: "#000", textDecoration: "none", fontWeight: 500 }}>Contact</Link>
                    </div>

                    {/* Right Section */}
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>

                        <Button href="/home" variant="primary">
                            Dashboard
                        </Button>

                        {/* Profile */}
                        <div style={{ position: "relative" }} ref={profileRef}>

                            <div 
                                onClick={() => setProfileOpen(!profileOpen)}
                                style={{
                                    width: "40px",
                                    height: "40px",
                                    borderRadius: "12px",
                                    overflow: "hidden",
                                    cursor: "pointer",
                                    border: "2px solid #000",
                                    backgroundColor: "#f3f4f6",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    transition: "0.2s ease"
                                }}
                            >
                                <img
                                    src={user?.profileImage || defaultImage}
                                    alt="Profile"
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover"
                                    }}
                                />
                            </div>

                            {profileOpen && (
                                <div style={{
                                    position: "absolute",
                                    right: 0,
                                    marginTop: "12px",
                                    width: "220px",
                                    backgroundColor: "#fff",
                                    borderRadius: "16px",
                                    boxShadow: "0 10px 40px rgba(0,0,0,0.12)",
                                    border: "1px solid #e5e7eb",
                                    padding: "8px",
                                    overflow: "hidden",
                                    animation: "fadeIn 0.2s ease-out"
                                }}>
                                    <div style={{
                                        padding: "12px 16px",
                                        borderBottom: "1px solid #f3f4f6",
                                        marginBottom: "4px"
                                    }}>
                                        <p style={{ fontSize: "14px", fontWeight: 700, color: "#000", margin: 0 }}>{user?.username || "Account"}</p>
                                        <p style={{ fontSize: "12px", color: "#666", margin: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{user?.email}</p>
                                    </div>

                                    <Link href="/profile" style={{
                                        display: "flex",
                                        alignItems: "center",
                                        padding: "10px 16px",
                                        textDecoration: "none",
                                        color: "#000",
                                        fontSize: "14px",
                                        fontWeight: 500,
                                        borderRadius: "8px",
                                        transition: "0.2s ease"
                                    }} className="hover:bg-gray-100">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        Your Profile
                                    </Link>

                                    <Link href="/settings" style={{
                                        display: "flex",
                                        alignItems: "center",
                                        padding: "10px 16px",
                                        textDecoration: "none",
                                        color: "#000",
                                        fontSize: "14px",
                                        fontWeight: 500,
                                        borderRadius: "8px",
                                        transition: "0.2s ease"
                                    }} className="hover:bg-gray-100">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        Settings
                                    </Link>

                                    <Link href="/permissions" style={{
                                        display: "flex",
                                        alignItems: "center",
                                        padding: "10px 16px",
                                        textDecoration: "none",
                                        color: "#000",
                                        fontSize: "14px",
                                        fontWeight: 500,
                                        borderRadius: "8px",
                                        transition: "0.2s ease"
                                    }} className="hover:bg-gray-100">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                        Permissions
                                    </Link>

                                    <div style={{ borderTop: "1px solid #f3f4f6", marginTop: "4px", paddingTop: "4px" }}>
                                        <form action={logout}>
                                            <button
                                                type="submit"
                                                style={{
                                                    width: "100%",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    padding: "10px 16px",
                                                    border: "none",
                                                    backgroundColor: "transparent",
                                                    color: "#ef4444",
                                                    fontSize: "14px",
                                                    fontWeight: 600,
                                                    textAlign: "left",
                                                    cursor: "pointer",
                                                    borderRadius: "8px",
                                                    transition: "0.2s ease"
                                                }}
                                                className="hover:bg-red-50"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                                </svg>
                                                Sign out
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </nav>
    )
}
