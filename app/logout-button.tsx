"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const [loggedIn, setLoggedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    sb.auth.getSession().then(({ data: { session } }) => setLoggedIn(!!session));
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => setLoggedIn(!!session));
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  if (!loggedIn) return null;

  return (
    <button
      onClick={async () => {
        const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
        await sb.auth.signOut();
        router.push("/");
        router.refresh();
      }}
      className="rounded-lg px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
    >
      Logout
    </button>
  );
}
