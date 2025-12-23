"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const response = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, redirectTo }),
      });

      // Check if response has content before parsing
      const contentType = response.headers.get("content-type");
      let result: { error?: { message?: string }; message?: string } | null = null;

      if (contentType?.includes("application/json")) {
        const text = await response.text();
        if (text) {
          try {
            result = JSON.parse(text) as { error?: { message?: string }; message?: string };
          } catch {
            // If parsing fails, treat as empty response
            result = null;
          }
        }
      }

      if (!response.ok) {
        setError(
          result?.error?.message ??
            result?.message ??
            "Failed to send reset email",
        );
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a]">
      <div className="w-full max-w-sm space-y-6 rounded border border-[#1f1f1f] bg-[#141414] p-6">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-100">
            Forgot Password
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Enter your email address and we&apos;ll send you a link to reset your
            password.
          </p>
        </div>

        {success ? (
          <div className="space-y-4">
            <div className="rounded border border-green-900/30 bg-green-950/20 p-3 text-sm text-green-400">
              Password reset email sent! Please check your inbox and follow the
              instructions to reset your password.
            </div>
            <Link
              href="/login"
              className="block w-full rounded bg-[#1a1a1a] px-4 py-2 text-center font-semibold text-sm text-gray-300 transition hover:bg-[#222]"
            >
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && (
              <div className="rounded border border-red-900/30 bg-red-950/20 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-500"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded border border-[#252525] bg-[#0f0f0f] px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-[#333] focus:outline-none"
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-[#1a1a1a] px-4 py-2 font-semibold text-sm text-gray-300 transition hover:bg-[#222] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}

        <div className="text-center">
          <Link
            href="/login"
            className="text-sm text-gray-600 underline hover:text-gray-400"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}

