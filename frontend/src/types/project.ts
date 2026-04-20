export type Role = 'VIEWER' | 'EDITOR' | 'OWNER';

export type User = {
  id: string;
  username: string;
  email?: string;
}

export type ProjectMember = {
  id: string;
  projectId: string;
  userId: string;
  role: Role;
  createdAt: string;
  user?: User;
}

export type ProjectInvite = {
  id: string;
  projectId: string;
  token: string;
  role: Role;
  expiresAt?: string;
}

export type Project = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  ownerId?: string
  owner?: User
  members?: ProjectMember[]
}
