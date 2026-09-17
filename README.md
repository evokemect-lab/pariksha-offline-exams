# Pariksha — Offline Exam Conduction Platform

Next.js + Supabase app for conducting **offline exams**: exam listings, student registration, printable hall tickets with QR, gate verification, and results.

## Features (MVP)
- Public: home, /exams, /exams/[id] (register)
- Auth: /register, /login (Supabase Auth + profiles table)
- Student: /dashboard (my registrations), /hall-ticket/[id] (print + QR), /results/[id]
- Staff: /verify (QR scan + manual lookup + mark attended)
- Admin: /admin (create exams, assign room/seat, publish results)
- APIs: /api/register, /api/verify, /api/admin-data

## 1) Supabase setup (5 min)
1. supabase.com → New project → copy URL + anon + service_role (Settings → API).
2. SQL Editor → paste `supabase/schema.sql` → Run.
3. Auth → Users → Add user for admin (e.g. you@example.com).
4. Table Editor → profiles → insert row: id = admin user UUID, full_name, role = `admin`.
5. Storage: optional `syllabus` public bucket for PDFs.

## 2) Run locally
```bash
npm install
cp .env.example .env.local
# edit .env.local: Supabase keys + ADMIN_EMAILS=you@example.com
npm run dev
```
Open http://localhost:3000. Admin at /admin.

## 3) Deploy to Vercel
Push to GitHub → vercel.com Import → add env vars → Deploy.

## Payments (deferred)
Payment collection disabled for now. DB already has `fee`, `payment_status`, `payment_ref` columns so we can add UPI/Razorpay later without schema change.

## Next steps you may want
- SMS/email hall tickets (Resend already in package.json)
- Bulk CSV import of students + auto seat allocation
- Center capacity dashboard + attendance export
