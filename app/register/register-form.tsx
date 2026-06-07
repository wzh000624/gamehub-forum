"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createBrowserClient } from "@/lib/supabase/client";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RegisterForm() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const validation = useMemo(() => {
    return {
      username: username.trim().length >= 2 ? "" : "Username must be at least 2 characters.",
      email: !email || emailPattern.test(email) ? "" : "Please enter a valid email address.",
      password: !password || password.length >= 6 ? "" : "Password must be at least 6 characters.",
      confirm:
        !confirmPassword || password === confirmPassword ? "" : "Passwords do not match."
    };
  }, [confirmPassword, email, password, username]);

  const canSubmit =
    username.trim().length >= 2 &&
    emailPattern.test(email) &&
    password.length >= 6 &&
    password === confirmPassword &&
    !loading;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username.trim()
        },
        emailRedirectTo: `${location.origin}/auth/callback`
      }
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push("/forum");
    router.refresh();
  }

  return (
    <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-300">Username</span>
        <Input
          autoComplete="nickname"
          maxLength={24}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="e.g. TopLaneAce"
          value={username}
        />
        {username && validation.username && (
          <p className="mt-2 text-xs text-rose-300">{validation.username}</p>
        )}
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-300">Email</span>
        <Input
          autoComplete="email"
          inputMode="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="player@campus.edu"
          type="email"
          value={email}
        />
        {validation.email && <p className="mt-2 text-xs text-rose-300">{validation.email}</p>}
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-300">Password</span>
        <Input
          autoComplete="new-password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 6 characters"
          type="password"
          value={password}
        />
        {validation.password && (
          <p className="mt-2 text-xs text-rose-300">{validation.password}</p>
        )}
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-300">Confirm password</span>
        <Input
          autoComplete="new-password"
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Enter your password again"
          type="password"
          value={confirmPassword}
        />
        {validation.confirm && (
          <p className="mt-2 text-xs text-rose-300">{validation.confirm}</p>
        )}
      </label>
      {message && (
        <p className="rounded-xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {message}
        </p>
      )}
      <Button className="w-full" disabled={!canSubmit} type="submit">
        <UserPlus className="h-4 w-4" />
        {loading ? "Creating account..." : "Create account"}
      </Button>
      <p className="text-center text-sm text-slate-400">
        Already have an account?
        <Link className="ml-1 text-indigo-300 hover:text-indigo-200" href="/login">
          Sign in
        </Link>
      </p>
    </form>
  );
}
