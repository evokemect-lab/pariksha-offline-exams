"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";

export default function HallTicket() {
  const params = useParams() as { id: string };
  const [reg, setReg] = useState<any>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
        const { data, error } = await sb.from("registrations")
          .select("*, exams(*), exam_centers(*), profiles!registrations_student_id_fkey(*)")
          .eq("id", params.id).single();
        if (error) throw error;
        setReg(data);
      } catch (e: any) { setErr(e.message); }
    })();
  }, [params.id]);

  if (err) return <main className="mt-8 card">Error: {err}</main>;
  if (!reg) return <main className="mt-8">Loading hall ticket…</main>;

  const p = reg.profiles || {};
  const issued = ["confirmed", "paid", "attended"].includes(reg.status);

  return (
    <main className="mt-8">
      <div className="ticket-print mx-auto max-w-2xl border-2 border-slate-900 bg-white p-6 text-slate-900 shadow">
        {/* Header */}
        <div className="border-b-2 border-slate-900 pb-3 text-center">
          <h1 className="text-2xl font-black tracking-wide">PARIKSHA</h1>
          <div className="text-sm font-semibold">{reg.exams?.title}</div>
          <div className="mt-1 inline-block bg-slate-900 px-4 py-0.5 text-sm font-bold tracking-widest text-white">ADMIT CARD</div>
        </div>

        {/* Candidate block */}
        <div className="mt-4 flex gap-4">
          <div className="flex-1">
            <table className="w-full border-collapse text-sm">
              <tbody>
                {[
                  ["Roll No.", reg.hall_ticket_no],
                  ["Application No.", reg.id.slice(0, 8).toUpperCase()],
                  ["Candidate's Name", p.full_name],
                  ["Father's Name", p.father_name || "—"],
                  ["Mother's Name", p.mother_name || "—"],
                  ["Date of Birth", p.dob || "—"],
                  ["Gender", p.gender || "—"],
                  ["Category", p.category || "—"],
                  ["Medium", reg.exams?.medium || "English"],
                ].map(([k, v]) => (
                  <tr key={k} className="border-b border-slate-200">
                    <td className="w-40 py-1 pr-2 font-semibold text-slate-600">{k}</td>
                    <td className="py-1 font-bold">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex w-32 shrink-0 flex-col items-center gap-2">
            {p.photo_url
              ? <img src={p.photo_url} alt="Candidate photo" className="h-36 w-28 border border-slate-400 object-cover" />
              : <div className="grid h-36 w-28 place-items-center border border-dashed border-slate-400 p-1 text-center text-[10px] text-slate-500">Affix passport-size photo</div>}
            <QRCodeSVG value={reg.hall_ticket_no} size={96} />
            <div className="text-[10px] text-slate-500">Scan at entry</div>
          </div>
        </div>

        {/* Exam / centre block */}
        <div className="mt-4">
          <div className="bg-slate-100 px-2 py-1 text-sm font-bold">Examination & Centre Details</div>
          <table className="w-full border-collapse text-sm">
            <tbody>
              {[
                ["Exam Date", reg.exams?.exam_date],
                ["Timing", `${reg.exams?.start_time} – ${reg.exams?.end_time}`],
                ["Reporting Time", reg.exams?.reporting_time || "—"],
                ["Gate Closing Time", reg.exams?.gate_closing_time || "—"],
                ["Centre No.", reg.exam_centers?.center_code || "—"],
                ["Centre", `${reg.exam_centers?.name}, ${reg.exam_centers?.city}`],
                ["Address", reg.exam_centers?.address],
                ["Room / Seat", `${reg.room_no || "—"} / ${reg.seat_no || "—"}`],
              ].map(([k, v]) => (
                <tr key={k} className="border-b border-slate-200">
                  <td className="w-40 py-1 pr-2 font-semibold text-slate-600">{k}</td>
                  <td className="py-1">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!issued && (
          <div className="mt-3 border border-amber-500 bg-amber-50 p-2 text-xs font-semibold text-amber-800">
            PROVISIONAL — hall ticket not yet issued by admin. It becomes valid after issue (status: {reg.status}).
          </div>
        )}

        {/* Instructions */}
        <div className="mt-4 text-xs">
          <div className="font-bold">Important Instructions:</div>
          <ol className="list-decimal pl-5">
            <li>Bring this printed admit card + a valid photo ID (Aadhaar / PAN / Passport / Voter ID / Driving Licence).</li>
            <li>Report at the reporting time. No entry after gate closing time under any circumstances.</li>
            <li>Mobile phones, smart watches, calculators, notes and bags are strictly prohibited.</li>
            <li>Details (name, DOB, photo) must match your application — report discrepancies to the helpdesk immediately.</li>
            <li>QR code will be scanned at entry for attendance. Preserve this card until results are declared.</li>
          </ol>
        </div>

        {/* Signatures */}
        <div className="mt-6 flex justify-between text-xs">
          <div className="text-center">
            <div className="h-10 w-44 border-b border-slate-900"></div>
            <div className="mt-1 font-semibold">Candidate's Signature</div>
          </div>
          <div className="text-center">
            <div className="h-10 w-44 border-b border-slate-900"></div>
            <div className="mt-1 font-semibold">Invigilator's Signature</div>
          </div>
        </div>

        <button onClick={() => window.print()} className="no-print btn mt-4 w-full">Print / Save PDF</button>
      </div>
    </main>
  );
}
