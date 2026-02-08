-- FIX RELATIONSHIP: Reports -> Profiles
-- Required for fetching AO Name (Profile) along with Report.

-- 1. Drop existing FK to auth.users (if exists)
alter table public.reports 
  drop constraint if exists reports_user_id_fkey;

-- 2. Add FK to public.profiles
alter table public.reports
  add constraint reports_user_id_fkey
  foreign key (user_id)
  references public.profiles (id)
  on delete cascade;
