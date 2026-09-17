-- Pariksha v4 — subject-wise marks (Kerala DHSE-style marksheet: CE/PE/TE per subject)
-- Run this in Supabase SQL Editor (safe to re-run)

create table if not exists result_subjects (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references registrations(id) on delete cascade,
  subject text not null,
  ce numeric(8,2) default 0,
  pe numeric(8,2) default 0,
  te numeric(8,2) default 0,
  max_marks numeric(8,2) not null default 100,
  total numeric(8,2),
  grade text,
  created_at timestamptz default now(),
  unique(registration_id, subject)
);

alter table result_subjects enable row level security;

-- Students read their own subjects once the overall result is published
drop policy if exists "own published subjects" on result_subjects;
create policy "own published subjects" on result_subjects for select using (
  exists (
    select 1 from registrations r
    join results res on res.registration_id = r.id
    where r.id = result_subjects.registration_id
      and r.student_id = auth.uid()
      and res.published = true
  )
);

-- NOTE: admin writes go through the service_role API (bypasses RLS).
