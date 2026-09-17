import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function svc() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function POST(req: Request) {
  try {
    const { exam_id, center_id, access_token } = await req.json();
    if (!exam_id || !center_id || !access_token) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: { user }, error: uerr } = await anon.auth.getUser(access_token);
    if (uerr || !user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

    const db = svc();

    // Self-heal: auth user may exist without a profiles row (FK target).
    const { data: existing } = await db.from("profiles").select("id").eq("id", user.id).single();
    if (!existing) {
      await db.from("profiles").insert({
        id: user.id,
        full_name: (user.user_metadata as any)?.full_name || user.email?.split("@")[0] || "Student",
        phone: (user.user_metadata as any)?.phone || null,
        role: "student"
      });
    }

    const { data: exam } = await db.from("exams").select("*").eq("id", exam_id).single();
    if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    if (exam.status !== "published") return NextResponse.json({ error: "Registrations closed for this exam" }, { status: 400 });

    // capacity check
    const { count } = await db.from("registrations").select("id", { count: "exact", head: true }).eq("exam_id", exam_id).eq("center_id", center_id).neq("status", "cancelled");
    const { data: center } = await db.from("exam_centers").select("*").eq("id", center_id).single();
    if (center && count !== null && count >= center.capacity) return NextResponse.json({ error: "Center full" }, { status: 400 });

    const hall_ticket_no = `${exam.code}-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const { data, error } = await db.from("registrations").insert({
      exam_id, center_id, student_id: user.id,
      hall_ticket_no,
      status: "pending",
      payment_status: "unpaid"
    }).select().single();

    if (error) {
      if (error.message.includes("duplicate") || error.code === "23505") return NextResponse.json({ error: "Already registered for this exam" }, { status: 400 });
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
