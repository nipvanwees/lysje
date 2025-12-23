"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "~/server/better-auth/client";

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const result = await authClient.signIn.email({
          email,
          password,
        });
        if (result.error) {
          //@ts-expect-error set
          setError(result.error.message);
        } else {
          router.push("/");
          router.refresh();
        }
      } else {
        const result = await authClient.signUp.email({
          email,
          password,
          name,
        });
        if (result.error) {
          //@ts-expect-error set
          setError(result.error.message);
        } else {
          router.push("/");
          router.refresh();
        }
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
            {isLogin ? "Sign In" : "Sign Up"}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {isLogin
              ? "Welcome back! Please sign in to your account."
              : "Create a new account to get started."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="rounded border border-red-900/30 bg-red-950/20 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {!isLogin && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-500">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required={!isLogin}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded border border-[#252525] bg-[#0f0f0f] px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-[#333] focus:outline-none"
                placeholder="Your name"
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-500">
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

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-500">
              Password
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
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-[#1a1a1a] px-4 py-2 font-semibold text-sm text-gray-300 transition hover:bg-[#222] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Please wait..." : isLogin ? "Sign In" : "Sign Up"}
          </button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="text-sm text-gray-600 underline hover:text-gray-400"
          >
            {isLogin
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </main>
  );
}
