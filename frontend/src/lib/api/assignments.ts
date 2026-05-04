import { authFetch } from './authFetch'
import { Assignment } from '@/types/assignment'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

export async function getAssignments(projectId: string): Promise<Assignment[]> {
  const response = await authFetch(`${API_URL}/projects/${projectId}/assignments`)
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'Failed to fetch assignments')
  }
  return response.json()
}

export async function createAssignment(
  projectId: string,
  title: string,
  description: string,
  dueDate?: string,
  totalMarks?: number,
  documentId?: string
): Promise<Assignment> {
  const response = await authFetch(`${API_URL}/projects/${projectId}/assignments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description, dueDate, totalMarks, documentId }),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'Failed to create assignment')
  }
  return response.json()
}

export async function deleteAssignment(projectId: string, assignmentId: string): Promise<void> {
  const response = await authFetch(`${API_URL}/projects/${projectId}/assignments/${assignmentId}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'Failed to delete assignment')
  }
}

export async function updateAssignmentStatus(
  projectId: string,
  assignmentId: string,
  userId: string,
  status?: string,
  grade?: string
): Promise<Assignment['statuses'][number]> {
  const response = await authFetch(
    `${API_URL}/projects/${projectId}/assignments/${assignmentId}/statuses/${userId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, grade }),
    }
  )
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'Failed to update assignment status')
  }
  return response.json()
}
