"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { logout } from "@/app/auth/actions"

export default function Navbar() {
    const [profileOpen, setProfileOpen] = useState(false)
    const [profileImage, setProfileImage] = useState(null)

    const profileRef = useRef(null)
    const fileInputRef = useRef(null)

    const defaultImage = "https://via.placeholder.com/150"

    useEffect(() => {
        function handleClickOutside(e) {
            if (profileRef.current && !profileRef.current.contains(e.target)) {
                setProfileOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const handleImageUpload = (e) => {
        const file = e.target.files[0]
        if (file) {
            setProfileImage(URL.createObjectURL(file))
        }
    }

    /* =========================
       Reusable Button Component
    ========================== */
    const Button = ({ children, href, onClick, variant = "primary", style = {} }: { children: any; href?: any; onClick?: any; variant?: string; style?: {} }) => {
        const baseStyle = {
            padding: "8px 16px",
            borderRadius: "6px",
            fontSize: "14px",
            cursor: "pointer",
            textDecoration: "none",
            border: "1px solid black",
            display: "inline-block",
            transition: "0.2s ease",
        }

        const variants = {
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
                    <Link href="/" style={{
                        fontSize: "20px",
                        fontWeight: 600,
                        textDecoration: "none",
                        color: "#000"
                    }}>
                        Literary
                    </Link>

                    {/* Center Links */}
                    <div style={{ display: "flex", gap: "30px" }}>
                        <Link href="/about" style={{ color: "#000", textDecoration: "none" }}>About</Link>
                        <Link href="/projects" style={{ color: "#000", textDecoration: "none" }}>Projects</Link>
                        <Link href="/contact" style={{ color: "#000", textDecoration: "none" }}>Contact</Link>
                    </div>

                    {/* Right Section */}
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>

                        <Button href="/create" variant="primary">
                            Make New Project
                        </Button>

                        <form
                            action={logout}
                            style={{
                                display: "inline"
                            }}
                        >
                            <button
                                type="submit"
                                style={{
                                    padding: "8px 16px",
                                    borderRadius: "6px",
                                    fontSize: "14px",
                                    cursor: "pointer",
                                    border: "1px solid black",
                                    backgroundColor: "#fff",
                                    color: "#000",
                                    transition: "0.2s ease"
                                }}
                            >
                                Sign out
                            </button>
                        </form>

                        {/* Profile */}
                        <div style={{ position: "relative" }} ref={profileRef}>

                            <img
                                src={profileImage || defaultImage}
                                alt="Profile"
                                onClick={() => setProfileOpen(!profileOpen)}
                                style={{
                                    width: "38px",
                                    height: "38px",
                                    borderRadius: "50%",
                                    objectFit: "cover",
                                    cursor: "pointer",
                                    border: "1px solid #ddd"
                                }}
                            />

                            <input
                                type="file"
                                accept="image/*"
                                ref={fileInputRef}
                                style={{ display: "none" }}
                                onChange={handleImageUpload}
                            />

                            {profileOpen && (
                                <div style={{
                                    position: "absolute",
                                    right: 0,
                                    marginTop: "10px",
                                    width: "200px",
                                    backgroundColor: "#fff",
                                    borderRadius: "10px",
                                    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                                    padding: "10px 0"
                                }}>
                                    <div
                                        onClick={() => fileInputRef.current.click()}
                                        style={{
                                            padding: "10px 16px",
                                            cursor: "pointer",
                                            color: "#000"
                                        }}
                                    >
                                        Upload Profile Image
                                    </div>

                                    <Link href="/profile" style={{
                                        display: "block",
                                        padding: "10px 16px",
                                        textDecoration: "none",
                                        color: "#000"
                                    }}>
                                        Your Profile
                                    </Link>

                                    <Link href="/settings" style={{
                                        display: "block",
                                        padding: "10px 16px",
                                        textDecoration: "none",
                                        color: "#000"
                                    }}>
                                        Settings
                                    </Link>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </nav>
    )
}
