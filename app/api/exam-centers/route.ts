import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function svc() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

// Public: centers with live remaining seats for one exam.
// GET /api/exam-centers?exam_id=UUID
export async function GET(req: Request) {
  try {
    const exam_id = new URL(req.url).searchParams.get("exam_id");
    if (!exam_id) return NextResponse.json({ error: "exam_id required" }, { status: 400 });
    const db = svc();
    const { data: centers, error: cerr } = await db.from("exam_centers")
      .select("id,name,address,city,capacity,contact_phone,center_code,num_classes,seats_per_class,is_active")
      .eq("is_active", true).order("name");
    if (cerr) return NextResponse.json({ error: cerr.message }, { status: 400 });
    const { data: regs } = await db.from("registrations")
      .select("center_id").eq("exam_id", exam_id).neq("status", "cancelled");
    const used = new Map<string, number>();
    for (const r of (regs || []) as any[]) used.set(r.center_id, (used.get(r.center_id) || 0) + 1);
    const out = (centers || []).map((c: any) => {
      const taken = used.get(c.id) || 0;
      const left = Math.max(0, (c.capacity || 0) - taken);
      return { ...c, taken, left, full: left <= 0 };
    }).sort((a, b) => b.left - a.left); // most seats first = recommended
    return NextResponse.json({ centers: out });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
