"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing reset token");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Invalid or missing reset token");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, newPassword: password }),
      });

      // Check if response has content before parsing
      const contentType = response.headers.get("content-type");
      let result: any = null;

      if (contentType && contentType.includes("application/json")) {
        const text = await response.text();
        if (text) {
          try {
            result = JSON.parse(text);
          } catch {
            // If parsing fails, treat as empty response
            result = null;
          }
        }
      }

      if (!response.ok) {
        setError(
          result?.error?.message ||
            result?.message ||
            "Failed to reset password",
        );
      } else {
        setSuccess(true);
        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a]">
        <div className="w-full max-w-sm space-y-6 rounded border border-[#1f1f1f] bg-[#141414] p-6">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold text-gray-100">
              Invalid Reset Link
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              This password reset link is invalid or has expired.
            </p>
          </div>
          <Link
            href="/forgot-password"
            className="block w-full rounded bg-[#1a1a1a] px-4 py-2 text-center font-semibold text-sm text-gray-300 transition hover:bg-[#222]"
          >
            Request New Reset Link
          </Link>
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

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a]">
      <div className="w-full max-w-sm space-y-6 rounded border border-[#1f1f1f] bg-[#141414] p-6">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-100">
            Reset Password
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Enter your new password below.
          </p>
        </div>

        {success ? (
          <div className="space-y-4">
            <div className="rounded border border-green-900/30 bg-green-950/20 p-3 text-sm text-green-400">
              Password reset successfully! Redirecting to sign in...
            </div>
            <Link
              href="/login"
              className="block w-full rounded bg-[#1a1a1a] px-4 py-2 text-center font-semibold text-sm text-gray-300 transition hover:bg-[#222]"
            >
              Go to Sign In
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
                htmlFor="password"
                className="block text-sm font-medium text-gray-500"
              >
                New Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded border border-[#252525] bg-[#0f0f0f] px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-[#333] focus:outline-none"
                placeholder="••••••••"
                minLength={8}
              />
              <p className="mt-1 text-xs text-gray-500">
                Must be at least 8 characters long
              </p>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-500"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full rounded border border-[#252525] bg-[#0f0f0f] px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-[#333] focus:outline-none"
                placeholder="••••••••"
                minLength={8}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-[#1a1a1a] px-4 py-2 font-semibold text-sm text-gray-300 transition hover:bg-[#222] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Resetting..." : "Reset Password"}
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

