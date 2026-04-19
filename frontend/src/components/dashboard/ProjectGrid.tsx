import type { Project } from "@/types/project"
import { ProjectCard } from "./ProjectCard"

type Props = {
  projects: Project[]
}

export function ProjectGrid({ projects }: Props) {
  if (!projects.length) {
    return (
      <div className="mt-8 text-sm text-gray-900">
        No projects yet. Create your first project to get started.
      </div>
    )
  }

  return (
    <div className="mt-6 max-h-[70vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  )
}

