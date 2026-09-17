"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useParams } from "next/navigation";

function pctColor(p: number) {
  if (p >= 90) return "text-green-700";
  if (p >= 60) return "text-blue-800";
  if (p >= 40) return "text-amber-700";
  return "text-red-700";
}

export default function ResultMarksheet() {
  const params = useParams() as { id: string };
  const [row, setRow] = useState<any>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [msg, setMsg] = useState("Loading…");

  useEffect(() => {
    (async () => {
      const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const { data, error } = await sb.from("results")
        .select("*, registrations!inner(*, exams(*), exam_centers(name,city), profiles!registrations_student_id_fkey(full_name,phone,father_name,mother_name,dob))")
        .eq("registration_id", params.id).single();
      if (error || !data) { setMsg("Result not published yet."); return; }
      if (!(data as any).published) { setMsg("Result not published yet."); return; }
      setRow(data);
      const { data: subs } = await sb.from("result_subjects").select("*").eq("registration_id", params.id).order("subject");
      setSubjects(subs || []);
      setMsg("");
    })();
  }, [params.id]);

  if (msg) return <main className="mt-8 card mx-auto max-w-md text-center"><h1 className="text-xl font-black">Result</h1><p className="mt-2 text-sm text-slate-500">{msg}</p></main>;
  if (!row) return null;

  const reg = row.registrations;
  const prof = reg.profiles || {};
  const exam = reg.exams || {};
  const grand = Number(row.marks_obtained || 0);
  const maxTot = subjects.length
    ? subjects.reduce((s, x) => s + Number(x.max_marks || 0), 0)
    : Number(exam.total_marks || 100);
  const pct = maxTot > 0 ? (grand / maxTot) * 100 : 0;
  const passed = pct >= 40;
  const year = new Date(exam.exam_date || Date.now()).getFullYear();

  return (
    <main className="mt-6">
      <div className="ticket-print mx-auto max-w-3xl overflow-hidden rounded-2xl border border-sky-300 bg-white text-slate-900 shadow">
        {/* Header */}
        <div className="bg-gradient-to-b from-sky-200 to-sky-50 px-4 py-3 text-center">
          <h1 className="text-xl font-black tracking-wide text-sky-900">PARIKSHA EXAMINATION CELL</h1>
          <h2 className="font-bold text-slate-800">Examination Results - {year}</h2>
          <p className="text-xs text-slate-600">Results published on {new Date(row.created_at).toLocaleDateString("en-IN")} • For immediate information only</p>
        </div>

        {/* Candidate block */}
        <div className="border-y border-sky-200 bg-sky-50 px-4 py-1 text-center text-sm font-bold text-sky-900">
          {exam.title} — Register No : {reg.hall_ticket_no}
        </div>
        <div className="grid gap-x-6 gap-y-1 px-4 py-3 text-sm md:grid-cols-2">
          {[["Name of the Candidate", prof.full_name], ["Date of birth", prof.dob || "—"],
            ["Father's Name", prof.father_name || "—"], ["Mother's Name", prof.mother_name || "—"],
            ["Exam Center", `${reg.exam_centers?.name || "—"}, ${reg.exam_centers?.city || ""}`],
            ["Result", passed ? "PASSED — Eligible for Higher Studies" : "FAILED"]]
            .map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <span className="w-44 shrink-0 font-semibold text-sky-900">{k}</span>
                <span>: <b className={k === "Result" ? pctColor(pct) : ""}>{v}</b></span>
              </div>
            ))}
          <div className="flex gap-2">
            <span className="w-44 shrink-0 font-semibold text-sky-900">Rank</span>
            <span>: <b>{row.rank || "—"}</b></span>
          </div>
        </div>

        {/* Marks table */}
        <div className="px-4 pb-2">
          <table className="w-full border-collapse text-center text-sm">
            <thead>
              <tr className="bg-sky-200 text-sky-950">
                <th className="border border-sky-400 px-2 py-1 text-left">SUBJECTS</th>
                <th className="border border-sky-400 px-2 py-1">CE</th>
                <th className="border border-sky-400 px-2 py-1">PE</th>
                <th className="border border-sky-400 px-2 py-1">TE</th>
                <th className="border border-sky-400 px-2 py-1">TOTAL</th>
                <th className="border border-sky-400 px-2 py-1">GRADE</th>
              </tr>
            </thead>
            <tbody>
              {subjects.length ? subjects.map((s: any) => (
                <tr key={s.id}>
                  <td className="border border-sky-300 px-2 py-1 text-left font-bold">{s.subject}</td>
                  <td className="border border-sky-300 px-2 py-1">{s.ce}</td>
                  <td className="border border-sky-300 px-2 py-1">{s.pe}</td>
                  <td className="border border-sky-300 px-2 py-1">{s.te}</td>
                  <td className="border border-sky-300 px-2 py-1 font-black text-blue-800">{s.total}</td>
                  <td className="border border-sky-300 px-2 py-1 font-black">{s.grade}</td>
                </tr>
              )) : (
                <tr>
                  <td className="border border-sky-300 px-2 py-1 text-left font-bold">{exam.title}</td>
                  <td className="border border-sky-300 px-2 py-1">—</td>
                  <td className="border border-sky-300 px-2 py-1">—</td>
                  <td className="border border-sky-300 px-2 py-1">—</td>
                  <td className="border border-sky-300 px-2 py-1 font-black text-blue-800">{grand}</td>
                  <td className="border border-sky-300 px-2 py-1 font-black">{row.grade}</td>
                </tr>
              )}
              <tr className="bg-sky-100 font-black">
                <td className="border border-sky-400 px-2 py-1 text-left">GRAND TOTAL</td>
                <td className="border border-sky-400 px-2 py-1" colSpan={3}>{pct.toFixed(2)}%</td>
                <td className="border border-sky-400 px-2 py-1 text-blue-900">{grand} / {maxTot}</td>
                <td className="border border-sky-400 px-2 py-1">{row.grade}</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-1 bg-sky-100 px-2 py-1 text-xs">Abbreviations: CE - Continuous Evaluation, TE - Terminal Evaluation, PE - Practical Evaluation</p>
        </div>

        {/* Grade range */}
        <div className="px-4 pb-2">
          <div className="bg-sky-200 px-2 py-0.5 text-center text-sm font-bold text-sky-950">Grade Range (percentage of maximum)</div>
          <div className="grid grid-cols-2 gap-x-6 border border-sky-300 px-3 py-1 text-xs md:grid-cols-4">
            {[["A+", "90 & above"], ["A", "80 - 89"], ["B+", "70 - 79"], ["B", "60 - 69"], ["C+", "50 - 59"], ["C", "40 - 49"], ["D", "30 - 39"], ["E", "Below 30"]].map(([g, r]) => (
              <div key={g}><b>{g}</b> : {r}%</div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gradient-to-t from-sky-200 to-sky-50 px-4 py-2 text-center text-xs text-slate-600">
          Data Provided By Pariksha Examination Cell.
        </div>
        <p className="px-4 py-2 text-[11px] leading-snug text-slate-500">
          <b className="text-red-600">Disclaimer:</b> Results published online are for the immediate information of the
          examinees and cannot be treated as original mark sheets. Original mark sheets will be issued separately.
        </p>
        <div className="no-print flex justify-center gap-2 pb-4">
          <button onClick={() => window.print()} className="btn text-sm">🖨️ Print marksheet</button>
        </div>
      </div>
    </main>
  );
}
