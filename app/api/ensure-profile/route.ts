import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Creates/updates the caller's OWN profile using service_role (bypasses RLS).
// Used at signup + dashboard save so profile setup never fails on policies.
export async function POST(req: Request) {
  try {
    const { access_token, profile } = await req.json();
    if (!access_token) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: { user }, error: uerr } = await anon.auth.getUser(access_token);
    if (uerr || !user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const p = profile || {};
    const { error } = await db.from("profiles").upsert({
      id: user.id,
      full_name: p.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Student",
      phone: p.phone ?? user.user_metadata?.phone ?? null,
      role: "student",
      father_name: p.father_name || null,
      mother_name: p.mother_name || null,
      dob: p.dob || null,
      gender: p.gender || null,
      category: p.category || null,
      address: p.address || null,
      id_proof_no: p.id_proof_no || null,
      ...(p.photo_url ? { photo_url: p.photo_url } : {})
    }, { onConflict: "id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
