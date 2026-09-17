"use client";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setLoading(true);
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { error } = await sb.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    router.push("/dashboard");
  }

  return (
    <main className="mx-auto mt-10 max-w-md card">
      <h1 className="text-2xl font-black">Student login</h1>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <div><label className="label">Email</label><input className="input" value={email} onChange={e=>setEmail(e.target.value)} required /></div>
        <div><label className="label">Password</label><input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} required /></div>
        {err && <div className="text-sm text-red-400">{err}</div>}
        <button className="btn w-full" disabled={loading}>{loading ? "Logging in…" : "Login"}</button>
      </form>
      <p className="mt-3 text-sm text-slate-400">No account? <Link href="/register" className="text-brand">Register</Link></p>
    </main>
  );
}
