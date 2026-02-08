-- 1. Enable UUID Extension (Required for ID generation)
create extension if not exists "uuid-ossp";

-- 2. Create PROFILES Table (Extends Auth Users)
create table public.profiles (
  id uuid references auth.users not null primary key,
  username text unique,
  full_name text,
  role text check (role in ('ADMIN', 'AO', 'AK', 'AM', 'GM', 'IT_SUPPORT', 'AKA', 'AKP')),
  branch_code text,
  area_code text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create REPORTS Table (Core Data)
create table public.reports (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  branch_code text,
  area_code text,
  type text check (type in ('KC', 'AREA', 'KP')),
  status text default 'DRAFT',
  stage text default 'AK', -- Workflow Stage
  data jsonb not null default '{}'::jsonb, -- Flexible Form Data
  is_revision boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.reports enable row level security;

-- 5. Create Policies (Security Rules) --

-- PROFILES: Everyone can read profiles (needed for displaying names)
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

-- PROFILES: Users can insert their own profile (during sign up)
create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

-- REPORTS: Admins & GM can see ALL reports
create policy "Admins View All"
  on reports for select
  using ( 
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('ADMIN', 'GM', 'AM', 'IT_SUPPORT', 'AKP', 'AKA')
    )
  );

-- REPORTS: AO can see ONLY their own reports
create policy "AO View Own"
  on reports for select
  using ( auth.uid() = user_id );

-- REPORTS: AO can INSERT their own reports
create policy "AO Insert Own"
  on reports for insert
  with check ( auth.uid() = user_id );

-- REPORTS: AK can see reports in their BRANCH
create policy "AK View Branch"
  on reports for select
  using (
    branch_code in (
      select branch_code from profiles where id = auth.uid() and role = 'AK'
    )
  );
