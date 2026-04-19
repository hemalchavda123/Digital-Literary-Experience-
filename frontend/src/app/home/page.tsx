"use client"
import { useState } from "react"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import { SearchBar } from "@/components/dashboard/SearchBar"
import { FilterDropdown } from "@/components/dashboard/FilterDropdown"
import { ProjectGrid } from "@/components/dashboard/ProjectGrid"
import { CreateProjectModal } from "@/components/dashboard/CreateProjectModal"
import { useProjects } from "@/context/ProjectContext"

function sortProjects(projects: ReturnType<typeof useProjects>["projects"], filter: "all" | "recent" | "alphabetical") {
  const copy = [...projects]
  if (filter === "recent") {
    copy.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  } else if (filter === "alphabetical") {
    copy.sort((a, b) => a.name.localeCompare(b.name))
  }
  return copy
}

export default function HomePage() {
  const { projects } = useProjects()
  const [searchQuery, setSearchQuery] = useState("")
  const [filter, setFilter] = useState<"all" | "recent" | "alphabetical">("all")
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const filtered = sortProjects(projects, filter).filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen w-full bg-white flex flex-col">
      <Navbar />

      {/* Original hero / marketing header */}
      <header className="w-full">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 min-h-[70vh]">
            <div className="flex items-center" style={{ backgroundColor: "#a17038" }}>
              <div className="p-8 sm:p-12 lg:p-16">
                <h2
                  className="text-3xl sm:text-5xl font-extrabold mb-6"
                  style={{ color: "#000000" }}
                >
                  Lorem ipsum.
                </h2>
                <p
                  className="text-sm sm:text-base max-w-md mb-8"
                  style={{ color: "#0f120f" }}
                >
                  Discover and create literary projects with a beautiful, distraction-free
                  workspace.
                </p>
                {/* Keep CTA visually, wired to local project modal instead of /create */}
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(true)}
                    className="inline-flex items-center px-6 py-3 rounded-md text-sm font-semibold hover:opacity-95"
                    style={{ backgroundColor: "#000000", color: "#ffffff" }}
                  >
                    Make New Project
                  </button>
                </div>
              </div>
            </div>

            <div
              className="hidden md:block bg-cover bg-center"
              style={{ backgroundImage: "url('/home_background.png')" }}
            />
          </div>
        </div>
      </header>

      {/* New dashboard area below original design */}
      <main className="w-full">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <p className="text-center" style={{ color: "#111827" }}>
            Start a new project, explore collections, or continue where you left off.
          </p>

          <div className="mt-10 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div className="flex flex-1 gap-3 items-center">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search your projects"
                />
                <FilterDropdown value={filter} onChange={setFilter} />
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
              >
                + New Project
              </button>
            </div>

            <ProjectGrid projects={filtered} />
          </div>
        </div>
      </main>

      <Footer />
      <CreateProjectModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </div>
  )
}
