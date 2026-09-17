"use client";
import { useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

import { useEffect } from "react";

export default function Verify() {
  const [code, setCode] = useState("");
  const [res, setRes] = useState<any>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const scanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: 250 }, false);
    scanner.render((decoded) => setCode(decoded), () => {});
    return () => { scanner.clear().catch(() => {}); };
  }, []);

  async function lookup() {
    setMsg("Checking…"); setRes(null);
    const r = await fetch("/api/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hall_ticket_no: code }) });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error); return; }
    setRes(j); setMsg("");
  }

  async function attend() {
    const r = await fetch("/api/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hall_ticket_no: code, mark_attended: true }) });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error); return; }
    setRes(j); setMsg("Marked attended ✓");
  }

  return (
    <main className="mt-8 mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-black">Gate verification</h1>
      <div id="qr-reader" />
      <div className="card space-y-2">
        <label className="label">Hall ticket no (or scanned QR)</label>
        <input className="input font-mono" value={code} onChange={e=>setCode(e.target.value)} placeholder="MATH-OL-001-2026-XXXXXX" />
        <div className="flex gap-2">
          <button onClick={lookup} className="btn flex-1">Lookup</button>
          <button onClick={attend} className="btn-ghost flex-1">Mark attended</button>
        </div>
        {msg && <div className="text-sm">{msg}</div>}
        {res?.registration && (
          <div className="text-sm">
            <div><b>{res.registration.profiles?.full_name}</b> — {res.registration.exams?.title}</div>
            <div>{res.registration.exams?.exam_date} • Room {res.registration.room_no || "—"} Seat {res.registration.seat_no || "—"}</div>
            <div>Status: {res.registration.status} / {res.registration.payment_status}</div>
          </div>
        )}
      </div>
    </main>
  );
}
