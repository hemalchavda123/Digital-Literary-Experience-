import { authFetch } from './authFetch';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  systemRole: 'USER' | 'ADMIN' | 'SUPERADMIN';
  isVerified: boolean;
  createdAt: string;
  _count?: {
    projects: number;
    projectMemberships: number;
    quizSubmissions: number;
  };
}

export interface AdminProject {
  id: string;
  name: string;
  ownerId: string;
  allowedEmailPatterns?: string | null;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    username: string;
    email: string;
    systemRole: string;
  };
  _count?: {
    members: number;
    documents: number;
    quizzes: number;
  };
}

export interface AdminStats {
  isSuperAdmin: boolean;
  totalUsers: number;
  totalSuperAdmins: number;
  totalAdmins: number;
  totalProjects: number;
  totalSubmissions: number;
  platformEmailPattern: string | null;
}

export async function adminLogin(email: string, password: string) {
  const res = await fetch(`${API_BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error?.message || errorData?.error || 'Admin login failed');
  }

  const data = await res.json();
  if (data.accessToken) {
    // Store access token in cookie
    const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
    document.cookie = `accessToken=${data.accessToken}; path=/; max-age=3600; SameSite=Strict${isSecure ? '; Secure' : ''}`;
    if (data.refreshToken) {
      document.cookie = `refreshToken=${data.refreshToken}; path=/; max-age=${7 * 86400}; SameSite=Strict${isSecure ? '; Secure' : ''}`;
    }
  }
  return data;
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const res = await authFetch(`${API_BASE}/admin/stats`);
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error?.message || err?.error || 'Failed to fetch admin stats');
  }
  return res.json();
}

export async function fetchAdminProjects(): Promise<AdminProject[]> {
  const res = await authFetch(`${API_BASE}/admin/projects`);
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error?.message || err?.error || 'Failed to fetch admin projects');
  }
  return res.json();
}

export async function updateProjectAccessRules(projectId: string, allowedEmailPatterns: string | null) {
  const res = await authFetch(`${API_BASE}/admin/projects/${projectId}/access-rules`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ allowedEmailPatterns }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error?.message || err?.error || 'Failed to update access rules');
  }
  return res.json();
}

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const res = await authFetch(`${API_BASE}/admin/users`);
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error?.message || err?.error || 'Failed to fetch users');
  }
  return res.json();
}

export async function updateUserSystemRole(userId: string, systemRole: 'USER' | 'ADMIN' | 'SUPERADMIN') {
  const res = await authFetch(`${API_BASE}/admin/users/${userId}/role`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemRole }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error?.message || err?.error || 'Failed to update user role');
  }
  return res.json();
}

export async function fetchPlatformSettings(): Promise<Record<string, string>> {
  const res = await authFetch(`${API_BASE}/admin/settings`);
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error?.message || err?.error || 'Failed to fetch platform settings');
  }
  return res.json();
}

export async function updatePlatformSetting(key: string, value: string) {
  const res = await authFetch(`${API_BASE}/admin/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error?.message || err?.error || 'Failed to update setting');
  }
  return res.json();
}
