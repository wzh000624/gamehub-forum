import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { createServerClient } from "@/lib/supabase/server";
import { RegisterForm } from "./register-form";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
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
          <h1 className="text-3xl font-black text-white">Create your GameHub account</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Sign up and enter the forum to publish your first game discussion.
          </p>
        </div>
        <RegisterForm />
      </section>
    </main>
  );
}
