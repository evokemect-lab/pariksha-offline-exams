-- Pariksha v3 — result upload batches + classroom-based seat allocation
-- Run this in Supabase SQL Editor (safe to re-run)

-- 1. Classroom capacity per center (admin provides these)
alter table exam_centers add column if not exists num_classes int default 1;
alter table exam_centers add column if not exists seats_per_class int default 30;

-- 2. Dedicated result upload batches (audit of every result upload)
create table if not exists result_uploads (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams(id) on delete cascade,
  uploaded_by uuid references profiles(id) on delete set null,
  total_rows int not null default 0,
  success_rows int not null default 0,
  created_at timestamptz default now()
);

alter table result_uploads enable row level security;

-- Admin reads upload history through the service_role API (bypasses RLS).
-- No public policies: students see only their own published result via results policy.
