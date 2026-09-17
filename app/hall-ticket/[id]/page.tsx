"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";

export default function HallTicket() {
  const params = useParams() as { id: string };
  const [reg, setReg] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const { data } = await sb.from("registrations")
        .select("*, exams(*), exam_centers(*), profiles!registrations_student_id_fkey(full_name, phone)")
        .eq("id", params.id).single();
      setReg(data);
    })();
  }, [params.id]);

  if (!reg) return <main className="mt-8">Loading hall ticket…</main>;

  return (
    <main className="mt-8">
      <div className="ticket-print card mx-auto max-w-xl space-y-3 bg-white !text-black">
        <div className="flex items-center justify-between border-b-2 border-black pb-2">
          <div>
            <h1 className="text-xl font-black">HALL TICKET</h1>
            <div className="text-xs">{reg.exams?.code} — {reg.exams?.title}</div>
          </div>
          <QRCodeSVG value={reg.hall_ticket_no} size={96} />
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><b>Hall ticket no:</b> {reg.hall_ticket_no}</div>
          <div><b>Student:</b> {reg.profiles?.full_name}</div>
          <div><b>Date:</b> {reg.exams?.exam_date}</div>
          <div><b>Time:</b> {reg.exams?.start_time}–{reg.exams?.end_time}</div>
          <div><b>Center:</b> {reg.exam_centers?.name}, {reg.exam_centers?.city}</div>
          <div><b>Address:</b> {reg.exam_centers?.address}</div>
          <div><b>Room:</b> {reg.room_no || "—"} <b>Seat:</b> {reg.seat_no || "—"}</div>
          <div><b>Status:</b> {reg.status} / {reg.payment_status}</div>
        </div>
        <ul className="list-disc pl-5 text-xs">
          <li>Report 30 minutes early with this printout + photo ID.</li>
          <li>Mobile phones, smart watches, and notes are prohibited.</li>
          <li>QR will be scanned at entry for attendance.</li>
        </ul>
        <button onClick={() => window.print()} className="no-print btn w-full">Print</button>
      </div>
    </main>
  );
}
