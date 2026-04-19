import Link from "next/link"
import type { Project } from "@/types/project"

type Props = {
  project: Project
}

export function ProjectCard({ project }: Props) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <div>
        <h3 className="text-lg font-semibold mb-1 text-gray-900">{project.name}</h3>
        <p className="text-xs text-gray-900">
          Last edited: {project.updatedAt.slice(0, 10)}
        </p>
      </div>
      <div className="mt-4 flex justify-end">
        <Link
          href={`/project/${project.id}`}
          className="inline-flex items-center text-sm font-medium text-black hover:underline"
        >
          Open →
        </Link>
      </div>
    </div>
  )
}

