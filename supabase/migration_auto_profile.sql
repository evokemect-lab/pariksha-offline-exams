-- Auto-create a profiles row whenever a new auth user signs up.
-- Run this in Supabase SQL Editor (safe to run multiple times).
-- Prevents: 'violates foreign key constraint "registrations_student_id_fkey"'

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'Student'),
    new.raw_user_meta_data->>'phone',
    'student'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: create missing profiles for users who signed up before the trigger
insert into public.profiles (id, full_name, role)
select u.id, coalesce(split_part(u.email, '@', 1), 'Student'), 'student'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
