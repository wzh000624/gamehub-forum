"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createBrowserClient } from "@/lib/supabase/client";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const emailError = useMemo(() => {
    if (!email) return "";
    return emailPattern.test(email) ? "" : "Please enter a valid email address.";
  }, [email]);

  const passwordError = useMemo(() => {
    if (!password) return "";
    return password.length >= 6 ? "" : "Password must be at least 6 characters.";
  }, [password]);

  const canSubmit = emailPattern.test(email) && password.length >= 6 && !loading;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    setLoading(false);

    if (error) {
      setMessage("Email or password is incorrect. Please try again.");
      return;
    }

    router.push("/forum");
    router.refresh();
  }

  return (
    <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
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
        {emailError && <p className="mt-2 text-xs text-rose-300">{emailError}</p>}
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-300">Password</span>
        <Input
          autoComplete="current-password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 6 characters"
          type="password"
          value={password}
        />
        {passwordError && <p className="mt-2 text-xs text-rose-300">{passwordError}</p>}
      </label>
      {message && (
        <p className="rounded-xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {message}
        </p>
      )}
      <Button className="w-full" disabled={!canSubmit} type="submit">
        <LogIn className="h-4 w-4" />
        {loading ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
