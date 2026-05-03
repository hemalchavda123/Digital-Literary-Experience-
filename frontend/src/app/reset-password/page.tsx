"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Footer from "@/components/Footer";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  async function handleResetPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    if (!token) {
      setMessage({ text: "Invalid or missing reset token.", type: "error" });
      setIsSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ text: "Passwords do not match.", type: "error" });
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errMsg = data?.error?.message || "Reset failed";
        setMessage({ text: errMsg, type: "error" });
      } else {
        setMessage({ text: "Password reset successful. Redirecting to login...", type: "success" });
        setTimeout(() => {
          router.push("/signup2");
        }, 2000);
      }
    } catch {
      setMessage({ text: "Network error. Is the backend running?", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleResetPassword} className="animate-in flex-1 flex flex-col w-full sm:max-w-md mx-auto justify-center pt-24 gap-4 text-foreground relative z-10">
      <h1 className="text-2xl sm:text-4xl font-bold mb-4 sm:mb-6 text-center bg-clip-text" style={{ backgroundImage: 'linear-gradient(to right,#16a34a,#14b8a6)', color: 'transparent' }}>
        Enter New Password
      </h1>

      <p className="text-center text-sm mb-4 sm:mb-6" style={{ color: '#111827' }}>
        Please enter your new password below.
      </p>

      {message && (
        <div style={{
          padding: "10px 14px",
          borderRadius: 10,
          fontSize: 13,
          marginBottom: 14,
          backgroundColor: message.type === "error" ? "#fef2f2" : "#f0fdf4",
          color: message.type === "error" ? "#991b1b" : "#166534",
          border: `1px solid ${message.type === "error" ? "#fecaca" : "#bbf7d0"}`,
          textAlign: "center"
        }}>
          {message.text}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-sm sm:text-md text-center" htmlFor="password">
          New Password
        </label>
        <input
          type="password"
          className="rounded-md px-3 sm:px-4 py-2 bg-white border mb-2 text-sm sm:text-base text-center text-black"
          name="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm sm:text-md text-center" htmlFor="confirmPassword">
          Confirm Password
        </label>
        <input
          type="password"
          className="rounded-md px-3 sm:px-4 py-2 bg-white border mb-6 text-sm sm:text-base text-center text-black"
          name="confirmPassword"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md px-3 sm:px-4 py-2 mb-2 transition-colors duration-200 text-sm sm:text-base disabled:opacity-70 disabled:cursor-not-allowed"
        style={{ backgroundColor: '#16a34a', color: '#ffffff' }}
      >
        {isSubmitting ? "Resetting..." : "Reset Password"}
      </button>
    </form>
  );
}

export default function ResetPassword() {
  return (
    <div className="flex-1 flex flex-col w-full px-4 sm:px-8 justify-center gap-2 mx-auto min-h-screen" style={{ backgroundImage: 'url(/login_background.jpeg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(255,255,255,0.8)' }}></div>
      <Suspense fallback={<div className="relative z-10 text-center text-black">Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
      <div className="relative z-10 mt-auto">
        <Footer />
      </div>
    </div>
  );
}
