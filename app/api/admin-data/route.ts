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
  const [exams, centers, regs, notices] = await Promise.all([
    db.from("exams").select("*").order("exam_date"),
    db.from("exam_centers").select("*").order("name"),
    db.from("registrations").select("*, exams(code,title), profiles!registrations_student_id_fkey(full_name)").order("created_at", { ascending: false }).limit(200),
    db.from("notices").select("*").order("published_at", { ascending: false }).limit(20)
  ]);
  return NextResponse.json({ exams: exams.data, centers: centers.data, registrations: regs.data, notices: notices.data });
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
  if (action === "confirm-payment") {
    const { error } = await db.from("registrations").update({ payment_status: "paid", status: "confirmed" }).eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
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
