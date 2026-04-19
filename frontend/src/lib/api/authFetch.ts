/**
 * Helper to get a cookie value by name (client-side).
 */
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? match[1] : null;
}

/**
 * Set a cookie value (client-side).
 */
function setCookie(name: string, value: string, maxAgeSeconds: number) {
  document.cookie = `${name}=${value}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

/**
 * Attempt to refresh the access token using the stored refresh token.
 * Returns the new access token, or null if refresh failed.
 */
async function tryRefreshToken(): Promise<string | null> {
  const refreshToken = getCookie("refreshToken");
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (data.accessToken) {
      // Store the new access token (1 hour)
      setCookie("accessToken", data.accessToken, 60 * 60);
      return data.accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Wrapper around fetch that automatically attaches the JWT Authorization header.
 * If the request gets a 401, automatically tries to refresh the token and retry.
 */
export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let token = getCookie("accessToken");

  // Build headers by merging existing init headers with the auth token
  function buildHeaders(authToken: string | null): Record<string, string> {
    const headers: Record<string, string> = {};

    if (init?.headers) {
      if (init.headers instanceof Headers) {
        init.headers.forEach((value, key) => {
          headers[key] = value;
        });
      } else if (Array.isArray(init.headers)) {
        for (const [key, value] of init.headers) {
          headers[key] = value;
        }
      } else {
        Object.assign(headers, init.headers);
      }
    }

    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    return headers;
  }

  // First attempt
  const res = await fetch(input, { ...init, headers: buildHeaders(token) });

  // If we get a 401 and have a refresh token, try to refresh and retry
  if (res.status === 401) {
    const newToken = await tryRefreshToken();
    if (newToken) {
      // Retry the original request with the new token
      return fetch(input, { ...init, headers: buildHeaders(newToken) });
    }

    // Refresh failed — redirect to login
    if (typeof window !== "undefined") {
      // Clear expired tokens
      setCookie("accessToken", "", 0);
      setCookie("refreshToken", "", 0);
      window.location.href = "/signup2";
    }
  }

  return res;
}
