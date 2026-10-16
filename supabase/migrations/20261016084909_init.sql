-- chats: eine Anprobier-Session
create table public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

-- images: eigene Uploads (person/garment) und generierte Bilder
create table public.images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  chat_id uuid not null references public.chats on delete cascade,
  kind text not null check (kind in ('person', 'garment', 'generated')),
  storage_path text not null,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now()
);

-- generations: ein Turn im Chat
create table public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  chat_id uuid not null references public.chats on delete cascade,
  input_image_ids uuid[] not null,
  feedback text,
  output_image_id uuid references public.images on delete set null,
  status text not null default 'pending' check (status in ('pending', 'done', 'failed')),
  created_at timestamptz not null default now()
);

create index on public.chats (user_id);
create index on public.images (user_id, kind, created_at desc);
create index on public.images (chat_id);
create index on public.generations (chat_id, created_at);
create index on public.generations (user_id);
create index on public.generations (output_image_id);

grant select, insert, update, delete on public.chats, public.images, public.generations to authenticated;

alter table public.chats enable row level security;
alter table public.images enable row level security;
alter table public.generations enable row level security;

create policy "own chats" on public.chats for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own images" on public.images for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own generations" on public.generations for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Storage: private Buckets, Pfad {user_id}/{chat_id}/{file}
insert into storage.buckets (id, name, public) values
  ('uploads', 'uploads', false),
  ('generations', 'generations', false);

create policy "own files" on storage.objects for all to authenticated
  using (
    bucket_id in ('uploads', 'generations')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id in ('uploads', 'generations')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
