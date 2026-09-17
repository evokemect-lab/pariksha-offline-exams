import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pariksha — Offline Exam Conduction",
  description: "Register for offline exams, pay fees, download hall tickets, check results"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="mx-auto w-full max-w-5xl px-4 pb-12">
          <header className="no-print sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/10 bg-[#05080c]/95 backdrop-blur">
            <Link href="/" className="grid h-9 w-9 place-items-center rounded-full bg-brand text-lg font-black text-black">P</Link>
            <div className="flex-1">
              <div className="text-lg font-extrabold">Pariksha</div>
              <div className="text-xs text-slate-400">Offline Exams • Hall Tickets • Results</div>
            </div>
            <nav className="flex gap-2 text-sm">
              <Link href="/exams" className="rounded-lg px-3 py-1.5 hover:bg-white/10">Exams</Link>
              <Link href="/dashboard" className="rounded-lg px-3 py-1.5 hover:bg-white/10">Dashboard</Link>
              <Link href="/verify" className="rounded-lg px-3 py-1.5 hover:bg-white/10">Verify</Link>
              <Link href="/admin" className="rounded-lg bg-brand px-3 py-1.5 font-bold text-black">Admin</Link>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
