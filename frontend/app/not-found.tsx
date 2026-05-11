import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-120px] top-[-120px] h-72 w-72 rounded-full bg-cyan-400/10 blur-[120px]" />
        <div className="absolute bottom-[-140px] right-[-140px] h-80 w-80 rounded-full bg-emerald-400/10 blur-[140px]" />
      </div>

      <section className="glass-panel relative z-10 w-full max-w-xl rounded-[36px] p-10 text-center shadow-2xl">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-[hsl(var(--muted))]">Error 404</p>
        <h1 className="mt-4 text-5xl font-black tracking-tight text-white">This page could not be found</h1>
        <p className="mt-4 text-sm text-[hsl(var(--muted))]">
          The route you opened does not exist or may have moved.
        </p>

        <div className="mt-8 flex justify-center">
          <Link
            href="/"
            className="rounded-2xl bg-[hsl(var(--accent))] px-7 py-3 text-sm font-black uppercase tracking-[0.16em] text-black transition hover:scale-105 hover:brightness-110 active:scale-95"
          >
            Go To Homepage
          </Link>
        </div>
      </section>
    </main>
  );
}
