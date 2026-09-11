"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Mail, Lock, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, resetPassword, user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);

  // Redirect if already authenticated
  if (user && !authLoading) {
    router.push("/dashboard");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn(email, password);
      if (result.success) {
        router.push("/dashboard");
      } else {
        setError(result.error?.message ?? "Invalid email or password. Please try again.");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await resetPassword(resetEmail);
      if (result.success) {
        setResetSuccess(true);
      } else {
        setError(result.error?.message ?? "Failed to send reset email.");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  if (showReset) {
    return (
      <div className="grid min-h-screen lg:grid-cols-2">
        <div className="relative flex flex-col justify-between bg-asg-navy px-8 py-12 text-white lg:px-16">
          <div>
            <div className="flex flex-col">
              <span className="text-2xl font-semibold tracking-tight">ASG Leads</span>
              <span className="text-xs uppercase tracking-[0.14em] text-asg-gold">Amplify Solutions Group</span>
            </div>
          </div>
          <div className="max-w-md">
            <h1 className="text-balance text-3xl font-semibold leading-tight lg:text-4xl">
              Reset your password
            </h1>
            <p className="mt-6 text-base leading-relaxed text-white/60">
              Enter your email address and we&apos;ll send you a link to reset your password.
            </p>
          </div>
          <div className="text-xs text-white/40">
            &copy; {new Date().getFullYear()} Amplify Solutions Group. Internal use only.
          </div>
        </div>

        <div className="flex items-center justify-center px-6 py-12 lg:px-16">
          <div className="w-full max-w-md">
            <div className="text-center lg:text-left">
              <h2 className="text-2xl font-semibold text-asg-text">Password Reset</h2>
              <p className="mt-2 text-sm text-asg-text-secondary">Enter your email to receive a reset link.</p>
            </div>

            {resetSuccess ? (
              <div className="mt-8 rounded-lg border border-asg-success/20 bg-asg-success-subtle px-4 py-3 text-sm text-asg-success">
                Password reset email sent. Check your inbox.
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="mt-8 space-y-5">
                {error && (
                  <div className="rounded-lg border border-asg-danger/20 bg-asg-danger-subtle px-4 py-3 text-sm text-asg-danger">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="reset-email" className="block text-sm font-medium text-asg-text">
                    Email address
                  </label>
                  <div className="relative mt-1.5">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-asg-text-muted" />
                    <input
                      id="reset-email"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="asg-input pl-10"
                      placeholder="you@amplifysolutions.com.au"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="asg-button-primary w-full"
                >
                  {isLoading ? "Sending..." : "Send Reset Link"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowReset(false)}
                  className="w-full text-center text-sm text-asg-gold-dark hover:text-asg-gold"
                >
                  Back to sign in
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative flex flex-col justify-between bg-asg-navy px-8 py-12 text-white lg:px-16">
        <div>
          <div className="flex flex-col">
            <span className="text-2xl font-semibold tracking-tight">ASG Leads</span>
            <span className="text-xs uppercase tracking-[0.14em] text-asg-gold">Amplify Solutions Group</span>
          </div>
        </div>

        <div className="max-w-md">
          <h1 className="text-balance text-3xl font-semibold leading-tight lg:text-4xl">
            Lead operations platform for premium finance and property professionals.
          </h1>
          <p className="mt-6 text-base leading-relaxed text-white/60">
            Capture, qualify, call, book and report across Perth and Brisbane. Built for the field, the office and the boardroom.
          </p>
        </div>

        <div className="text-xs text-white/40">
          &copy; {new Date().getFullYear()} Amplify Solutions Group. Internal use only.
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-md">
          <div className="text-center lg:text-left">
            <h2 className="text-2xl font-semibold text-asg-text">Sign in</h2>
            <p className="mt-2 text-sm text-asg-text-secondary">Enter your ASG account details to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {error && (
              <div className="rounded-lg border border-asg-danger/20 bg-asg-danger-subtle px-4 py-3 text-sm text-asg-danger">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-asg-text">
                Email address
              </label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-asg-text-muted" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="asg-input pl-10"
                  placeholder="you@amplifysolutions.com.au"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-asg-text">
                Password
              </label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-asg-text-muted" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="asg-input pl-10"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-asg-text-secondary">
                <input type="checkbox" className="h-4 w-4 rounded border-asg-border text-asg-gold focus:ring-asg-gold" />
                Remember me
              </label>
              <button type="button" onClick={() => setShowReset(true)} className="font-medium text-asg-gold-dark hover:text-asg-gold">
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="asg-button-primary w-full"
            >
              {isLoading ? "Signing in..." : "Sign in"}
              {!isLoading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
