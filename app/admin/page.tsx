"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Tab = "exams" | "centers" | "tickets" | "students" | "seating" | "results" | "papers";

export default function Admin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [data, setData] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState<Tab>("tickets");
  const [busy, setBusy] = useState(false);

  // exam form
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [examDate, setExamDate] = useState("");
  // center form
  const [cName, setCName] = useState("");
  const [cCode, setCCode] = useState("");
  const [cAddr, setCAddr] = useState("");
  const [cCity, setCCity] = useState("");
  const [cCap, setCCap] = useState("100");
  const [cPhone, setCPhone] = useState("");
  const [cRooms, setCRooms] = useState("4");
  const [cPer, setCPer] = useState("30");
  const [seatCenter, setSeatCenter] = useState("");
  // filters / results csv
  const [examFilter, setExamFilter] = useState("");
  const [csv, setCsv] = useState("");
  const [qpExam, setQpExam] = useState("");
  const [qpFile, setQpFile] = useState<File | null>(null);

  const envMissing = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  async function login() {
    if (envMissing) { setMsg("App not configured on this deployment (missing Supabase keys)."); return; }
    setMsg(""); setBusy(true);
    try {
      const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) { setMsg(error.message); return; }
      setToken(data.session?.access_token || "");
      setMsg("Logged in — loading data…");
      await load(data.session?.access_token || "");
    } catch (e: any) { setMsg(e?.message || "Login failed"); }
    finally { setBusy(false); }
  }

  async function load(t = token) {
    try {
      const res = await fetch("/api/admin-data", { headers: { "x-access-token": t } });
      const j = await res.json();
      if (!res.ok) { setMsg(j.error); return; }
      setData(j); setMsg("");
      if (!examFilter && j.exams?.[0]) setExamFilter(j.exams[0].id);
      if (!qpExam && j.exams?.[0]) setQpExam(j.exams[0].id);
    } catch (e: any) { setMsg(e?.message || "Load failed"); }
  }

  async function act(action: string, payload: any = {}) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin-data", {
        method: "POST", headers: { "Content-Type": "application/json", "x-access-token": token },
        body: JSON.stringify({ action, ...payload })
      });
      const j = await res.json();
      setMsg(j.error || j.message || "Done ✓");
      await load();
    } catch (e: any) { setMsg(e?.message || "Failed"); }
    setBusy(false);
  }

  async function uploadResults() {
    const rows = csv.split("\n").map(l => l.trim()).filter(Boolean).map(l => {
      const [hall_ticket_no, marks, grade] = l.split(",").map(s => s.trim());
      return { hall_ticket_no, marks_obtained: Number(marks), grade: grade || null };
    }).filter(r => r.hall_ticket_no && !isNaN(r.marks_obtained));
    if (!rows.length) { setMsg("No valid rows. Format: HALLTICKET,marks,grade"); return; }
    await act("bulk-results", { rows, exam_id: examFilter });
    setCsv("");
  }

  async function uploadPaper() {
    if (!qpFile || !qpExam) { setMsg("Choose exam + PDF file"); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("exam_id", qpExam);
      fd.append("file", qpFile);
      const res = await fetch("/api/upload-question", { method: "POST", headers: { "x-access-token": token }, body: fd });
      const j = await res.json();
      setMsg(j.error || "Question paper uploaded ✓");
      setQpFile(null);
      await load();
    } catch (e: any) { setMsg(e?.message || "Upload failed"); }
    setBusy(false);
  }

  const regs = (data?.registrations || []).filter((r: any) => !examFilter || r.exam_id === examFilter);
  const pending = regs.filter((r: any) => r.status === "pending");
  const examResults = (data?.results || []).filter((r: any) => !examFilter || r.registrations?.exam_id === examFilter);
  const students = (() => {
    const m = new Map<string, any>();
    for (const r of (data?.registrations || []) as any[]) {
      if (!m.has(r.student_id)) m.set(r.student_id, { id: r.student_id, name: r.profiles?.full_name || "—", phone: r.profiles?.phone || "", count: 0 });
      m.get(r.student_id).count++;
    }
    return [...m.values()];
  })();
  const seatRegs = ((data?.registrations || []) as any[]).filter(r =>
    (!examFilter || r.exam_id === examFilter) &&
    (!seatCenter || r.center_id === seatCenter) &&
    ["confirmed", "paid", "attended"].includes(r.status));
  const seatCenterObj = (data?.centers || []).find((c: any) => c.id === seatCenter);
  const seatRooms = (() => {
    const m = new Map<string, any[]>();
    for (const r of seatRegs.filter(r => r.room_no)) {
      if (!m.has(r.room_no)) m.set(r.room_no, []);
      m.get(r.room_no)!.push(r);
    }
    return [...m.entries()].sort().map(([room, list]) => ({
      room, list: list.sort((a, b) => Number(a.seat_no) - Number(b.seat_no))
    }));
  })();
  const unseated = seatRegs.filter(r => !r.room_no || !r.seat_no).length;

  const tabs: { id: Tab; label: string }[] = [
    { id: "tickets", label: "🎫 Hall Tickets" },
    { id: "students", label: "👥 Students" },
    { id: "centers", label: "🏫 Centers" },
    { id: "seating", label: "🪑 Seating" },
    { id: "results", label: "📊 Results" },
    { id: "papers", label: "📄 Q. Papers" },
    { id: "exams", label: "📝 Exams" },
  ];

  return (
    <main className="mt-8 space-y-4">
      <h1 className="text-2xl font-black">Admin panel</h1>
      {!token && (
        <div className="card mx-auto max-w-md space-y-2">
          <div><label className="label">Admin email</label><input className="input" value={email} onChange={e=>setEmail(e.target.value)} /></div>
          <div><label className="label">Password</label><input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} /></div>
          <button onClick={login} className="btn w-full" disabled={busy}>{busy ? "Logging in…" : "Login as admin"}</button>
          <p className="text-xs text-slate-500">Must be in ADMIN_EMAILS + role=admin in profiles.</p>
        </div>
      )}
      {msg && <div className="text-sm">{msg}</div>}

      {data && (
        <>
          <div className="no-print flex flex-wrap gap-2">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={tab === t.id ? "btn text-sm" : "btn-ghost text-sm"}>{t.label}</button>
            ))}
            <button onClick={() => load()} className="btn-ghost text-sm" disabled={busy}>↻ Refresh</button>
          </div>

          {tab === "tickets" && (
            <div className="card space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-bold">Hall ticket issuing</h2>
                <select className="input max-w-xs" value={examFilter} onChange={e=>setExamFilter(e.target.value)}>
                  {(data.exams || []).map((e: any) => <option key={e.id} value={e.id}>{e.code} — {e.title}</option>)}
                </select>
                <span className="text-sm text-slate-500">{pending.length} pending / {regs.length} total</span>
                <button onClick={() => act("bulk-confirm", { exam_id: examFilter })} className="btn text-sm" disabled={busy || !pending.length}>
                  Issue all pending ({pending.length})
                </button>
              </div>
              <div className="space-y-2">
                {regs.slice(0, 100).map((r: any) => (
                  <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-2 text-sm">
                    <span className="font-mono text-xs">{r.hall_ticket_no}</span>
                    <span className="font-semibold">{r.profiles?.full_name}</span>
                    <span className="text-slate-500">{r.exam_centers?.name} • R:{r.room_no || "?"} S:{r.seat_no || "?"}</span>
                    <span className={`rounded px-2 py-0.5 text-xs font-bold ${r.status === "confirmed" || r.status === "attended" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>{r.status}</span>
                    {r.status === "pending" && <button onClick={() => act("issue-ticket", { id: r.id })} className="btn-ghost text-xs">Issue</button>}
                    <button onClick={() => {
                      const room = prompt("Room no?", r.room_no || "A1");
                      const seat = prompt("Seat no?", r.seat_no || "1");
                      if (room) act("assign-seat", { id: r.id, room_no: room, seat_no: seat });
                    }} className="btn-ghost text-xs">Room/Seat</button>
                    <button onClick={() => {
                      if (confirm(`Remove registration ${r.hall_ticket_no} (${r.profiles?.full_name})? Hall ticket + result will be deleted.`)) act("delete-registration", { id: r.id });
                    }} className="btn-ghost text-xs !border-red-300 !text-red-600">Remove</button>
                  </div>
                ))}
                {!regs.length && <div className="text-sm text-slate-500">No registrations for this exam yet.</div>}
              </div>
            </div>
          )}

          {tab === "students" && (
            <div className="card space-y-2">
              <h2 className="font-bold">Students ({students.length})</h2>
              <p className="text-xs text-slate-500">Deleting a student removes their account, all registrations, hall tickets and results permanently.</p>
              <div className="max-h-96 space-y-1 overflow-auto">
                {students.map((s: any) => (
                  <div key={s.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-2 text-sm">
                    <span className="font-semibold">{s.name}</span>
                    <span className="text-slate-500">{s.phone || ""} • {s.count} registration(s)</span>
                    <button onClick={() => {
                      if (confirm(`Delete student ${s.name}? Everything of theirs will be removed.`)) act("delete-student", { id: s.id });
                    }} className="btn-ghost text-xs !border-red-300 !text-red-600">Delete</button>
                  </div>
                ))}
                {!students.length && <div className="text-sm text-slate-500">No students yet.</div>}
              </div>
            </div>
          )}

          {tab === "seating" && (
            <div className="space-y-4">
              <div className="card no-print space-y-3">
                <h2 className="font-bold">Automatic seat allocation</h2>
                <div className="flex flex-wrap gap-2">
                  <select className="input max-w-xs" value={examFilter} onChange={e=>setExamFilter(e.target.value)}>
                    {(data.exams || []).map((e: any) => <option key={e.id} value={e.id}>{e.code} — {e.title}</option>)}
                  </select>
                  <select className="input max-w-xs" value={seatCenter} onChange={e=>setSeatCenter(e.target.value)}>
                    <option value="">Select center…</option>
                    {(data.centers || []).map((c: any) => <option key={c.id} value={c.id}>{c.center_code || ""} {c.name} ({c.num_classes || 1}×{c.seats_per_class || 30})</option>)}
                  </select>
                </div>
                {seatCenterObj && (
                  <div className="text-sm text-slate-500">
                    {seatCenterObj.num_classes || 1} classes × {seatCenterObj.seats_per_class || 30} = <b>{(seatCenterObj.num_classes || 1) * (seatCenterObj.seats_per_class || 30)} seats</b> •
                    {" "}{seatRegs.length} issued students • {unseated} without seat
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => act("auto-allocate", { exam_id: examFilter, center_id: seatCenter, mode: "fill" })} className="btn text-sm" disabled={busy || !seatCenter || !unseated}>Auto-allocate ({unseated} pending)</button>
                  <button onClick={() => { if (confirm("Re-allocate ALL seats at this center from scratch?")) act("auto-allocate", { exam_id: examFilter, center_id: seatCenter, mode: "reallocate" }); }} className="btn-ghost text-sm" disabled={busy || !seatCenter}>Re-allocate all</button>
                  <button onClick={() => window.print()} className="btn-ghost text-sm" disabled={!seatRooms.length}>🖨️ Print notice-board PDF</button>
                </div>
              </div>

              {seatRooms.map(g => (
                <div key={g.room} className="ticket-print card">
                  <h3 className="font-black">{g.room} <span className="text-sm font-normal text-slate-500">({g.list.length} students)</span></h3>
                  <table className="mt-2 w-full border-collapse text-sm">
                    <thead><tr className="border-b-2 border-slate-900">
                      <th className="py-1 text-left">Seat</th><th className="text-left">Hall Ticket No.</th><th className="text-left">Name</th>
                    </tr></thead>
                    <tbody>
                      {g.list.map((r: any) => (
                        <tr key={r.id} className="border-b border-slate-200">
                          <td className="py-1 font-bold">{r.seat_no}</td>
                          <td className="font-mono text-xs">{r.hall_ticket_no}</td>
                          <td>{r.profiles?.full_name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
              {!seatRooms.length && <div className="card text-sm text-slate-500">No allocated seats yet — select exam + center and run auto-allocate.</div>}
            </div>
          )}

          {tab === "centers" && (
            <div className="space-y-4">
              <div className="card space-y-2">
                <h2 className="font-bold">Add exam center</h2>
                <div className="grid gap-2 md:grid-cols-3">
                  <input className="input" placeholder="Center name" value={cName} onChange={e=>setCName(e.target.value)} />
                  <input className="input" placeholder="Center code (e.g. C01)" value={cCode} onChange={e=>setCCode(e.target.value)} />
                  <input className="input" placeholder="City" value={cCity} onChange={e=>setCCity(e.target.value)} />
                  <input className="input md:col-span-2" placeholder="Address" value={cAddr} onChange={e=>setCAddr(e.target.value)} />
                  <input className="input" placeholder="Capacity" value={cCap} onChange={e=>setCCap(e.target.value)} />
                  <input className="input" placeholder="Contact phone" value={cPhone} onChange={e=>setCPhone(e.target.value)} />
                  <input className="input" placeholder="No. of classes" title="How many classrooms in this center" value={cRooms} onChange={e=>setCRooms(e.target.value)} />
                  <input className="input" placeholder="Seats per class" title="Students per classroom" value={cPer} onChange={e=>setCPer(e.target.value)} />
                </div>
                <button onClick={() => { act("create-center", { name: cName, center_code: cCode, address: cAddr, city: cCity, capacity: Number(cCap), contact_phone: cPhone, num_classes: Number(cRooms), seats_per_class: Number(cPer) }); setCName(""); setCCode(""); setCAddr(""); setCCity(""); setCPhone(""); }} className="btn" disabled={busy || !cName || !cCity}>Add center</button>
              </div>
              <div className="card space-y-2">
                <h2 className="font-bold">Centers ({(data.centers || []).length})</h2>
                {(data.centers || []).map((c: any) => (
                  <div key={c.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-2 text-sm">
                    <span className="font-mono text-xs">{c.center_code || "—"}</span>
                    <span className="font-semibold">{c.name}</span>
                    <span className="text-slate-500">{c.city} • cap {c.capacity} • {c.contact_phone}</span>
                    <span className="text-slate-500">🏫 {c.num_classes || 1} classes × {c.seats_per_class || 30} = {(c.num_classes || 1) * (c.seats_per_class || 30)} seats</span>
                    <span className={`rounded px-2 py-0.5 text-xs font-bold ${c.is_active ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-600"}`}>{c.is_active ? "Active" : "Inactive"}</span>
                    <button onClick={() => act("toggle-center", { id: c.id, is_active: !c.is_active })} className="btn-ghost text-xs">{c.is_active ? "Deactivate" : "Activate"}</button>
                    <button onClick={() => {
                      const n = prompt("How many classrooms?", String(c.num_classes || 1));
                      const s = prompt("Students per classroom?", String(c.seats_per_class || 30));
                      if (n && s) act("update-center", { id: c.id, num_classes: Number(n), seats_per_class: Number(s) });
                    }} className="btn-ghost text-xs">Classrooms</button>
                    <button onClick={() => {
                      if (confirm(`Delete center ${c.name}? Only possible when no registrations use it.`)) act("delete-center", { id: c.id });
                    }} className="btn-ghost text-xs !border-red-300 !text-red-600">Delete</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "results" && (
            <div className="space-y-4">
              <div className="card space-y-2">
                <h2 className="font-bold">Bulk upload results (CSV)</h2>
                <select className="input max-w-xs" value={examFilter} onChange={e=>setExamFilter(e.target.value)}>
                  {(data.exams || []).map((e: any) => <option key={e.id} value={e.id}>{e.code} — {e.title}</option>)}
                </select>
                <textarea className="input font-mono text-xs" rows={6}
                  placeholder={"HALLTICKETNO,marks,grade\nMATH-OL-001-2026-A1B2C3,85,A\n…"}
                  value={csv} onChange={e=>setCsv(e.target.value)} />
                <p className="text-xs text-slate-500">One per line: <b>hall_ticket_no, marks, grade</b>. Grade optional. Uploaded results are published immediately.</p>
                <button onClick={uploadResults} className="btn" disabled={busy || !csv.trim()}>Upload + Publish</button>
              </div>
              <div className="card">
                <h2 className="font-bold">Upload history ({(data.uploads || []).length})</h2>
                <div className="mt-2 space-y-1 text-sm">
                  {(data.uploads || []).slice(0, 10).map((u: any) => (
                    <div key={u.id} className="text-slate-500">
                      {new Date(u.created_at).toLocaleString()} • <b className="text-slate-800">{u.exams?.code}</b> • {u.success_rows}/{u.total_rows} rows
                    </div>
                  ))}
                  {!(data.uploads || []).length && <div className="text-sm text-slate-500">No uploads yet.</div>}
                </div>
              </div>
              <div className="card">
                <h2 className="font-bold">Published results ({examResults.length})</h2>
                <div className="mt-2 max-h-96 space-y-1 overflow-auto">
                  {examResults.slice(0, 200).map((r: any) => (
                    <div key={r.id} className="flex gap-2 text-sm">
                      <span className="font-mono text-xs">{r.registrations?.hall_ticket_no}</span>
                      <span className="font-bold">{r.marks_obtained}</span>
                      <span className="text-slate-500">{r.grade || ""}</span>
                    </div>
                  ))}
                  {!examResults.length && <div className="text-sm text-slate-500">None yet for this exam.</div>}
                </div>
              </div>
            </div>
          )}

          {tab === "papers" && (
            <div className="card space-y-3">
              <h2 className="font-bold">Question papers</h2>
              <select className="input max-w-xs" value={qpExam} onChange={e=>setQpExam(e.target.value)}>
                {(data.exams || []).map((e: any) => <option key={e.id} value={e.id}>{e.code} — {e.title}</option>)}
              </select>
              {(data.exams || []).filter((e: any) => e.id === qpExam).map((e: any) => (
                <div key={e.id} className="text-sm">
                  Current: {e.question_paper_url
                    ? <><a href={e.question_paper_url} target="_blank" className="text-brand">View PDF</a> <button onClick={() => act("remove-question-url", { id: e.id })} className="btn-ghost ml-2 text-xs">Remove</button></>
                    : <span className="text-slate-500">not uploaded</span>}
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-2">
                <input type="file" accept="application/pdf" className="text-sm" onChange={e=>setQpFile(e.target.files?.[0] || null)} />
                <button onClick={uploadPaper} className="btn text-sm" disabled={busy || !qpFile}>Upload PDF</button>
              </div>
              <p className="text-xs text-slate-500">Students see a download link on their dashboard once uploaded.</p>
            </div>
          )}

          {tab === "exams" && (
            <div className="space-y-4">
              <div className="card space-y-2">
                <h2 className="font-bold">Create exam</h2>
                <div className="grid gap-2 md:grid-cols-4">
                  <input className="input" placeholder="Code e.g. SCI-002" value={code} onChange={e=>setCode(e.target.value)} />
                  <input className="input" placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} />
                  <input className="input" type="date" value={examDate} onChange={e=>setExamDate(e.target.value)} />
                  <input className="input" placeholder="Fee" value="0" disabled />
                </div>
                <button onClick={() => { act("create-exam", { code, title, exam_date: examDate }); setCode(""); setTitle(""); }} className="btn" disabled={busy}>Create</button>
              </div>
              <div className="card">
                <h2 className="font-bold">Exams</h2>
                {(data.exams || []).map((e: any) => (
                  <div key={e.id} className="flex flex-wrap items-center gap-2 py-1 text-sm">
                    <span className="font-mono">{e.code}</span><span>{e.title}</span>
                    <span className="text-slate-500">{e.exam_date} • {e.status}</span>
                    <button onClick={() => act("set-exam-status", { id: e.id, status: "published" })} className="btn-ghost text-xs">Publish</button>
                    <button onClick={() => act("set-exam-status", { id: e.id, status: "closed" })} className="btn-ghost text-xs">Close</button>
                    <button onClick={() => act("set-exam-status", { id: e.id, status: "completed" })} className="btn-ghost text-xs">Complete</button>
                    <button onClick={() => {
                      if (confirm(`Delete exam ${e.code}? All its registrations, hall tickets and results will be deleted.`)) act("delete-exam", { id: e.id });
                    }} className="btn-ghost text-xs !border-red-300 !text-red-600">Delete</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
