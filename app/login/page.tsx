import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { createServerClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const supabase = createServerClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (session) {
    redirect("/forum");
  }

  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <section className="glass w-full max-w-md rounded-2xl p-6 shadow-2xl">
        <Logo />
        <div className="mt-8">
          <h1 className="text-3xl font-black text-white">Sign in to GameHub</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Join GameHub to post messages, find teammates, and discuss games with campus players.
          </p>
        </div>
        <LoginForm />
        <div className="mt-6 flex items-center justify-between text-sm text-slate-400">
          <Link className="text-indigo-300 hover:text-indigo-200" href="/register">
            Create account
          </Link>
          <Link className="hover:text-slate-200" href="/forgot-password">
            Forgot password
          </Link>
        </div>
      </section>
    </main>
  );
}
