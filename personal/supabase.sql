create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  crop text not null,
  yield numeric not null,
  region text,
  created_at timestamptz not null default now()
);

alter table public.predictions enable row level security;

create policy "Users can read own predictions"
  on public.predictions for select
  using (auth.uid() = user_id);

create policy "Users can insert own predictions"
  on public.predictions for insert
  with check (auth.uid() = user_id);

-- If the table already exists, ensure region column is present
alter table public.predictions add column if not exists region text;
