create table if not exists public.youth_applications (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now() not null,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  city text not null,
  state text not null default 'Ohio',
  age_group text not null,
  is_justice_impacted boolean not null default false,
  referral_source text,
  current_situation text not null,
  goals text not null,
  hear_about_us text,
  additional_info text,
  status text not null default 'pending_review'
);

alter table public.youth_applications enable row level security;

-- Allow inserts from anyone (public application form)
create policy "Allow public inserts on youth_applications"
  on public.youth_applications
  for insert
  to anon, authenticated
  with check (true);

-- Only admins can read applications
create policy "Admins can read youth_applications"
  on public.youth_applications
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );
