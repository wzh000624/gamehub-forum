create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  email text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null check (char_length(title) <= 50),
  content text not null check (char_length(content) <= 1000),
  likes_count integer not null default 0 check (likes_count >= 0),
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;
alter table public.posts enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, username, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop policy if exists "Users can read public profiles" on public.users;
create policy "Users can read public profiles"
  on public.users for select
  using (true);

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Anyone can read posts" on public.posts;
create policy "Anyone can read posts"
  on public.posts for select
  using (true);

drop policy if exists "Authenticated users can create posts" on public.posts;
create policy "Authenticated users can create posts"
  on public.posts for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own posts" on public.posts;
create policy "Users can update own posts"
  on public.posts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own posts" on public.posts;
create policy "Users can delete own posts"
  on public.posts for delete
  using (auth.uid() = user_id);

create index if not exists posts_created_at_idx on public.posts(created_at desc);
create index if not exists posts_user_id_idx on public.posts(user_id);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  content text not null check (char_length(content) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists comments_post_id_idx on public.comments(post_id);
create index if not exists comments_parent_id_idx on public.comments(parent_id);

alter table public.comments enable row level security;

drop policy if exists "Anyone can read comments" on public.comments;
create policy "Anyone can read comments"
  on public.comments for select
  using (true);

drop policy if exists "Authenticated users can create comments" on public.comments;
create policy "Authenticated users can create comments"
  on public.comments for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own comments" on public.comments;
create policy "Users can delete own comments"
  on public.comments for delete
  using (auth.uid() = user_id);

-- Add avatar_url column to users profile
alter table public.users add column if not exists avatar_url text;

-- Create likes join table
create table if not exists public.likes (
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists likes_post_id_idx on public.likes(post_id);
create index if not exists likes_user_id_idx on public.likes(user_id);

-- Enable RLS for likes
alter table public.likes enable row level security;

-- Policies for likes
drop policy if exists "Anyone can read likes" on public.likes;
create policy "Anyone can read likes" on public.likes for select using (true);

drop policy if exists "Authenticated users can toggle likes" on public.likes;
create policy "Authenticated users can toggle likes" on public.likes for insert with check (auth.uid() = user_id);

drop policy if exists "Users can delete own likes" on public.likes;
create policy "Users can delete own likes" on public.likes for delete using (auth.uid() = user_id);

-- Trigger to auto increment/decrement likes_count on posts table
create or replace function public.handle_post_like_change()
returns trigger
language plpgsql
security definer
as $$
begin
  if (TG_OP = 'INSERT') then
    update public.posts
    set likes_count = likes_count + 1
    where id = new.post_id;
    return new;
  elsif (TG_OP = 'DELETE') then
    update public.posts
    set likes_count = greatest(0, likes_count - 1)
    where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists on_post_like_change on public.likes;
create trigger on_post_like_change
  after insert or delete on public.likes
  for each row execute procedure public.handle_post_like_change();


