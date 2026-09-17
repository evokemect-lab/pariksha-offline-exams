"use client";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [father, setFather] = useState("");
  const [mother, setMother] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [category, setCategory] = useState("");
  const [address, setAddress] = useState("");
  const [idProof, setIdProof] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const { data, error } = await sb.auth.signUp({
        email, password,
        options: { data: { full_name: fullName, phone } }
      });
      if (error) { setErr(error.message); return; }
      // If email confirmation is ON, there is no session yet — details saved on first login via dashboard.
      const { data: { session } } = await sb.auth.getSession();
      if (!session) {
        setErr("Account created! Check your email to confirm, then login.");
        return;
      }
      const uid = data.user?.id || session.user.id;

      // Photo upload (optional) — same session, right after signup
      let photoUrl: string | null = null;
      if (photo) {
        const ext = photo.name.split(".").pop() || "jpg";
        const { error: uerr } = await sb.storage.from("photos").upload(`${uid}.${ext}`, photo, { upsert: true, contentType: photo.type });
        if (uerr) {
          setErr("Account created but photo upload failed: " + uerr.message + " — add it later in dashboard.");
        } else {
          photoUrl = sb.storage.from("photos").getPublicUrl(`${uid}.${ext}`).data.publicUrl;
        }
      }

      const { error: perr } = await sb.from("profiles").upsert({
        id: uid, full_name: fullName, phone, role: "student",
        father_name: father || null, mother_name: mother || null,
        dob: dob || null, gender: gender || null, category: category || null,
        address: address || null, id_proof_no: idProof || null,
        ...(photoUrl ? { photo_url: photoUrl } : {})
      });
      if (perr) { setErr("Account created but saving details failed: " + perr.message); return; }
      router.push("/dashboard");
    } catch (err: any) {
      setErr(err?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto mt-10 max-w-md card">
      <h1 className="text-2xl font-black">Create student account</h1>
      <p className="mt-1 text-sm text-slate-500">Your candidate details for the hall ticket are collected here itself.</p>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <div><label className="label">Full name (as per ID) *</label><input className="input" value={fullName} onChange={e=>setFullName(e.target.value)} required /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="label">Father's name</label><input className="input" value={father} onChange={e=>setFather(e.target.value)} /></div>
          <div><label className="label">Mother's name</label><input className="input" value={mother} onChange={e=>setMother(e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="label">Date of birth</label><input className="input" type="date" value={dob} onChange={e=>setDob(e.target.value)} /></div>
          <div><label className="label">Gender</label>
            <select className="input" value={gender} onChange={e=>setGender(e.target.value)}>
              <option value="">Select</option><option>Male</option><option>Female</option><option>Other</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="label">Category</label>
            <select className="input" value={category} onChange={e=>setCategory(e.target.value)}>
              <option value="">Select</option><option>General</option><option>EWS</option><option>OBC-NCL</option><option>SC</option><option>ST</option>
            </select>
          </div>
          <div><label className="label">Phone *</label><input className="input" value={phone} onChange={e=>setPhone(e.target.value)} required /></div>
        </div>
        <div><label className="label">Address</label><input className="input" value={address} onChange={e=>setAddress(e.target.value)} /></div>
        <div><label className="label">ID proof no. (Aadhaar / PAN…)</label><input className="input" value={idProof} onChange={e=>setIdProof(e.target.value)} /></div>
        <div><label className="label">Passport-size photo</label><input type="file" accept="image/*" className="text-sm" onChange={e=>setPhoto(e.target.files?.[0] || null)} /></div>
        <div><label className="label">Email *</label><input className="input" value={email} onChange={e=>setEmail(e.target.value)} required /></div>
        <div><label className="label">Password *</label><input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} required /></div>
        {err && <div className="text-sm text-red-400">{err}</div>}
        <button className="btn w-full" disabled={loading}>{loading ? "Creating…" : "Create account"}</button>
      </form>
      <p className="mt-3 text-sm text-slate-500">Have an account? <Link href="/login" className="text-brand">Login</Link></p>
    </main>
  );
}
