import Link from "next/link";

export default function Home() {
  return (
    <main className="mt-8 space-y-6">
      <div className="card">
        <h1 className="text-3xl font-black">Offline exams, made simple.</h1>
        <p className="mt-2 text-slate-600">
          Browse upcoming offline exams, register at your nearest center,
          download a printable hall ticket with QR, and check results — all in one place.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/exams" className="btn">Browse exams</Link>
          <Link href="/register" className="btn-ghost">Create student account</Link>
          <Link href="/login" className="btn-ghost">Login</Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card">
          <div className="text-2xl">📝</div>
          <h3 className="mt-2 font-bold">1. Register</h3>
          <p className="text-sm text-slate-500">Pick exam + center. Free registration for now.</p>
        </div>
        <div className="card">
          <div className="text-2xl">🎫</div>
          <h3 className="mt-2 font-bold">2. Hall ticket</h3>
          <p className="text-sm text-slate-500">Get hall ticket no. + room/seat + QR. Print and bring with ID.</p>
        </div>
        <div className="card">
          <div className="text-2xl">🏫</div>
          <h3 className="mt-2 font-bold">3. Attend offline</h3>
          <p className="text-sm text-slate-500">Invigilator scans QR at gate. Attendance + results tracked here.</p>
        </div>
      </div>

      <div className="card">
        <h2 className="font-bold">For staff / invigilators</h2>
        <p className="text-sm text-slate-500">Use Verify page to scan QR or enter hall ticket no. and mark attendance.</p>
        <Link href="/verify" className="btn-ghost mt-3 inline-block">Open Verify</Link>
      </div>
    </main>
  );
}
