import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/supabase";

// Admin uploads exam question paper PDF (multipart: exam_id + file).
export async function POST(req: Request) {
  try {
    const token = req.headers.get("x-access-token");
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: { user } } = await anon.auth.getUser(token);
    if (!user?.email || !isAdminEmail(user.email)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const form = await req.formData();
    const examId = form.get("exam_id") as string | null;
    const file = form.get("file") as File | null;
    if (!examId || !file) return NextResponse.json({ error: "exam_id + PDF file required" }, { status: 400 });
    if (file.size > 15 * 1024 * 1024) return NextResponse.json({ error: "Max 15 MB" }, { status: 400 });

    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const buf = Buffer.from(await file.arrayBuffer());
    const path = `${examId}.pdf`;
    const { error: uerr } = await db.storage.from("question-papers").upload(path, buf, { upsert: true, contentType: "application/pdf" });
    if (uerr) return NextResponse.json({ error: uerr.message }, { status: 400 });
    const { data } = db.storage.from("question-papers").getPublicUrl(path);
    const { error: derr } = await db.from("exams").update({ question_paper_url: data.publicUrl }).eq("id", examId);
    if (derr) return NextResponse.json({ error: derr.message }, { status: 400 });
    return NextResponse.json({ ok: true, url: data.publicUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
