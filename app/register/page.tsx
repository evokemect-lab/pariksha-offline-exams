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
      // If email confirmation is ON, there is no session yet — ask user to verify, then login.
      const { data: { session } } = await sb.auth.getSession();
      if (!session) {
        setErr("Account created! Check your email to confirm, then login.");
        return;
      }
      const uid = data.user?.id || session.user.id;
      const { error: perr } = await sb.from("profiles").upsert({ id: uid, full_name: fullName, phone, role: "student" });
      if (perr) setErr("Account created but profile save failed: " + perr.message + " — you can still login.");
      else router.push("/dashboard");
    } catch (err: any) {
      setErr(err?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto mt-10 max-w-md card">
      <h1 className="text-2xl font-black">Create student account</h1>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <div><label className="label">Full name</label><input className="input" value={fullName} onChange={e=>setFullName(e.target.value)} required /></div>
        <div><label className="label">Phone</label><input className="input" value={phone} onChange={e=>setPhone(e.target.value)} required /></div>
        <div><label className="label">Email</label><input className="input" value={email} onChange={e=>setEmail(e.target.value)} required /></div>
        <div><label className="label">Password</label><input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} required /></div>
        {err && <div className="text-sm text-red-400">{err}</div>}
        <button className="btn w-full" disabled={loading}>{loading ? "Creating…" : "Register"}</button>
      </form>
      <p className="mt-3 text-sm text-slate-500">Have an account? <Link href="/login" className="text-brand">Login</Link></p>
    </main>
  );
}
