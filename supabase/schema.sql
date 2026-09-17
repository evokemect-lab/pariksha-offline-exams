-- Offline Exam Conduction Platform — Supabase schema
-- Run this in Supabase SQL Editor (fresh project)

-- 1. Profiles (extends auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  role text not null default 'student' check (role in ('student','staff','admin')),
  created_at timestamptz default now()
);

-- 2. Exam centers (physical venues for offline exams)
create table if not exists exam_centers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  city text not null,
  capacity int not null default 100,
  contact_phone text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 3. Exams
create table if not exists exams (
  id uuid primary key default gen_random_uuid(),
  code text unique not null, -- e.g. "SSLC-MATH-2026"
  title text not null,
  description text,
  exam_date date not null,
  start_time time not null,
  end_time time not null,
  registration_deadline date not null,
  fee numeric(10,2) not null default 0,
  total_marks int not null default 100,
  syllabus_url text,
  status text not null default 'draft' check (status in ('draft','published','closed','completed')),
  created_at timestamptz default now()
);

-- 4. Registrations (student -> exam + center)
create table if not exists registrations (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  center_id uuid not null references exam_centers(id),
  hall_ticket_no text unique not null,
  status text not null default 'pending' check (status in ('pending','paid','confirmed','cancelled','attended')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','pending_verification','paid','failed','refunded')),
  payment_ref text,
  seat_no text,
  room_no text,
  created_at timestamptz default now(),
  unique(exam_id, student_id)
);

-- 5. Results
create table if not exists results (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid unique not null references registrations(id) on delete cascade,
  marks_obtained numeric(8,2),
  grade text,
  rank int,
  remarks text,
  published boolean default false,
  created_at timestamptz default now()
);

-- 6. Notices
create table if not exists notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  exam_id uuid references exams(id) on delete set null,
  published_at timestamptz default now()
);

-- Helper: generate hall ticket numbers like EXAMCODE-2026-XXXX
create or replace function generate_hall_ticket(p_exam_code text)
returns text language plpgsql as $$
declare v_rand text;
begin
  v_rand := upper(substring(md5(random()::text) from 1 for 6));
  return p_exam_code || '-' || to_char(now(),'YYYY') || '-' || v_rand;
end $$;

-- RLS
alter table profiles enable row level security;
alter table exam_centers enable row level security;
alter table exams enable row level security;
alter table registrations enable row level security;
alter table results enable row level security;
alter table notices enable row level security;

-- Public read for published exams, active centers, notices
drop policy if exists "public read published exams" on exams;
create policy "public read published exams" on exams for select using (status in ('published','closed','completed'));

drop policy if exists "public read centers" on exam_centers;
create policy "public read centers" on exam_centers for select using (is_active = true);

drop policy if exists "public read notices" on notices;
create policy "public read notices" on notices for select using (true);

-- Profiles: users read/update own
drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);

-- Registrations: students manage own, service_role bypasses for APIs
drop policy if exists "own registrations" on registrations;
create policy "own registrations" on registrations for all using (auth.uid() = student_id) with check (auth.uid() = student_id);

-- Results: students read own published
drop policy if exists "own published results" on results;
create policy "own published results" on results for select using (
  published = true and exists (
    select 1 from registrations r where r.id = results.registration_id and r.student_id = auth.uid()
  )
);

-- NOTE: Admin writes go through service_role API routes (bypasses RLS).
-- Set ADMIN_EMAILS in env; isAdminEmail() gates /api/* admin routes.

-- Seed: 2 centers + 1 demo exam
insert into exam_centers (name, address, city, capacity, contact_phone) values
  ('City Central High School', 'Main Road, Block A', 'Kochi', 200, '9876543210'),
  ('St. Marys Exam Hall', 'Church Street', 'Thrissur', 150, '9876543211')
on conflict do nothing;

insert into exams (code, title, description, exam_date, start_time, end_time, registration_deadline, fee, total_marks, status) values
  ('MATH-OL-001', 'Class 10 Mathematics — Offline Board Practice', 'Full-syllabus offline practice exam. Report 30 min early with hall ticket + ID.', CURRENT_DATE + 21, '10:00', '13:00', CURRENT_DATE + 14, 199.00, 100, 'published')
on conflict (code) do nothing;
