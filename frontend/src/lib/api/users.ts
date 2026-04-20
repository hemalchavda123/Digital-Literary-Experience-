import { authFetch } from "./authFetch";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export async function getCurrentUser() {
  const res = await authFetch(`${API_BASE_URL}/auth/me`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = errorData.error?.message || errorData.error || errorData.message || "Failed to fetch user profile";
    throw new Error(message);
  }
  return res.json();
}

export async function updateProfileImage(profileImage: string) {
  const res = await authFetch(`${API_BASE_URL}/users/profile-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profileImage }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = errorData.details || errorData.error?.message || errorData.error || errorData.message || "Failed to update profile image";
    throw new Error(message);
  }

  return res.json();
}
