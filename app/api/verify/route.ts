import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function svc() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function POST(req: Request) {
  try {
    const { hall_ticket_no, mark_attended } = await req.json();
    if (!hall_ticket_no) return NextResponse.json({ error: "hall_ticket_no required" }, { status: 400 });
    const db = svc();
    const { data: reg, error } = await db.from("registrations")
      .select("*, exams(*), exam_centers(*), profiles!registrations_student_id_fkey(full_name, phone)")
      .eq("hall_ticket_no", hall_ticket_no.trim()).single();
    if (error || !reg) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    if (mark_attended) {
      if (reg.payment_status !== "paid" && reg.status !== "confirmed" && reg.status !== "paid") {
        // allow but warn — gate staff decides
      }
      await db.from("registrations").update({ status: "attended" }).eq("id", reg.id);
      reg.status = "attended";
    }
    return NextResponse.json({ registration: reg });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
