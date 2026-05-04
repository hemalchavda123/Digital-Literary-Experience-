export interface AssignmentStatus {
  id: string
  assignmentId: string
  userId: string
  status: "PENDING" | "SUBMITTED" | "COMPLETED"
  grade: string | null
  createdAt: string
  updatedAt: string
  user: { username: string }
}

export interface Assignment {
  id: string
  projectId: string
  documentId?: string | null
  document?: {
    id: string
    title: string
    kind: string
  } | null
  title: string
  description: string
  dueDate: string | null
  totalMarks: number | null
  createdAt: string
  updatedAt: string
  statuses: AssignmentStatus[]
}
