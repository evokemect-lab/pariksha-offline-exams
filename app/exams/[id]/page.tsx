"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useParams, useRouter } from "next/navigation";
import { type Exam } from "@/lib/types";

interface CenterAvail {
  id: string; name: string; address: string; city: string; capacity: number;
  contact_phone: string | null; center_code: string | null;
  taken: number; left: number; full: boolean;
}

export default function ExamDetail() {
  const params = useParams() as { id: string };
  const router = useRouter();
  const [exam, setExam] = useState<Exam | null>(null);
  const [centers, setCenters] = useState<CenterAvail[]>([]);
  const [centerId, setCenterId] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    sb.from("exams").select("*").eq("id", params.id).single().then(({ data, error }) => {
      if (error || !data) setNotFound(true);
      else setExam(data as Exam);
    });
    // Live availability (sorted: most seats first). Refresh after each registration.
    fetch(`/api/exam-centers?exam_id=${params.id}`).then(r => r.json()).then(j => {
      const list = (j.centers || []) as CenterAvail[];
      setCenters(list);
      const firstOpen = list.find(c => !c.full);
      if (firstOpen) setCenterId(firstOpen.id);
    }).catch(() => {});
    sb.auth.getSession().then(({ data: { session } }) => setLoggedIn(!!session));
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => setLoggedIn(!!session));
    return () => { sub.subscription.unsubscribe(); };
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
      // Refresh seats-left so capacity visibly reduces after each registration
      fetch(`/api/exam-centers?exam_id=${params.id}`).then(r => r.json()).then(j2 => {
        const list = (j2.centers || []) as CenterAvail[];
        setCenters(list);
        if (list.find(c => c.id === centerId)?.full) {
          const next = list.find(c => !c.full);
          setCenterId(next ? next.id : "");
        }
      }).catch(() => {});
    } catch (e: any) { setMsg(e.message); }
    setLoading(false);
  }

  const allFull = centers.length > 0 && centers.every(c => c.full);

  if (notFound) return (    <main className="mt-8 card mx-auto max-w-md text-center">
      <h1 className="text-xl font-black">Exam no longer available</h1>
      <p className="mt-2 text-sm text-slate-500">This exam was removed or is no longer published. Please pick another from the list.</p>
      <button onClick={() => router.push("/exams")} className="btn mt-4">Back to exams</button>
    </main>
  );
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
          {exam.question_paper_url && <div><a href={exam.question_paper_url} target="_blank" className="font-bold text-brand">📄 Download question paper</a></div>}
        </div>
      </div>

      {loggedIn === null ? (
        <div className="card">Checking login…</div>
      ) : !loggedIn ? (
        <div className="card space-y-3 text-center">
          <h2 className="font-bold">Login required</h2>
          <p className="text-sm text-slate-500">Only logged-in students can register for exams. Create your account with candidate details first, then come back here.</p>
          <div className="flex justify-center gap-2">
            <button onClick={() => router.push("/login")} className="btn-ghost">Login</button>
            <button onClick={() => router.push("/register")} className="btn">Create account</button>
          </div>
        </div>
      ) : (
      <div className="card space-y-3">
        <h2 className="font-bold">Register for this exam</h2>
        <div>
          <label className="label">Exam center — seats reduce as students register</label>
          <select className="input" value={centerId} onChange={e=>setCenterId(e.target.value)}>
            {centers.map((c, i) => (
              <option key={c.id} value={c.id} disabled={c.full}>
                {c.name} — {c.city} ({c.full ? "FULL" : `${c.left} of ${c.capacity} seats left`}){i === 0 && !c.full ? " ⭐ Recommended" : ""}
              </option>
            ))}
          </select>
          {!centers.length && <p className="mt-1 text-xs text-slate-500">Loading centers…</p>}
        </div>
        <button className="btn" disabled={loading || !centerId || allFull} onClick={register}>{loading ? "Registering…" : "Register"}</button>
        {allFull && <div className="text-sm font-bold text-red-600">All centers are full for this exam.</div>}
        {msg && <div className="text-sm">{msg}</div>}
      </div>
      )}
    </main>
  );
}
