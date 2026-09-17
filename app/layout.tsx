import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pariksha — Offline Exam Conduction",
  description: "Register for offline exams, download hall tickets, check results"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="mx-auto w-full max-w-5xl px-4 pb-12">
          <header className="no-print sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
            <Link href="/" className="grid h-9 w-9 place-items-center rounded-full bg-brand text-lg font-black text-black">P</Link>
            <div className="flex-1">
              <div className="text-lg font-extrabold text-slate-900">Pariksha</div>
              <div className="text-xs text-slate-500">Offline Exams • Hall Tickets • Results</div>
            </div>
            <nav className="flex gap-2 text-sm text-slate-700">
              <Link href="/exams" className="rounded-lg px-3 py-1.5 hover:bg-slate-100">Exams</Link>
              <Link href="/dashboard" className="rounded-lg px-3 py-1.5 hover:bg-slate-100">Dashboard</Link>
              <Link href="/verify" className="rounded-lg px-3 py-1.5 hover:bg-slate-100">Verify</Link>
              <Link href="/admin" className="rounded-lg bg-brand px-3 py-1.5 font-bold text-black">Admin</Link>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
