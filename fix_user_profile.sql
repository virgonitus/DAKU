-- FIX USER LOGIN
-- Masukkan data profil untuk user 'ao1' secara otomatis (tanpa copy-paste UID)

insert into public.profiles (id, username, full_name, role, branch_code, area_code)
select id, 'ao1', 'Budi Santoso (AO)', 'AO', 'KC-JAKARTA-PUSAT', '1'
from auth.users
where email = 'ao1@daku.com'
on conflict (id) do nothing;

-- Masukkan data profil untuk user 'admin' (jika ada)
insert into public.profiles (id, username, full_name, role, branch_code, area_code)
select id, 'admin', 'Administrator Pusat', 'ADMIN', 'PUSAT', 'ALL'
from auth.users
where email = 'admin@daku.com'
on conflict (id) do nothing;
