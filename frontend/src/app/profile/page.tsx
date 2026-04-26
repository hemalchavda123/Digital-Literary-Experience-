"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import { logout } from "@/app/auth/actions"
import { getCurrentUser, updateProfileImage } from "@/lib/api/users"

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function loadUser() {
      try {
        const userData = await getCurrentUser()
        setUser(userData)
      } catch (err) {
        console.error("Failed to load user:", err)
        router.push("/signup2")
      } finally {
        setLoading(false)
      }
    }
    loadUser()
  }, [router])

  const handleImageClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Limit size to 2MB for base64 storage
    if (file.size > 2 * 1024 * 1024) {
      alert("Image is too large. Please select an image smaller than 2MB.")
      return
    }

    setIsUploading(true)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const response = await updateProfileImage(base64)
      setUser(response.user)
      // Page reload removed to avoid refresh loop; state update is sufficient
    } catch (err) {
      console.error("Failed to upload image:", err)
      alert("Failed to upload profile image.")
    } finally {
      setIsUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </main>
        <Footer />
      </div>
    )
  }

  const defaultImage = "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y"

  return (
    <div className="min-h-screen flex flex-col bg-white w-full">
      <Navbar />
      
      <main className="flex-1 w-full bg-white py-12">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Header/Cover Area */}
                    <div className="h-32 bg-[#a17038] w-full"></div>

          
          <div className="px-6 pb-8">
            <div className="relative -mt-16 flex items-end space-x-5">
              <div className="relative group cursor-pointer" onClick={handleImageClick}>
                <div className="h-32 w-32 rounded-2xl ring-4 ring-white bg-white overflow-hidden border border-gray-100">
                  <img
                    src={user?.profileImage || defaultImage}
                    alt="Profile"
                    className={`h-full w-full object-cover transition-opacity ${isUploading ? 'opacity-50' : 'group-hover:opacity-75'}`}
                  />
                  {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>
              
              <div className="flex-1 min-w-0 pb-1">
                <h1 className="text-3xl font-bold text-black truncate">
                  {user?.username || "User"}
                </h1>
                <p className="text-sm font-medium text-black/60">
                  Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                </p>
              </div>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-black border-b border-gray-100 pb-2">Account Information</h3>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="text-xs font-bold text-black uppercase tracking-wider">Email Address</label>
                      <p className="mt-1 text-black">{user?.email}</p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-black uppercase tracking-wider">Username</label>
                      <p className="mt-1 text-black">{user?.username}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-black border-b border-gray-100 pb-2">Actions</h3>
                  <div className="mt-4">
                    <form action={logout}>
                      <button
                        type="submit"
                        className="w-full flex justify-center items-center px-4 py-3 border border-black rounded-xl text-sm font-bold text-white bg-black hover:bg-gray-900 transition-all shadow-sm active:scale-[0.98]"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                      </button>
                    </form>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <h3 className="text-sm font-bold text-black uppercase tracking-wider mb-4">Profile Tips</h3>
                <ul className="space-y-3 text-sm text-black/80">
                  <li className="flex items-start">
                    <span className="text-black mr-2">•</span>
                    Your profile picture is visible across all your collaborative projects.
                  </li>
                  <li className="flex items-start">
                    <span className="text-black mr-2">•</span>
                    Use a high-quality square image for the best appearance.
                  </li>
                  <li className="flex items-start">
                    <span className="text-black mr-2">•</span>
                    Keep your contact information updated to receive project invitations.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

      <Footer />
    </div>
  )
}
