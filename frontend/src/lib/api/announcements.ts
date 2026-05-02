import { authFetch } from './authFetch'
import { Announcement, AnnouncementReply } from '@/types/announcement'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

export async function getAnnouncements(projectId: string): Promise<Announcement[]> {
  const response = await authFetch(`${API_URL}/projects/${projectId}/announcements`)
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'Failed to fetch announcements')
  }
  return response.json()
}

export async function createAnnouncement(projectId: string, content: string): Promise<Announcement> {
  const response = await authFetch(`${API_URL}/projects/${projectId}/announcements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'Failed to create announcement')
  }
  return response.json()
}

export async function deleteAnnouncement(projectId: string, announcementId: string): Promise<void> {
  const response = await authFetch(`${API_URL}/projects/${projectId}/announcements/${announcementId}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'Failed to delete announcement')
  }
}

export async function createAnnouncementReply(projectId: string, announcementId: string, content: string): Promise<AnnouncementReply> {
  const response = await authFetch(`${API_URL}/projects/${projectId}/announcements/${announcementId}/replies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'Failed to create reply')
  }
  return response.json()
}

export async function deleteAnnouncementReply(projectId: string, announcementId: string, replyId: string): Promise<void> {
  const response = await authFetch(`${API_URL}/projects/${projectId}/announcements/${announcementId}/replies/${replyId}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'Failed to delete reply')
  }
}
