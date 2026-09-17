import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import LogoutButton from "./logout-button";

export const metadata: Metadata = {
  title: "Pariksha — Offline Exam Conduction",
  description: "Register for offline exams, download hall tickets, check results"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {/* Govt top strip */}
        <div className="no-print bg-brand text-white">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-1 text-[11px] font-semibold tracking-wide">
            <span>OFFICE OF THE EXAMINATION CONTROLLER — PARIKSHA</span>
            <span className="hidden sm:inline">Offline Examination Portal</span>
          </div>
        </div>

        <div className="mx-auto w-full max-w-5xl px-4 pb-12">
          <header className="no-print flex items-center gap-3 border-b-4 border-accent bg-white px-2 py-3">
            <Link href="/" className="grid h-11 w-11 shrink-0 place-items-center rounded bg-brand text-xl font-black text-white">P</Link>
            <div className="flex-1">
              <div className="text-xl font-extrabold text-brand">Pariksha</div>
              <div className="text-xs text-slate-600">Offline Exams • Hall Tickets • Results</div>
            </div>
            {/* Student access only — staff pages (/admin, /verify) are direct-URL, unlinked */}
            <div className="flex gap-2 text-sm">
              <Link href="/login" className="btn-ghost">Login</Link>
              <Link href="/register" className="btn">New Registration</Link>
              <LogoutButton />
            </div>
          </header>
          {children}
          <footer className="no-print mt-10 rounded bg-brand px-4 py-3 text-center text-xs text-white">
            Site owned by : Pariksha Examination Cell • For help, contact your exam center office
          </footer>
        </div>
      </body>
    </html>
  );
}
