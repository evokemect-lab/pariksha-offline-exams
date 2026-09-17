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
  const [exams, centers, regs, notices, results, uploads] = await Promise.all([
    db.from("exams").select("*").order("exam_date"),
    db.from("exam_centers").select("*").order("name"),
    db.from("registrations").select("*, exams(code,title), exam_centers(name), profiles!registrations_student_id_fkey(full_name,phone)").order("created_at", { ascending: false }).limit(500),
    db.from("notices").select("*").order("published_at", { ascending: false }).limit(20),
    db.from("results").select("*, registrations!inner(hall_ticket_no,exam_id)").order("created_at", { ascending: false }).limit(500),
    db.from("result_uploads").select("*, exams(code,title)").order("created_at", { ascending: false }).limit(30)
  ]);
  return NextResponse.json({ exams: exams.data, centers: centers.data, registrations: regs.data, notices: notices.data, results: results.data, uploads: uploads.data });
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
    const { name, center_code, address, city, capacity, contact_phone, num_classes, seats_per_class } = body;
    if (!name || !city) return NextResponse.json({ error: "Name + city required" }, { status: 400 });
    const rooms = Math.max(1, Number(num_classes) || 1);
    const per = Math.max(1, Number(seats_per_class) || 30);
    const cap = Number(capacity) > 0 ? Number(capacity) : rooms * per;
    const { data, error } = await db.from("exam_centers").insert({
      name, center_code: center_code || null, address: address || "", city,
      capacity: cap, contact_phone: contact_phone || null, is_active: true,
      num_classes: rooms, seats_per_class: per
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, message: `Center added ✓ (${rooms} classes × ${per} = ${cap} seats)`, center: data });
  }
  if (action === "toggle-center") {
    const { error } = await db.from("exam_centers").update({ is_active: body.is_active }).eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, message: "Center updated ✓" });
  }
  if (action === "update-center") {
    const { id, name, center_code, address, city, capacity, contact_phone, num_classes, seats_per_class } = body;
    // Keep booking capacity in sync when classrooms change without explicit capacity
    let capUpdate: Record<string, number> = {};
    if (capacity !== undefined && Number(capacity) > 0) {
      capUpdate = { capacity: Number(capacity) };
    } else if (num_classes !== undefined || seats_per_class !== undefined) {
      const { data: cur } = await db.from("exam_centers").select("capacity,num_classes,seats_per_class").eq("id", id).single();
      const rooms = num_classes !== undefined ? Math.max(1, Number(num_classes) || 1) : (cur?.num_classes || 1);
      const per = seats_per_class !== undefined ? Math.max(1, Number(seats_per_class) || 30) : (cur?.seats_per_class || 30);
      capUpdate = { capacity: rooms * per };
    }
    const { error } = await db.from("exam_centers").update({
      ...(name !== undefined ? { name } : {}),
      ...(center_code !== undefined ? { center_code: center_code || null } : {}),
      ...(address !== undefined ? { address } : {}),
      ...(city !== undefined ? { city } : {}),
      ...(capacity !== undefined || Object.keys(capUpdate).length ? capUpdate : {}),
      ...(contact_phone !== undefined ? { contact_phone: contact_phone || null } : {}),
      ...(num_classes !== undefined ? { num_classes: Number(num_classes) } : {}),
      ...(seats_per_class !== undefined ? { seats_per_class: Number(seats_per_class) } : {})
    }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, message: "Center saved ✓" });
  }
  if (action === "auto-allocate") {
    const { exam_id, center_id, mode } = body;
    if (!exam_id || !center_id) return NextResponse.json({ error: "exam + center required" }, { status: 400 });
    const { data: center } = await db.from("exam_centers").select("*").eq("id", center_id).single();
    if (!center) return NextResponse.json({ error: "Center not found" }, { status: 400 });
    const rooms = Math.max(1, center.num_classes || 1);
    const per = Math.max(1, center.seats_per_class || 30);
    const capacity = rooms * per;
    const { data: all } = await db.from("registrations")
      .select("id,room_no,seat_no,status,hall_ticket_no")
      .eq("exam_id", exam_id).eq("center_id", center_id)
      .in("status", ["confirmed", "paid"]).order("hall_ticket_no");
    if (!all?.length) return NextResponse.json({ error: "No issued (confirmed) students at this center" }, { status: 400 });
    const targets = mode === "reallocate" ? all : all.filter(r => !r.room_no || !r.seat_no);
    if (!targets.length) return NextResponse.json({ ok: true, message: "Everyone already has a seat ✓" });
    if (targets.length > capacity) return NextResponse.json({
      error: `Not enough seats: ${targets.length} students need seats but ${rooms} classes × ${per} = ${capacity}. Increase classes or seats-per-class.`
    }, { status: 400 });
    // Occupied slots (so "fill" continues after existing assignments)
    const used = new Set<string>();
    if (mode !== "reallocate") {
      for (const r of all) {
        const rm = /^Room (\d+)$/.exec(r.room_no || "");
        if (rm && r.seat_no) used.add(`${Number(rm[1])}-${Number(r.seat_no)}`);
      }
    }
    const free: string[] = [];
    for (let r = 1; r <= rooms && free.length < targets.length + used.size; r++)
      for (let s = 1; s <= per; s++) {
        const k = `${r}-${s}`;
        if (!used.has(k)) free.push(k);
      }
    let done = 0;
    for (let i = 0; i < targets.length; i++) {
      const [r, s] = free[i].split("-");
      const { error } = await db.from("registrations").update({ room_no: `Room ${r}`, seat_no: s }).eq("id", targets[i].id);
      if (!error) done++;
    }
    return NextResponse.json({ ok: true, message: `Allocated ${done}/${targets.length} seats ✓ (${rooms} rooms × ${per})` });
  }
function gradeFor(pct: number) {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C+";
  if (pct >= 40) return "C";
  if (pct >= 30) return "D";
  return "E";
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
    // Record the upload batch (dedicated upload history table)
    if (body.exam_id) {
      await db.from("result_uploads").insert({
        exam_id: body.exam_id, uploaded_by: admin.id,
        total_rows: rows.length, success_rows: upserts.length
      });
      // Auto-rank individuals for this exam (dense rank by marks, per exam attended)
      const { data: all } = await db.from("results")
        .select("id,marks_obtained,registrations!inner(exam_id)")
        .eq("registrations.exam_id", body.exam_id)
        .order("marks_obtained", { ascending: false });
      let rank = 0, last: number | null = null;
      for (const row of (all || []) as any[]) {
        const m = Number(row.marks_obtained);
        if (last === null || m !== last) { rank++; last = m; }
        await db.from("results").update({ rank }).eq("id", row.id);
      }
    }
    return NextResponse.json({ ok: true, message: `Published ${upserts.length} results ✓${missing.length ? `, ${missing.length} ticket(s) not found: ${missing.slice(0, 5).join(", ")}` : ""}` });
  }
  if (action === "bulk-subject-results") {
    // rows: { hall_ticket_no, subject, ce, pe, te, max? } — CSV: HALLTICKET,subject,ce,pe,te,max
    const rows = (body.rows || []) as { hall_ticket_no: string; subject: string; ce?: number; pe?: number; te?: number; max?: number }[];
    if (!rows.length) return NextResponse.json({ error: "No rows" }, { status: 400 });
    const tickets = [...new Set(rows.map(r => r.hall_ticket_no))];
    const { data: found, error: ferr } = await db.from("registrations").select("id,hall_ticket_no,exam_id").in("hall_ticket_no", tickets);
    if (ferr) return NextResponse.json({ error: ferr.message }, { status: 400 });
    const byTicket = new Map((found || []).map((r: any) => [r.hall_ticket_no, r]));
    const missing = rows.filter(r => !byTicket.has(r.hall_ticket_no)).map(r => r.hall_ticket_no);
    const subs = rows.filter(r => byTicket.has(r.hall_ticket_no) && r.subject).map(r => {
      const ce = Number(r.ce) || 0, pe = Number(r.pe) || 0, te = Number(r.te) || 0;
      const max = Number(r.max) > 0 ? Number(r.max) : 100;
      const total = ce + pe + te;
      return {
        registration_id: byTicket.get(r.hall_ticket_no).id,
        subject: r.subject.trim(),
        ce, pe, te, max_marks: max, total,
        grade: gradeFor(max > 0 ? (total / max) * 100 : 0)
      };
    });
    if (subs.length) {
      const { error } = await db.from("result_subjects").upsert(subs, { onConflict: "registration_id,subject" });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }
    // Recompute grand totals per registration -> results row
    const regIds = [...new Set(subs.map(s => s.registration_id))];
    let published = 0;
    for (const rid of regIds) {
      const { data: all } = await db.from("result_subjects").select("total,max_marks").eq("registration_id", rid);
      const grand = (all || []).reduce((s: number, r: any) => s + Number(r.total || 0), 0);
      const maxTot = (all || []).reduce((s: number, r: any) => s + Number(r.max_marks || 0), 0);
      const pct = maxTot > 0 ? (grand / maxTot) * 100 : 0;
      const { error } = await db.from("results").upsert({
        registration_id: rid, marks_obtained: grand,
        grade: gradeFor(pct), published: true
      }, { onConflict: "registration_id" });
      if (!error) published++;
    }
    return NextResponse.json({ ok: true, message: `Saved ${subs.length} subject rows, published ${published} results ✓${missing.length ? `, ${[...new Set(missing)].length} ticket(s) not found` : ""}` });
  }
  if (action === "remove-question-url") {
    const { error } = await db.from("exams").update({ question_paper_url: null }).eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, message: "Question paper removed" });
  }
  if (action === "delete-exam") {
    const { error } = await db.from("exams").delete().eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, message: "Exam deleted ✓" });
  }
  if (action === "delete-registration") {
    const { error } = await db.from("registrations").delete().eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, message: "Registration removed ✓" });
  }
  if (action === "delete-center") {
    const { error } = await db.from("exam_centers").delete().eq("id", body.id);
    if (error) return NextResponse.json({ error: "Cannot delete: center still has registrations. Move or remove them first." }, { status: 400 });
    return NextResponse.json({ ok: true, message: "Center deleted ✓" });
  }
  if (action === "delete-student") {
    const { error } = await db.from("profiles").delete().eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    try { await db.auth.admin.deleteUser(body.id); } catch { /* auth cleanup best-effort */ }
    return NextResponse.json({ ok: true, message: "Student deleted ✓" });
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
