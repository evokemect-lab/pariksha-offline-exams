"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Profile, Registration } from "@/lib/types";

export default function Dashboard() {
  const [regs, setRegs] = useState<Registration[]>([]);
  const [email, setEmail] = useState("");
  const [uid, setUid] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  function sb() {
    return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  }

  useEffect(() => {
    (async () => {
      const s = sb();
      const { data: { session } } = await s.auth.getSession();
      if (!session) { router.push("/login"); return; }
      setEmail(session.user.email || "");
      setUid(session.user.id);
      const [{ data: r }, { data: p }] = await Promise.all([
        s.from("registrations").select("*, exams(*), exam_centers(*)").eq("student_id", session.user.id).order("created_at", { ascending: false }),
        s.from("profiles").select("*").eq("id", session.user.id).single()
      ]);
      setRegs((r || []) as any);
      if (p) setProfile(p as Profile);
    })();
  }, [router]);

  async function saveProfile() {
    if (!profile) return;
    setSaving(true); setMsg("");
    try {
      const s = sb();
      const { error } = await s.from("profiles").update({
        full_name: profile.full_name, phone: profile.phone,
        father_name: profile.father_name, mother_name: profile.mother_name,
        dob: profile.dob || null, gender: profile.gender, category: profile.category,
        address: profile.address, id_proof_no: profile.id_proof_no
      }).eq("id", uid);
      if (error) throw error;
      setMsg("Profile saved ✓");
    } catch (err: any) {
      // RLS-safe fallback via server
      try {
        const s = sb();
        const { data: { session } } = await s.auth.getSession();
        const pr = await fetch("/api/ensure-profile", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ access_token: session?.access_token, profile })
        });
        const pj = await pr.json();
        setMsg(pr.ok ? "Profile saved ✓" : (pj.error || "Save failed"));
      } catch (e: any) { setMsg(e?.message || "Save failed"); }
    }
    setSaving(false);
  }

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !uid) return;
    setUploading(true); setMsg("");
    try {
      const s = sb();
      const ext = f.name.split(".").pop() || "jpg";
      const path = `${uid}.${ext}`;
      const { error: uerr } = await s.storage.from("photos").upload(path, f, { upsert: true, contentType: f.type });
      if (uerr) throw uerr;
      const { data } = s.storage.from("photos").getPublicUrl(path);
      const { error: perr } = await s.from("profiles").update({ photo_url: data.publicUrl }).eq("id", uid);
      if (perr) throw perr;
      setProfile(p => p ? { ...p, photo_url: data.publicUrl } : p);
      setMsg("Photo uploaded ✓");
    } catch (err: any) { setMsg(err.message); }
    setUploading(false);
  }

  async function logout() {
    await sb().auth.signOut();
    router.push("/");
  }

  const set = (k: keyof Profile, v: string) => setProfile(p => p ? { ...p, [k]: v } : p);

  return (
    <main className="mt-8 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">My exams {email && <span className="text-sm font-normal text-slate-500">({email})</span>}</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowProfile(v => !v)} className="btn-ghost text-sm">My profile</button>
          <button onClick={logout} className="btn-ghost text-sm">Logout</button>
        </div>
      </div>

      {showProfile && profile && (
        <div className="card space-y-3">
          <h2 className="font-bold">Candidate details (printed on hall ticket)</h2>
          <div className="flex items-center gap-4">
            {profile.photo_url
              ? <img src={profile.photo_url} alt="photo" className="h-24 w-20 border border-slate-300 object-cover" />
              : <div className="grid h-24 w-20 place-items-center border border-dashed border-slate-300 text-center text-[10px] text-slate-500">No photo</div>}
            <div>
              <label className="btn-ghost inline-block cursor-pointer text-sm">
                {uploading ? "Uploading…" : "Upload photo"}
                <input type="file" accept="image/*" className="hidden" onChange={uploadPhoto} disabled={uploading} />
              </label>
              <p className="mt-1 text-xs text-slate-500">Passport-size, JPG/PNG. Shown on hall ticket.</p>
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <div><label className="label">Full name</label><input className="input" value={profile.full_name || ""} onChange={e=>set("full_name", e.target.value)} /></div>
            <div><label className="label">Phone</label><input className="input" value={profile.phone || ""} onChange={e=>set("phone", e.target.value)} /></div>
            <div><label className="label">Father's name</label><input className="input" value={profile.father_name || ""} onChange={e=>set("father_name", e.target.value)} /></div>
            <div><label className="label">Mother's name</label><input className="input" value={profile.mother_name || ""} onChange={e=>set("mother_name", e.target.value)} /></div>
            <div><label className="label">Date of birth</label><input className="input" type="date" value={profile.dob || ""} onChange={e=>set("dob", e.target.value)} /></div>
            <div><label className="label">Gender</label>
              <select className="input" value={profile.gender || ""} onChange={e=>set("gender", e.target.value)}>
                <option value="">Select</option><option>Male</option><option>Female</option><option>Other</option>
              </select>
            </div>
            <div><label className="label">Category</label>
              <select className="input" value={profile.category || ""} onChange={e=>set("category", e.target.value)}>
                <option value="">Select</option><option>General</option><option>EWS</option><option>OBC-NCL</option><option>SC</option><option>ST</option>
              </select>
            </div>
            <div><label className="label">ID proof no.</label><input className="input" value={profile.id_proof_no || ""} onChange={e=>set("id_proof_no", e.target.value)} /></div>
          </div>
          <div><label className="label">Address</label><input className="input" value={profile.address || ""} onChange={e=>set("address", e.target.value)} /></div>
          <button onClick={saveProfile} className="btn" disabled={saving}>{saving ? "Saving…" : "Save profile"}</button>
          {msg && <div className="text-sm">{msg}</div>}
        </div>
      )}

      {!regs.length && <div className="card">No registrations yet. <Link href="/exams" className="text-brand">Browse exams</Link></div>}
      {regs.map(r => (
        <div key={r.id} className="card">
          <div className="text-xs text-slate-500">{r.hall_ticket_no} • {r.status}</div>
          <h2 className="font-bold">{(r as any).exams?.title}</h2>
          <div className="text-sm text-slate-500">
            {(r as any).exams?.exam_date} • {(r as any).exam_centers?.name}, {(r as any).exam_centers?.city}
            {r.room_no && <> • Room {r.room_no} Seat {r.seat_no}</>}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link href={`/hall-ticket/${r.id}`} className="btn text-sm">Hall ticket</Link>
            <Link href={`/results/${r.id}`} className="btn-ghost text-sm">Result</Link>
            {(r as any).exams?.question_paper_url && <a href={(r as any).exams.question_paper_url} target="_blank" className="btn-ghost text-sm">Question paper</a>}
          </div>
        </div>
      ))}
    </main>
  );
}
