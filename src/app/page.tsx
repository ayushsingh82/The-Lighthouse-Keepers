import Link from "next/link";

export default function Home() {
  return (
    <div className="safe mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-between px-5 py-10">
      <header className="font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
        Decentraland · Friendzone Buildathon
      </header>

      <main className="flex flex-col gap-5">
        <div className="relative mx-auto h-40 w-40">
          <div
            className="beam-cone absolute bottom-1/2 left-1/2 h-48 w-40 -translate-x-1/2"
            style={{
              background:
                "linear-gradient(to top, rgba(255,217,138,0.28), transparent 75%)",
              clipPath: "polygon(50% 100%, 12% 0, 88% 0)",
              filter: "blur(3px)",
            }}
          />
          <div
            className="breathe absolute inset-0 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 50% 45%, var(--beam-hot), rgba(255,217,138,0.25) 45%, transparent 70%)",
            }}
          />
        </div>
        <h1 className="text-3xl font-semibold leading-tight">
          The Lighthouse Keepers
        </h1>
        <p className="text-[var(--ink-dim)] leading-relaxed">
          A co-op night watch for mobile. The keeper is gone and the light is
          dead. Wind the gear, stoke the flame, wipe the lens — no one can hold
          all three alone. Keep the beam alive until dawn and guide the ships
          home.
        </p>

        <Link
          href="/play"
          className="rounded-xl bg-[var(--beam)] py-3.5 text-center font-semibold text-[#20160a] active:scale-[0.98]"
        >
          Enter the lighthouse
        </Link>
        <p className="text-center text-xs text-[var(--ink-dim)]">
          Prototype build · the Decentraland scene is the real submission
        </p>
      </main>

      <footer className="text-xs text-[var(--ink-dim)]">
        Best played with 2–4 keepers. Turn your phone sideways to nobody — this
        one&apos;s portrait.
      </footer>
    </div>
  );
}
