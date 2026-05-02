import { User } from './project'

export interface AnnouncementReply {
  id: string
  announcementId: string
  userId: string
  content: string
  createdAt: string
  updatedAt: string
  user?: User
}

export interface Announcement {
  id: string
  projectId: string
  content: string
  createdAt: string
  updatedAt: string
  replies?: AnnouncementReply[]
}
