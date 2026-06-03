"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, MessageSquarePlus, Send, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createBrowserClient } from "@/lib/supabase/client";
import type { PostWithUser } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type ForumShellProps = {
  currentUserId: string;
  posts: PostWithUser[];
  username: string;
};

export function ForumShell({ currentUserId, posts, username }: ForumShellProps) {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const stats = useMemo(
    () => ({
      posts: posts.length,
      players: new Set(posts.map((post) => post.user_id)).size || 1
    }),
    [posts]
  );

  const canPost =
    title.trim().length > 0 &&
    title.trim().length <= 50 &&
    content.trim().length > 0 &&
    content.trim().length <= 1000 &&
    !loading;

  async function handlePost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canPost) return;

    setLoading(true);
    setMessage("");

    const { error } = await supabase.from("posts").insert({
      user_id: currentUserId,
      title: title.trim(),
      content: content.trim()
    });

    setLoading(false);

    if (error) {
      setMessage("Failed to publish. Please check database permissions or try again later.");
      return;
    }

    setTitle("");
    setContent("");
    router.refresh();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <aside className="space-y-6">
        <section className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Current Player</p>
              <h2 className="mt-1 text-2xl font-black text-white">{username}</h2>
            </div>
            <Button aria-label="Sign out" onClick={handleLogout} variant="danger">
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-700/70 bg-slate-950/40 p-4">
              <p className="text-2xl font-black text-white">{stats.posts}</p>
              <p className="mt-1 text-xs text-slate-400">Posts</p>
            </div>
            <div className="rounded-xl border border-slate-700/70 bg-slate-950/40 p-4">
              <p className="text-2xl font-black text-white">{stats.players}</p>
              <p className="mt-1 text-xs text-slate-400">Players</p>
            </div>
          </div>
        </section>

        <form className="glass rounded-2xl p-5" onSubmit={handlePost}>
          <div className="flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5 text-indigo-300" />
            <h2 className="text-lg font-bold text-white">Create Post</h2>
          </div>
          <label className="mt-5 block">
            <span className="mb-2 block text-sm font-medium text-slate-300">
              Title
            </span>
            <Input
              maxLength={50}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What game do you want to discuss?"
              value={title}
            />
            <p className="mt-2 text-right text-xs text-slate-500">
              {title.length}/50
            </p>
          </label>
          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-medium text-slate-300">
              Content
            </span>
            <Textarea
              maxLength={1000}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Share team-up requests, strategies, esports talk, or hot takes..."
              value={content}
            />
            <p className="mt-2 text-right text-xs text-slate-500">
              {content.length}/1000
            </p>
          </label>
          {message && (
            <p className="mt-4 rounded-xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {message}
            </p>
          )}
          <Button className="mt-5 w-full" disabled={!canPost} type="submit">
            <Send className="h-4 w-4" />
            {loading ? "Publishing..." : "Publish Post"}
          </Button>
        </form>
      </aside>

      <section className="glass min-h-[560px] rounded-2xl p-5">
        <div className="flex items-end justify-between gap-4 border-b border-slate-700/60 pb-4">
          <div>
            <h1 className="text-2xl font-black text-white">Forum Board</h1>
            <p className="mt-1 text-sm text-slate-400">
              Campus players are sharing strategies, forming teams, and talking esports here.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {posts.length === 0 && (
            <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-slate-700">
              <p className="text-sm text-slate-400">No posts yet. Start the first discussion.</p>
            </div>
          )}

          {posts.map((post) => (
            <article
              className="rounded-2xl border border-slate-700/70 bg-slate-950/42 p-5"
              key={post.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-cyan-300/14 text-sm font-black text-cyan-100 ring-1 ring-cyan-200/20">
                    {(post.users?.username ?? "P").slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-white">
                      {post.users?.username ?? "Anonymous Player"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDate(post.created_at)}
                    </p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-1 rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">
                  <ThumbsUp className="h-3.5 w-3.5" />
                  {post.likes_count ?? 0}
                </div>
              </div>
              <h2 className="mt-4 text-xl font-bold text-white">{post.title}</h2>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-300">
                {post.content}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
