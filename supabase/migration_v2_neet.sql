-- Pariksha v2 — NEET-style hall tickets, centers, question papers, bulk results
-- Run this in Supabase SQL Editor (safe to re-run)

-- 1. Candidate details on profiles (NEET admit-card fields)
alter table profiles add column if not exists father_name text;
alter table profiles add column if not exists mother_name text;
alter table profiles add column if not exists dob date;
alter table profiles add column if not exists gender text;
alter table profiles add column if not exists category text;
alter table profiles add column if not exists address text;
alter table profiles add column if not exists photo_url text;
alter table profiles add column if not exists id_proof_no text;

-- 2. Exam extras: question paper + NEET-style timings
alter table exams add column if not exists question_paper_url text;
alter table exams add column if not exists reporting_time text default '09:00';
alter table exams add column if not exists gate_closing_time text default '09:30';
alter table exams add column if not exists medium text default 'English';

-- 3. Center codes (printed on hall ticket like NEET centre no.)
alter table exam_centers add column if not exists center_code text;

-- 4. Storage buckets
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true), ('question-papers', 'question-papers', true)
on conflict (id) do nothing;

-- 5. Storage policies: public read; authenticated users manage own photo
drop policy if exists "public read photos" on storage.objects;
create policy "public read photos" on storage.objects
  for select using (bucket_id = 'photos');

drop policy if exists "own photo upload" on storage.objects;
create policy "own photo upload" on storage.objects
  for insert with check (bucket_id = 'photos' and auth.role() = 'authenticated');

drop policy if exists "own photo update" on storage.objects;
create policy "own photo update" on storage.objects
  for update using (bucket_id = 'photos' and auth.role() = 'authenticated');

drop policy if exists "public read question papers" on storage.objects;
create policy "public read question papers" on storage.objects
  for select using (bucket_id = 'question-papers');

-- Question-paper uploads go through the admin API (service_role bypasses RLS).
