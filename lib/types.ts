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
  comments?: { id: string }[];
};

export type CommentWithUser = {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  users: {
    username: string;
    email: string;
  } | null;
};


export type GameDeal = {
  dealID: string;
  title: string;
  salePrice: string;
  normalPrice: string;
  savings: string;
  steamRatingPercent: string;
};
