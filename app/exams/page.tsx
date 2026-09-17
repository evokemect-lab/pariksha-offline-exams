import { publicSupabase } from "@/lib/supabase";
import { type Exam } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ExamsPage() {
  const sb = publicSupabase();
  const { data } = await sb.from("exams").select("*").in("status", ["published","closed"]).order("exam_date");
  const exams = (data || []) as Exam[];

  return (
    <main className="mt-8 space-y-4">
      <h1 className="text-2xl font-black">Upcoming offline exams</h1>
      {!exams.length && <div className="card">No exams published yet. Check back soon.</div>}
      <div className="grid gap-4 md:grid-cols-2">
        {exams.map(ex => (
          <div key={ex.id} className="card">
            <div className="text-xs text-slate-400">{ex.code} • {ex.exam_date} • {ex.start_time}-{ex.end_time}</div>
            <h2 className="mt-1 text-lg font-bold">{ex.title}</h2>
            <p className="mt-1 line-clamp-2 text-sm text-slate-400">{ex.description}</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-slate-400">Deadline: {ex.registration_deadline}</span>
            </div>
            <Link href={`/exams/${ex.id}`} className="btn mt-3 inline-block">View + Register</Link>
          </div>
        ))}
      </div>
    </main>
  );
}
