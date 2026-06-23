import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
      <span className="mb-4 rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand">
        SaaS for Restaurants
      </span>
      <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
        More Google reviews. <br /> More repeat visits.
      </h1>
      <p className="mt-5 max-w-xl text-lg text-gray-600">
        Diners scan a QR, leave a review, spin to win a voucher, and save it to
        their phone — bringing them back through your door.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/dashboard" className="btn-primary">
          Merchant dashboard
        </Link>
        <Link href="/admin" className="btn-outline">
          Super admin
        </Link>
      </div>

      <div className="mt-16 grid w-full gap-4 sm:grid-cols-3">
        {[
          { t: "Scan", d: "Customer scans your printed QR — no app install." },
          { t: "Review & play", d: "Invite a Google review, then spin to win." },
          { t: "Return", d: "Voucher saved to their home screen brings them back." },
        ].map((s) => (
          <div key={s.t} className="card text-left">
            <div className="text-sm font-bold text-brand">{s.t}</div>
            <p className="mt-1 text-sm text-gray-600">{s.d}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
