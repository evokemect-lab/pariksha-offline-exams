"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useParams } from "next/navigation";

export default function ResultView() {
  const params = useParams() as { id: string };
  const [row, setRow] = useState<any>(null);
  const [msg, setMsg] = useState("Loading…");

  useEffect(() => {
    (async () => {
      const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const { data, error } = await sb.from("results").select("*, registrations!inner(*, exams(*))").eq("registration_id", params.id).single();
      if (error || !data) { setMsg("Result not published yet."); return; }
      if (!(data as any).published) { setMsg("Result not published yet."); return; }
      setRow(data); setMsg("");
    })();
  }, [params.id]);

  return (
    <main className="mt-8 card mx-auto max-w-md text-center">
      <h1 className="text-xl font-black">Result</h1>
      {msg && <p className="mt-2 text-slate-500">{msg}</p>}
      {row && (
        <div className="mt-3 space-y-1">
          <div className="text-sm text-slate-500">{row.registrations?.exams?.title}</div>
          <div className="text-4xl font-black text-brand">{row.marks_obtained}/{row.registrations?.exams?.total_marks}</div>
          <div>Grade: <b>{row.grade || "—"}</b> Rank: <b>{row.rank || "—"}</b></div>
          <div className="text-sm text-slate-500">{row.remarks}</div>
        </div>
      )}
    </main>
  );
}
