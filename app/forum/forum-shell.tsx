"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownRight, ExternalLink, Flame, LogOut, MessageSquare, MessageSquarePlus, Send, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createBrowserClient } from "@/lib/supabase/client";
import type { CommentWithUser, GameDeal, PostWithUser } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type ForumShellProps = {
  currentUserId: string;
  gameDeals: GameDeal[];
  posts: PostWithUser[];
  username: string;
};

export function ForumShell({ currentUserId, gameDeals, posts, username }: ForumShellProps) {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Comments states
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentsByPost, setCommentsByPost] = useState<Record<string, CommentWithUser[]>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [newCommentTexts, setNewCommentTexts] = useState<Record<string, string>>({});
  
  // Replying target: { [postId]: { parentId: string, replyToUsername: string } | null }
  const [replyTargets, setReplyTargets] = useState<Record<string, { parentId: string; replyToUsername: string } | null>>({});
  // Reply text input: { [parentId]: string }
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  
  const [submittingComments, setSubmittingComments] = useState<Record<string, boolean>>({});

  async function fetchComments(postId: string) {
    setLoadingComments(prev => ({ ...prev, [postId]: true }));
    const { data, error } = await supabase
      .from("comments")
      .select("id, post_id, user_id, parent_id, content, created_at, users(username, email)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    setLoadingComments(prev => ({ ...prev, [postId]: false }));
    if (!error && data) {
      setCommentsByPost(prev => ({
        ...prev,
        [postId]: data as unknown as CommentWithUser[]
      }));
    }
  }

  async function toggleComments(postId: string) {
    const isOpening = !openComments[postId];
    setOpenComments(prev => ({ ...prev, [postId]: isOpening }));
    if (isOpening) {
      await fetchComments(postId);
    }
  }

  async function handleAddComment(postId: string) {
    const text = newCommentTexts[postId];
    if (!text?.trim()) return;

    setSubmittingComments(prev => ({ ...prev, [postId]: true }));
    const { data, error } = await supabase
      .from("comments")
      .insert({
        post_id: postId,
        user_id: currentUserId,
        content: text.trim(),
        parent_id: null
      })
      .select("id, post_id, user_id, parent_id, content, created_at, users(username, email)")
      .single();

    setSubmittingComments(prev => ({ ...prev, [postId]: false }));

    if (!error && data) {
      setNewCommentTexts(prev => ({ ...prev, [postId]: "" }));
      setCommentsByPost(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), data as unknown as CommentWithUser]
      }));
      router.refresh();
    }
  }

  async function handleAddReply(postId: string, parentId: string) {
    const text = replyTexts[parentId];
    if (!text?.trim()) return;

    setSubmittingComments(prev => ({ ...prev, [parentId]: true }));
    const { data, error } = await supabase
      .from("comments")
      .insert({
        post_id: postId,
        user_id: currentUserId,
        content: text.trim(),
        parent_id: parentId
      })
      .select("id, post_id, user_id, parent_id, content, created_at, users(username, email)")
      .single();

    setSubmittingComments(prev => ({ ...prev, [parentId]: false }));

    if (!error && data) {
      setReplyTexts(prev => ({ ...prev, [parentId]: "" }));
      setReplyTargets(prev => ({ ...prev, [postId]: null }));
      setCommentsByPost(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), data as unknown as CommentWithUser]
      }));
      router.refresh();
    }
  }

  async function handleDeleteComment(postId: string, commentId: string) {
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);

    if (!error) {
      setCommentsByPost(prev => {
        const postComments = prev[postId] || [];
        return {
          ...prev,
          [postId]: postComments.filter(c => c.id !== commentId && c.parent_id !== commentId)
        };
      });
      router.refresh();
    }
  }

  const getThreadedComments = useMemo(() => {
    return (commentsList: CommentWithUser[]) => {
      const commentMap = new Map<string, CommentWithUser>();
      commentsList.forEach(c => commentMap.set(c.id, c));

      const topLevel: { comment: CommentWithUser; replies: CommentWithUser[] }[] = [];
      const replies: CommentWithUser[] = [];

      commentsList.forEach(c => {
        if (!c.parent_id) {
          topLevel.push({ comment: c, replies: [] });
        } else {
          replies.push(c);
        }
      });

      replies.forEach(reply => {
        let parent = commentMap.get(reply.parent_id!);
        let root = parent;
        while (root && root.parent_id) {
          root = commentMap.get(root.parent_id);
        }

        if (root) {
          const top = topLevel.find(t => t.comment.id === root!.id);
          if (top) {
            top.replies.push(reply);
          }
        }
      });

      return topLevel;
    };
  }, []);


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

        <section className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-cyan-300" />
            <h2 className="text-lg font-bold text-white">Live Game Deals</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Real-time Steam deal data from the CheapShark public API.
          </p>

          <div className="mt-4 space-y-3">
            {gameDeals.length === 0 && (
              <p className="rounded-xl border border-slate-700/70 bg-slate-950/40 px-4 py-3 text-sm text-slate-400">
                Deals are temporarily unavailable.
              </p>
            )}

            {gameDeals.map((deal) => {
              const savings = Math.round(Number(deal.savings) || 0);

              return (
                <a
                  className="block rounded-xl border border-slate-700/70 bg-slate-950/40 p-4 transition hover:border-cyan-300/50 hover:bg-slate-900/70"
                  href={`https://www.cheapshark.com/redirect?dealID=${deal.dealID}`}
                  key={deal.dealID}
                  rel="noreferrer"
                  target="_blank"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-white">
                      {deal.title}
                    </h3>
                    <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-cyan-300/12 px-2.5 py-1 font-semibold text-cyan-100">
                      ${deal.salePrice}
                    </span>
                    <span className="text-slate-500 line-through">${deal.normalPrice}</span>
                    <span className="rounded-full bg-indigo-400/12 px-2.5 py-1 font-semibold text-indigo-100">
                      {savings}% off
                    </span>
                  </div>
                </a>
              );
            })}
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

          {posts.map((post) => {
            const commentsList = commentsByPost[post.id] || [];
            const commentsCount = post.comments?.length ?? 0;

            return (
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

                {/* Comments Toggle Button */}
                <div className="mt-5 flex items-center gap-4 border-t border-slate-750/30 pt-4 text-xs text-slate-400">
                  <button
                    onClick={() => toggleComments(post.id)}
                    className="flex items-center gap-1.5 hover:text-cyan-300 transition"
                  >
                    <MessageSquare className="h-4 w-4" />
                    {commentsCount} {commentsCount === 1 ? "Comment" : "Comments"}
                  </button>
                </div>

                {/* Expandable Comments Area */}
                {openComments[post.id] && (
                  <div className="mt-5 border-t border-slate-700/40 pt-5 space-y-4">
                    {/* Add Comment Input Form */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleAddComment(post.id);
                      }}
                      className="flex gap-2"
                    >
                      <Input
                        placeholder="Write a comment..."
                        value={newCommentTexts[post.id] || ""}
                        onChange={(e) =>
                          setNewCommentTexts((prev) => ({ ...prev, [post.id]: e.target.value }))
                        }
                        className="h-10 bg-slate-900/40 text-xs"
                        maxLength={500}
                        disabled={submittingComments[post.id]}
                      />
                      <Button
                        type="submit"
                        disabled={!newCommentTexts[post.id]?.trim() || submittingComments[post.id]}
                        className="h-10 px-4 text-xs shrink-0"
                      >
                        Comment
                      </Button>
                    </form>

                    {/* Comments List */}
                    {loadingComments[post.id] ? (
                      <div className="flex justify-center py-6">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                      </div>
                    ) : commentsList.length === 0 ? (
                      <p className="text-xs text-slate-500 py-2">
                        No comments yet. Be the first to comment!
                      </p>
                    ) : (
                      <div className="space-y-4 mt-2 max-h-[400px] overflow-y-auto pr-1">
                        {getThreadedComments(commentsList).map(({ comment, replies }) => (
                          <div key={comment.id} className="space-y-2">
                            {/* Parent Comment */}
                            <div className="flex gap-3 items-start">
                              <div className="grid h-8 w-8 place-items-center rounded-full bg-indigo-500/10 text-xs font-black text-indigo-300 ring-1 ring-indigo-500/20 shrink-0">
                                {(comment.users?.username ?? "P").slice(0, 1).toUpperCase()}
                              </div>
                              <div className="flex-1 bg-slate-900/30 rounded-xl p-3 border border-slate-800/60">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs font-semibold text-slate-200">
                                    {comment.users?.username ?? "Player"}
                                  </span>
                                  <span className="text-[10px] text-slate-500">
                                    {formatDate(comment.created_at)}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-300 mt-1.5 whitespace-pre-wrap break-words">
                                  {comment.content}
                                </p>
                                <div className="flex gap-3 mt-2 text-[10px]">
                                  <button
                                    onClick={() =>
                                      setReplyTargets((prev) => ({
                                        ...prev,
                                        [post.id]: {
                                          parentId: comment.id,
                                          replyToUsername: comment.users?.username ?? "Player"
                                        }
                                      }))
                                    }
                                    className="text-slate-400 hover:text-cyan-300 transition"
                                  >
                                    Reply
                                  </button>
                                  {comment.user_id === currentUserId && (
                                    <button
                                      onClick={() => handleDeleteComment(post.id, comment.id)}
                                      className="text-slate-500 hover:text-rose-400 transition"
                                    >
                                      Delete
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Replies container */}
                            {replies.length > 0 && (
                              <div className="ml-10 space-y-2 border-l border-slate-800/80 pl-4">
                                {replies.map((reply) => {
                                  const parentComment = commentsList.find(
                                    (c) => c.id === reply.parent_id
                                  );
                                  const isReplyingToSubReply = reply.parent_id !== comment.id;

                                  return (
                                    <div key={reply.id} className="flex gap-3 items-start">
                                      <div className="grid h-7 w-7 place-items-center rounded-full bg-cyan-500/10 text-[10px] font-black text-cyan-300 ring-1 ring-cyan-500/20 shrink-0">
                                        {(reply.users?.username ?? "P").slice(0, 1).toUpperCase()}
                                      </div>
                                      <div className="flex-1 bg-slate-900/20 rounded-xl p-2.5 border border-slate-800/30">
                                        <div className="flex justify-between items-center">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-xs font-semibold text-slate-300">
                                              {reply.users?.username ?? "Player"}
                                            </span>
                                            {isReplyingToSubReply && parentComment && (
                                              <span className="text-[10px] text-slate-500 font-medium">
                                                reply to{" "}
                                                <span className="text-cyan-400/80">
                                                  @{parentComment.users?.username}
                                                </span>
                                              </span>
                                            )}
                                          </div>
                                          <span className="text-[10px] text-slate-500">
                                            {formatDate(reply.created_at)}
                                          </span>
                                        </div>
                                        <p className="text-xs text-slate-300 mt-1 whitespace-pre-wrap break-words">
                                          {reply.content}
                                        </p>
                                        <div className="flex gap-3 mt-1.5 text-[10px]">
                                          <button
                                            onClick={() =>
                                              setReplyTargets((prev) => ({
                                                ...prev,
                                                [post.id]: {
                                                  parentId: reply.id,
                                                  replyToUsername: reply.users?.username ?? "Player"
                                                }
                                              }))
                                            }
                                            className="text-slate-400 hover:text-cyan-300 transition"
                                          >
                                            Reply
                                          </button>
                                          {reply.user_id === currentUserId && (
                                            <button
                                              onClick={() =>
                                                handleDeleteComment(post.id, reply.id)
                                              }
                                              className="text-slate-500 hover:text-rose-450 transition"
                                            >
                                              Delete
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Active reply input form for this parent comment thread */}
                            {replyTargets[post.id] &&
                              (replyTargets[post.id]?.parentId === comment.id ||
                                replies.some((r) => r.id === replyTargets[post.id]?.parentId)) && (
                                <div className="ml-10 mt-2">
                                  <form
                                    onSubmit={(e) => {
                                      e.preventDefault();
                                      handleAddReply(post.id, replyTargets[post.id]!.parentId);
                                    }}
                                    className="space-y-2"
                                  >
                                    <div className="flex gap-2 items-center">
                                      <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                        <CornerDownRight className="h-3 w-3 text-slate-500" />
                                        Reply to{" "}
                                        <span className="text-cyan-400">
                                          @{replyTargets[post.id]?.replyToUsername}
                                        </span>
                                        :
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setReplyTargets((prev) => ({ ...prev, [post.id]: null }))
                                        }
                                        className="text-[10px] text-slate-500 hover:text-slate-350 transition"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                    <div className="flex gap-2">
                                      <Input
                                        placeholder={`Reply to @${replyTargets[post.id]?.replyToUsername}...`}
                                        value={replyTexts[replyTargets[post.id]!.parentId] || ""}
                                        onChange={(e) => {
                                          const targetId = replyTargets[post.id]!.parentId;
                                          setReplyTexts((prev) => ({
                                            ...prev,
                                            [targetId]: e.target.value
                                          }));
                                        }}
                                        className="h-9 bg-slate-900/40 text-xs"
                                        maxLength={500}
                                        disabled={submittingComments[replyTargets[post.id]!.parentId]}
                                        autoFocus
                                      />
                                      <Button
                                        type="submit"
                                        disabled={
                                          !replyTexts[replyTargets[post.id]!.parentId]?.trim() ||
                                          submittingComments[replyTargets[post.id]!.parentId]
                                        }
                                        className="h-9 px-3 text-xs shrink-0"
                                      >
                                        Send
                                      </Button>
                                    </div>
                                  </form>
                                </div>
                              )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
