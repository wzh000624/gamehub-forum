import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { getLiveGameDeals } from "@/lib/game-deals";
import { createServerClient } from "@/lib/supabase/server";
import type { PostWithUser } from "@/lib/types";
import { ForumShell } from "./forum-shell";

export const dynamic = "force-dynamic";

export default async function ForumPage() {
  const supabase = createServerClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const [{ data: profile }, { data: posts }, gameDeals] = await Promise.all([
    supabase
      .from("users")
      .select("id, username, email, created_at, avatar_url")
      .eq("id", session.user.id)
      .single(),
    supabase
      .from("posts")
      .select("id, user_id, title, content, created_at, likes_count, users(username, email, avatar_url), comments(id), likes(user_id)")
      .order("created_at", { ascending: false }),
    getLiveGameDeals()
  ]);

  const normalizedPosts = ((posts ?? []) as Array<
    Omit<PostWithUser, "users"> & {
      users: PostWithUser["users"] | PostWithUser["users"][];
    }
  >).map((post) => ({
    ...post,
    users: Array.isArray(post.users) ? post.users[0] ?? null : post.users
  }));

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <nav className="glass flex flex-wrap items-center justify-between gap-4 rounded-2xl px-4 py-4">
          <Logo />
          <div className="flex items-center gap-3">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="h-10 w-10 rounded-full object-cover border border-cyan-300/30"
              />
            ) : (
              <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-indigo-400 to-cyan-300 text-sm font-black text-slate-950">
                {(profile?.username ?? session.user.email ?? "P").slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-white">
                {profile?.username ?? "Player"}
              </p>
              <p className="text-xs text-slate-400">{session.user.email}</p>
            </div>
          </div>
        </nav>
        <ForumShell
          currentUserId={session.user.id}
          gameDeals={gameDeals}
          posts={normalizedPosts}
          username={profile?.username ?? "Player"}
          profileAvatarUrl={profile?.avatar_url}
        />
      </div>
    </main>
  );
}
