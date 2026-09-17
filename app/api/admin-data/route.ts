import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/supabase";

function svc() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

async function requireAdmin(req: Request) {
  const token = req.headers.get("x-access-token");
  if (!token) return null;
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: { user } } = await anon.auth.getUser(token);
  if (!user?.email || !isAdminEmail(user.email)) return null;
  return user;
}

export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const db = svc();
  const [exams, centers, regs, notices, results] = await Promise.all([
    db.from("exams").select("*").order("exam_date"),
    db.from("exam_centers").select("*").order("name"),
    db.from("registrations").select("*, exams(code,title), exam_centers(name), profiles!registrations_student_id_fkey(full_name,phone)").order("created_at", { ascending: false }).limit(300),
    db.from("notices").select("*").order("published_at", { ascending: false }).limit(20),
    db.from("results").select("*, registrations!inner(hall_ticket_no,exam_id)").order("created_at", { ascending: false }).limit(500)
  ]);
  return NextResponse.json({ exams: exams.data, centers: centers.data, registrations: regs.data, notices: notices.data, results: results.data });
}

export async function POST(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const db = svc();
  const body = await req.json();
  const { action } = body;

  if (action === "create-exam") {
    const { code, title, exam_date, fee } = body;
    const { data, error } = await db.from("exams").insert({
      code, title, exam_date,
      start_time: "10:00", end_time: "13:00",
      registration_deadline: exam_date, fee: fee || 0, status: "published"
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  }
  if (action === "set-exam-status") {
    const { error } = await db.from("exams").update({ status: body.status }).eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }
  if (action === "confirm-payment" || action === "issue-ticket") {
    const { error } = await db.from("registrations").update({ payment_status: "paid", status: "confirmed" }).eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, message: "Hall ticket issued ✓" });
  }
  if (action === "bulk-confirm") {
    if (!body.exam_id) return NextResponse.json({ error: "exam_id required" }, { status: 400 });
    const { error, count } = await db.from("registrations").update({ payment_status: "paid", status: "confirmed" }).eq("exam_id", body.exam_id).eq("status", "pending");
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, message: `Issued ${count ?? "all"} pending hall tickets ✓` });
  }
  if (action === "create-center") {
    const { name, center_code, address, city, capacity, contact_phone } = body;
    if (!name || !city) return NextResponse.json({ error: "Name + city required" }, { status: 400 });
    const { data, error } = await db.from("exam_centers").insert({
      name, center_code: center_code || null, address: address || "", city,
      capacity: capacity || 100, contact_phone: contact_phone || null, is_active: true
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, message: "Center added ✓", center: data });
  }
  if (action === "toggle-center") {
    const { error } = await db.from("exam_centers").update({ is_active: body.is_active }).eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, message: "Center updated ✓" });
  }
  if (action === "bulk-results") {
    const rows = (body.rows || []) as { hall_ticket_no: string; marks_obtained: number; grade?: string | null }[];
    if (!rows.length) return NextResponse.json({ error: "No rows" }, { status: 400 });
    const tickets = rows.map(r => r.hall_ticket_no);
    const { data: found, error: ferr } = await db.from("registrations").select("id,hall_ticket_no").in("hall_ticket_no", tickets);
    if (ferr) return NextResponse.json({ error: ferr.message }, { status: 400 });
    const byTicket = new Map((found || []).map((r: any) => [r.hall_ticket_no, r.id]));
    const missing = rows.filter(r => !byTicket.has(r.hall_ticket_no)).map(r => r.hall_ticket_no);
    const upserts = rows.filter(r => byTicket.has(r.hall_ticket_no)).map(r => ({
      registration_id: byTicket.get(r.hall_ticket_no),
      marks_obtained: r.marks_obtained,
      grade: r.grade || null,
      published: true
    }));
    if (upserts.length) {
      const { error } = await db.from("results").upsert(upserts, { onConflict: "registration_id" });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, message: `Published ${upserts.length} results ✓${missing.length ? `, ${missing.length} ticket(s) not found: ${missing.slice(0, 5).join(", ")}` : ""}` });
  }
  if (action === "remove-question-url") {
    const { error } = await db.from("exams").update({ question_paper_url: null }).eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, message: "Question paper removed" });
  }
  if (action === "assign-seat") {
    const { error } = await db.from("registrations").update({ room_no: body.room_no, seat_no: body.seat_no }).eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }
  if (action === "publish-result") {
    const { data: reg } = await db.from("registrations").select("id").eq("id", body.registration_id).single();
    if (!reg) return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    const { error } = await db.from("results").upsert({
      registration_id: body.registration_id,
      marks_obtained: body.marks_obtained,
      grade: body.grade || null,
      published: true
    }, { onConflict: "registration_id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
