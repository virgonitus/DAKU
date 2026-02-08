-- Create BRANCHES Table
create table public.branches (
  code text primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create AREAS Table
create table public.areas (
  code text primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.branches enable row level security;
alter table public.areas enable row level security;

-- Policies for BRANCHES
create policy "Public Read Branches" on branches for select using (true);

create policy "Admin Manage Branches" on branches for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'ADMIN')
);

-- Policies for AREAS
create policy "Public Read Areas" on areas for select using (true);

create policy "Admin Manage Areas" on areas for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'ADMIN')
);

-- Insert Initial Data (Optional)
insert into branches (code) values ('PUSAT'), ('KANWIL'), ('KC-JAKARTA-PUSAT');
insert into areas (code) values ('1'), ('2'), ('ALL');
