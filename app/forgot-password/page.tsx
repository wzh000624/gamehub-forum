import Link from "next/link";
import { Logo } from "@/components/logo";

export default function ForgotPasswordPage() {
  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <section className="glass w-full max-w-md rounded-2xl p-6 shadow-2xl">
        <Logo />
        <h1 className="mt-8 text-3xl font-black text-white">Forgot password</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          This entry is reserved for the MVP. A Supabase password reset email flow can be added for production.
        </p>
        <Link
          className="neon-button mt-8 inline-flex h-11 w-full items-center justify-center rounded-xl text-sm font-semibold text-white"
          href="/login"
        >
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
