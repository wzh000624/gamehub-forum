export type Profile = {
  id: string;
  username: string;
  email: string;
  created_at: string;
};

export type PostWithUser = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  likes_count: number;
  users: {
    username: string;
    email: string;
  } | null;
};
