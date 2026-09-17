"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useParams, useRouter } from "next/navigation";
import { type Exam, type ExamCenter } from "@/lib/types";

export default function ExamDetail() {
  const params = useParams() as { id: string };
  const router = useRouter();
  const [exam, setExam] = useState<Exam | null>(null);
  const [centers, setCenters] = useState<ExamCenter[]>([]);
  const [centerId, setCenterId] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    sb.from("exams").select("*").eq("id", params.id).single().then(({ data }) => setExam(data as Exam));
    sb.from("exam_centers").select("*").eq("is_active", true).then(({ data }) => {
      setCenters((data || []) as ExamCenter[]);
      if (data?.[0]) setCenterId(data[0].id);
    });
  }, [params.id]);

  async function register() {
    setMsg(""); setLoading(true);
    try {
      const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const res = await fetch("/api/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exam_id: params.id, center_id: centerId, access_token: session.access_token })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Registration failed");
      setMsg(`Registered! Hall ticket: ${j.hall_ticket_no}`);
    } catch (e: any) { setMsg(e.message); }
    setLoading(false);
  }

  if (!exam) return <main className="mt-8">Loading…</main>;

  return (
    <main className="mt-8 space-y-4">
      <div className="card">
        <div className="text-xs text-slate-500">{exam.code}</div>
        <h1 className="text-2xl font-black">{exam.title}</h1>
        <p className="mt-2 text-slate-600">{exam.description}</p>
        <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
          <div>Date: <b>{exam.exam_date}</b></div>
          <div>Time: <b>{exam.start_time} – {exam.end_time}</b></div>
          <div>Deadline: <b>{exam.registration_deadline}</b></div>
          <div>Total marks: <b>{exam.total_marks}</b></div>
        </div>
      </div>

      <div className="card space-y-3">
        <h2 className="font-bold">Register for this exam</h2>
        <div>
          <label className="label">Exam center</label>
          <select className="input" value={centerId} onChange={e=>setCenterId(e.target.value)}>
            {centers.map(c => <option key={c.id} value={c.id}>{c.name} — {c.city} (cap {c.capacity})</option>)}
          </select>
        </div>
        <button className="btn" disabled={loading || !centerId} onClick={register}>{loading ? "Registering…" : "Register"}</button>
        {msg && <div className="text-sm">{msg}</div>}
      </div>
    </main>
  );
}
