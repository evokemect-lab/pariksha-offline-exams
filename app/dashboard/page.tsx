"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Registration } from "@/lib/types";

export default function Dashboard() {
  const [regs, setRegs] = useState<Registration[]>([]);
  const [email, setEmail] = useState("");
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { router.push("/login"); return; }
      setEmail(session.user.email || "");
      const { data } = await sb.from("registrations")
        .select("*, exams(*), exam_centers(*)")
        .eq("student_id", session.user.id).order("created_at", { ascending: false });
      setRegs((data || []) as any);
    })();
  }, [router]);

  async function logout() {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    await sb.auth.signOut();
    router.push("/");
  }

  return (
    <main className="mt-8 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">My exams {email && <span className="text-sm font-normal text-slate-500">({email})</span>}</h1>
        <button onClick={logout} className="btn-ghost text-sm">Logout</button>
      </div>
      {!regs.length && <div className="card">No registrations yet. <Link href="/exams" className="text-brand">Browse exams</Link></div>}
      {regs.map(r => (
        <div key={r.id} className="card">
          <div className="text-xs text-slate-500">{r.hall_ticket_no} • {r.payment_status} • {r.status}</div>
          <h2 className="font-bold">{(r as any).exams?.title}</h2>
          <div className="text-sm text-slate-500">
            {(r as any).exams?.exam_date} • {(r as any).exam_centers?.name}, {(r as any).exam_centers?.city}
            {r.room_no && <> • Room {r.room_no} Seat {r.seat_no}</>}
          </div>
          <div className="mt-2 flex gap-2">
            <Link href={`/hall-ticket/${r.id}`} className="btn text-sm">Hall ticket</Link>
            <Link href={`/results/${r.id}`} className="btn-ghost text-sm">Result</Link>
          </div>
        </div>
      ))}
    </main>
  );
}
