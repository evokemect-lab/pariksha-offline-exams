"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

export default function Admin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [data, setData] = useState<any>(null);
  const [msg, setMsg] = useState("");

  // exam form
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [examDate, setExamDate] = useState("");
  const [fee, setFee] = useState("199");

  async function login() {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) { setMsg(error.message); return; }
    setToken(data.session?.access_token || "");
    setMsg("Logged in — loading data…");
    load(data.session?.access_token || "");
  }

  async function load(t = token) {
    const res = await fetch("/api/admin-data", { headers: { "x-access-token": t } });
    const j = await res.json();
    if (!res.ok) { setMsg(j.error); return; }
    setData(j); setMsg("");
  }

  async function createExam() {
    const res = await fetch("/api/admin-data", {
      method: "POST", headers: { "Content-Type": "application/json", "x-access-token": token },
      body: JSON.stringify({ action: "create-exam", code, title, exam_date: examDate, fee: Number(fee) })
    });
    const j = await res.json();
    if (!res.ok) { setMsg(j.error); return; }
    setMsg("Exam created"); load();
  }

  async function act(action: string, payload: any) {
    const res = await fetch("/api/admin-data", {
      method: "POST", headers: { "Content-Type": "application/json", "x-access-token": token },
      body: JSON.stringify({ action, ...payload })
    });
    const j = await res.json();
    setMsg(j.error || "Done"); load();
  }

  return (
    <main className="mt-8 space-y-4">
      <h1 className="text-2xl font-black">Admin — offline exams</h1>
      {!token && (
        <div className="card mx-auto max-w-md space-y-2">
          <div><label className="label">Admin email</label><input className="input" value={email} onChange={e=>setEmail(e.target.value)} /></div>
          <div><label className="label">Password</label><input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} /></div>
          <button onClick={login} className="btn w-full">Login as admin</button>
          <p className="text-xs text-slate-400">Must be in ADMIN_EMAILS + have role=admin in profiles (set via Supabase dashboard).</p>
        </div>
      )}
      {msg && <div className="text-sm">{msg}</div>}

      {data && (
        <>
          <div className="card space-y-2">
            <h2 className="font-bold">Create exam (quick)</h2>
            <div className="grid gap-2 md:grid-cols-4">
              <input className="input" placeholder="Code e.g. SCI-002" value={code} onChange={e=>setCode(e.target.value)} />
              <input className="input" placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} />
              <input className="input" type="date" value={examDate} onChange={e=>setExamDate(e.target.value)} />
              <input className="input" placeholder="Fee" value={fee} onChange={e=>setFee(e.target.value)} />
            </div>
            <button onClick={createExam} className="btn">Create</button>
          </div>

          <div className="card">
            <h2 className="font-bold">Registrations ({data.registrations?.length || 0})</h2>
            <div className="mt-2 space-y-2">
              {(data.registrations || []).slice(0, 50).map((r: any) => (
                <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 p-2 text-sm">
                  <span className="font-mono">{r.hall_ticket_no}</span>
                  <span>{r.profiles?.full_name}</span>
                  <span className="text-slate-400">{r.exams?.code} • {r.payment_status}/{r.status}</span>
                  <button onClick={() => act("confirm-payment", { id: r.id })} className="btn-ghost text-xs">Confirm pay</button>
                  <button onClick={() => {
                    const room = prompt("Room no?", r.room_no || "A1");
                    const seat = prompt("Seat no?", r.seat_no || "1");
                    if (room) act("assign-seat", { id: r.id, room_no: room, seat_no: seat });
                  }} className="btn-ghost text-xs">Seat</button>
                  <button onClick={() => {
                    const marks = prompt("Marks?");
                    if (marks) act("publish-result", { registration_id: r.id, marks_obtained: Number(marks) });
                  }} className="btn-ghost text-xs">Result</button>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="font-bold">Exams</h2>
            {(data.exams || []).map((e: any) => (
              <div key={e.id} className="flex items-center gap-2 py-1 text-sm">
                <span className="font-mono">{e.code}</span><span>{e.title}</span>
                <span className="text-slate-400">{e.status}</span>
                <button onClick={() => act("set-exam-status", { id: e.id, status: "published" })} className="btn-ghost text-xs">Publish</button>
                <button onClick={() => act("set-exam-status", { id: e.id, status: "closed" })} className="btn-ghost text-xs">Close</button>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
