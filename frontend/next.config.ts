import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "unsafe-none",
          },
        ],
      },
    ];
  },
  async rewrites() {
    // INTERNAL_BACKEND_URL should point to the local Express server (e.g., http://127.0.0.1:5000).
    // NEVER fallback to a public domain (like https://exegesis.dau.ac.in), otherwise Next.js
    // proxies requests back to its own public URL, causing a circular proxy loop and ECONNRESET.
    const backendUrl =
      process.env.INTERNAL_BACKEND_URL ||
      (process.env.NEXT_PUBLIC_API_URL &&
      (process.env.NEXT_PUBLIC_API_URL.startsWith("http://localhost") ||
        process.env.NEXT_PUBLIC_API_URL.startsWith("http://127.0.0.1"))
        ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, "")
        : "http://127.0.0.1:5000");

    return [
      {
        source: "/socket.io/:path*",
        destination: `${backendUrl}/socket.io/:path*`,
      },
    ];
  },
};

export default nextConfig;
