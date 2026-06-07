"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  CornerDownRight,
  ExternalLink,
  Flame,
  Heart,
  LogOut,
  MessageSquare,
  MessageSquarePlus,
  Send,
  Trash2
} from "lucide-react";
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
  profileAvatarUrl?: string;
};

export function ForumShell({
  currentUserId,
  gameDeals,
  posts,
  username,
  profileAvatarUrl
}: ForumShellProps) {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Avatar states
  const [avatarUrl, setAvatarUrl] = useState(profileAvatarUrl);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Comments states
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentsByPost, setCommentsByPost] = useState<Record<string, CommentWithUser[]>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [newCommentTexts, setNewCommentTexts] = useState<Record<string, string>>({});

  // Replying target: { [postId]: { parentId: string, replyToUsername: string } | null }
  const [replyTargets, setReplyTargets] = useState<
    Record<string, { parentId: string; replyToUsername: string } | null>
  >({});
  // Reply text input: { [parentId]: string }
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});

  const [submittingComments, setSubmittingComments] = useState<Record<string, boolean>>({});

  // Calculate statistics
  const stats = useMemo(
    () => ({
      posts: posts.length,
      players: new Set(posts.map((post) => post.user_id)).size || 1
    }),
    [posts]
  );

  // Calculate Leaderboard (Top 5 Liked Posts)
  const leaderboard = useMemo(() => {
    return [...posts]
      .sort(
        (a, b) =>
          b.likes_count - a.likes_count ||
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 5);
  }, [posts]);

  // Calculate Hot Post (Post with highest likes > 0)
  const hotPost = useMemo(() => {
    if (posts.length === 0) return null;
    const maxLikes = Math.max(...posts.map((p) => p.likes_count));
    if (maxLikes === 0) return null;
    return posts.find((p) => p.likes_count === maxLikes) || null;
  }, [posts]);

  // Handle avatar upload to Supabase Storage
  async function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Avatar size must be less than 2MB.");
      return;
    }

    setUploadingAvatar(true);
    const fileExt = file.name.split(".").pop();
    const filePath = `${currentUserId}/avatar-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      alert("Failed to upload image: " + uploadError.message);
      setUploadingAvatar(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const publicUrl = data.publicUrl;

    const { error: updateError } = await supabase
      .from("users")
      .update({ avatar_url: publicUrl })
      .eq("id", currentUserId);

    setUploadingAvatar(false);

    if (updateError) {
      alert("Failed to update user profile: " + updateError.message);
      return;
    }

    setAvatarUrl(publicUrl);
    router.refresh();
  }

  // Handle post deletion
  async function handleDeletePost(postId: string) {
    if (
      !confirm("Are you sure you want to delete this post? This will also delete all comments.")
    )
      return;

    const { error } = await supabase.from("posts").delete().eq("id", postId);

    if (error) {
      alert("Failed to delete post: " + error.message);
    } else {
      router.refresh();
    }
  }

  // Handle post liking/unliking toggle
  async function handleToggleLike(postId: string, isLiked: boolean) {
    if (isLiked) {
      await supabase
        .from("likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", currentUserId);
    } else {
      await supabase.from("likes").insert({
        post_id: postId,
        user_id: currentUserId
      });
    }
    router.refresh();
  }

  async function fetchComments(postId: string) {
    setLoadingComments((prev) => ({ ...prev, [postId]: true }));
    const { data, error } = await supabase
      .from("comments")
      .select("id, post_id, user_id, parent_id, content, created_at, users(username, email, avatar_url)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    setLoadingComments((prev) => ({ ...prev, [postId]: false }));
    if (!error && data) {
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: data as unknown as CommentWithUser[]
      }));
    }
  }

  async function toggleComments(postId: string) {
    const isOpening = !openComments[postId];
    setOpenComments((prev) => ({ ...prev, [postId]: isOpening }));
    if (isOpening) {
      await fetchComments(postId);
    }
  }

  async function handleAddComment(postId: string) {
    const text = newCommentTexts[postId];
    if (!text?.trim()) return;

    setSubmittingComments((prev) => ({ ...prev, [postId]: true }));
    const { data, error } = await supabase
      .from("comments")
      .insert({
        post_id: postId,
        user_id: currentUserId,
        content: text.trim(),
        parent_id: null
      })
      .select("id, post_id, user_id, parent_id, content, created_at, users(username, email, avatar_url)")
      .single();

    setSubmittingComments((prev) => ({ ...prev, [postId]: false }));

    if (!error && data) {
      setNewCommentTexts((prev) => ({ ...prev, [postId]: "" }));
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), data as unknown as CommentWithUser]
      }));
      router.refresh();
    }
  }

  async function handleAddReply(postId: string, parentId: string) {
    const text = replyTexts[parentId];
    if (!text?.trim()) return;

    setSubmittingComments((prev) => ({ ...prev, [parentId]: true }));
    const { data, error } = await supabase
      .from("comments")
      .insert({
        post_id: postId,
        user_id: currentUserId,
        content: text.trim(),
        parent_id: parentId
      })
      .select("id, post_id, user_id, parent_id, content, created_at, users(username, email, avatar_url)")
      .single();

    setSubmittingComments((prev) => ({ ...prev, [parentId]: false }));

    if (!error && data) {
      setReplyTexts((prev) => ({ ...prev, [parentId]: "" }));
      setReplyTargets((prev) => ({ ...prev, [postId]: null }));
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), data as unknown as CommentWithUser]
      }));
      router.refresh();
    }
  }

  async function handleDeleteComment(postId: string, commentId: string) {
    const { error } = await supabase.from("comments").delete().eq("id", commentId);

    if (!error) {
      setCommentsByPost((prev) => {
        const postComments = prev[postId] || [];
        return {
          ...prev,
          [postId]: postComments.filter((c) => c.id !== commentId && c.parent_id !== commentId)
        };
      });
      router.refresh();
    }
  }

  const getThreadedComments = useMemo(() => {
    return (commentsList: CommentWithUser[]) => {
      const commentMap = new Map<string, CommentWithUser>();
      commentsList.forEach((c) => commentMap.set(c.id, c));

      const topLevel: { comment: CommentWithUser; replies: CommentWithUser[] }[] = [];
      const replies: CommentWithUser[] = [];

      commentsList.forEach((c) => {
        if (!c.parent_id) {
          topLevel.push({ comment: c, replies: [] });
        } else {
          replies.push(c);
        }
      });

      replies.forEach((reply) => {
        let parent = commentMap.get(reply.parent_id!);
        let root = parent;
        while (root && root.parent_id) {
          root = commentMap.get(root.parent_id);
        }

        if (root) {
          const top = topLevel.find((t) => t.comment.id === root!.id);
          if (top) {
            top.replies.push(reply);
          }
        }
      });

      return topLevel;
    };
  }, []);

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

  // Common Post Card Render Component
  function renderPostCard(post: PostWithUser, isFeatured = false) {
    const commentsList = commentsByPost[post.id] || [];
    const commentsCount = post.comments?.length ?? 0;
    const isLiked = post.likes?.some((l) => l.user_id === currentUserId) ?? false;

    return (
      <article
        className={`rounded-2xl border p-5 relative transition ${
          isFeatured
            ? "border-cyan-400/40 bg-gradient-to-r from-slate-950 via-slate-900/90 to-indigo-950/40 shadow-[0_0_24px_rgba(34,211,238,0.15)]"
            : "border-slate-700/70 bg-slate-950/42"
        }`}
        key={post.id}
      >
        {isFeatured && (
          <div className="absolute top-0 right-0 rounded-bl-xl bg-cyan-400 px-3 py-1 text-[10px] font-black text-slate-950 uppercase tracking-widest flex items-center gap-1 shadow-sm">
            <Flame className="h-3 w-3 fill-slate-950" /> Hot Post
          </div>
        )}

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {post.users?.avatar_url ? (
              <img
                src={post.users.avatar_url}
                alt="Avatar"
                className="h-10 w-10 rounded-full object-cover border border-cyan-300/20 shrink-0"
              />
            ) : (
              <div className="grid h-10 w-10 place-items-center rounded-full bg-cyan-300/14 text-sm font-black text-cyan-100 ring-1 ring-cyan-200/20 shrink-0">
                {(post.users?.username ?? "P").slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold text-white">
                {post.users?.username ?? "Anonymous Player"}
              </p>
              <p className="text-xs text-slate-500">{formatDate(post.created_at)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleToggleLike(post.id, isLiked)}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition ${
                isLiked
                  ? "border-rose-500/50 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                  : "border-slate-700 hover:border-rose-500/50 hover:bg-rose-500/5 text-slate-400 hover:text-rose-450"
              }`}
            >
              <Heart className={`h-3.5 w-3.5 ${isLiked ? "fill-rose-500 text-rose-500" : ""}`} />
              {post.likes_count ?? 0}
            </button>

            {post.user_id === currentUserId && (
              <button
                onClick={() => handleDeletePost(post.id)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 text-slate-400 hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-400 transition"
                title="Delete Post"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
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
                      {comment.users?.avatar_url ? (
                        <img
                          src={comment.users.avatar_url}
                          alt="Avatar"
                          className="h-8 w-8 rounded-full object-cover border border-indigo-500/20 shrink-0"
                        />
                      ) : (
                        <div className="grid h-8 w-8 place-items-center rounded-full bg-indigo-500/10 text-xs font-black text-indigo-300 ring-1 ring-indigo-500/20 shrink-0">
                          {(comment.users?.username ?? "P").slice(0, 1).toUpperCase()}
                        </div>
                      )}
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
                              className="text-slate-500 hover:text-rose-455 transition"
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
                          const parentComment = commentsList.find((c) => c.id === reply.parent_id);
                          const isReplyingToSubReply = reply.parent_id !== comment.id;

                          return (
                            <div key={reply.id} className="flex gap-3 items-start">
                              {reply.users?.avatar_url ? (
                                <img
                                  src={reply.users.avatar_url}
                                  alt="Avatar"
                                  className="h-7 w-7 rounded-full object-cover border border-cyan-500/20 shrink-0"
                                />
                              ) : (
                                <div className="grid h-7 w-7 place-items-center rounded-full bg-cyan-500/10 text-[10px] font-black text-cyan-300 ring-1 ring-cyan-500/20 shrink-0">
                                  {(reply.users?.username ?? "P").slice(0, 1).toUpperCase()}
                                </div>
                              )}
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
                                      onClick={() => handleDeleteComment(post.id, reply.id)}
                                      className="text-slate-500 hover:text-rose-455 transition"
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
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <aside className="space-y-6">
        {/* Profile Card with Avatar Upload */}
        <section className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label
                htmlFor="avatar-upload"
                className="group relative block cursor-pointer shrink-0"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="h-12 w-12 rounded-full object-cover border border-cyan-300/30"
                  />
                ) : (
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-indigo-400 to-cyan-300 text-sm font-black text-slate-950">
                    {username.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition">
                  <Camera className="h-3 w-3 text-white" />
                </div>
              </label>
              <input
                type="file"
                id="avatar-upload"
                className="hidden"
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={uploadingAvatar}
              />
              <div>
                <p className="text-xs text-slate-400">Current Player</p>
                <h2 className="text-base font-black text-white leading-tight">{username}</h2>
                {uploadingAvatar && <p className="text-[10px] text-cyan-300 mt-0.5">Uploading...</p>}
              </div>
            </div>
            <Button
              aria-label="Sign out"
              onClick={handleLogout}
              variant="danger"
              className="h-9 px-3 text-xs"
            >
              <LogOut className="h-3.5 w-3.5" />
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

        {/* Leaderboard (Top 5 Liked Posts) */}
        <section className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-cyan-300" />
            <h2 className="text-lg font-bold text-white">Leaderboard</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Top 5 most liked discussions in the community.
          </p>

          <div className="mt-4 space-y-3">
            {leaderboard.length === 0 && (
              <p className="rounded-xl border border-slate-700/70 bg-slate-950/40 px-4 py-3 text-sm text-slate-400">
                No likes registered yet.
              </p>
            )}

            {leaderboard.map((item, idx) => {
              const rankColors = [
                "text-yellow-400 font-extrabold",
                "text-slate-300 font-extrabold",
                "text-amber-500 font-extrabold",
                "text-slate-400 font-semibold",
                "text-slate-500"
              ];

              return (
                <div
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-700/70 bg-slate-950/40 p-3"
                  key={item.id}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className={`text-xs w-5 shrink-0 ${rankColors[idx] || "text-slate-400"}`}>
                      #{idx + 1}
                    </span>
                    <span className="truncate text-sm text-slate-300" title={item.title}>
                      {item.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-cyan-300 font-semibold shrink-0">
                    <Heart className="h-3 w-3 fill-rose-500 text-rose-500" />
                    {item.likes_count}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Live Game Deals */}
        <section className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-indigo-300" />
            <h2 className="text-lg font-bold text-white">Live Game Deals</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Real-time Steam deal data from CheapShark API.
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

        {/* Create Post Form */}
        <form className="glass rounded-2xl p-5" onSubmit={handlePost}>
          <div className="flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5 text-indigo-300" />
            <h2 className="text-lg font-bold text-white">Create Post</h2>
          </div>
          <label className="mt-5 block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Title</span>
            <Input
              maxLength={50}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What game do you want to discuss?"
              value={title}
            />
            <p className="mt-2 text-right text-xs text-slate-500">{title.length}/50</p>
          </label>
          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Content</span>
            <Textarea
              maxLength={1000}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Share team-up requests, strategies, esports talk, or hot takes..."
              value={content}
            />
            <p className="mt-2 text-right text-xs text-slate-500">{content.length}/1000</p>
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

        {/* Hot Post Section (Top Pin) */}
        {hotPost && (
          <div className="mt-6 border-b border-slate-700/40 pb-6">
            <h3 className="text-xs font-black text-cyan-300 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Flame className="h-4 w-4 fill-cyan-300/20" /> Hot Discussion
            </h3>
            {renderPostCard(hotPost, true)}
          </div>
        )}

        {/* Standard Post Board Feed */}
        <div className="mt-6 space-y-4">
          {posts.length === 0 && (
            <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-slate-700">
              <p className="text-sm text-slate-400">No posts yet. Start the first discussion.</p>
            </div>
          )}

          {posts.map((post) => renderPostCard(post, false))}
        </div>
      </section>
    </div>
  );
}
