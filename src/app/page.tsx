import Link from "next/link";

/* A few fixed stars — deterministic so server and client render the same string. */
const STARS = Array.from({ length: 22 }, (_, i) => {
  const r = (n: number) =>
    (((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1) + 1) % 1;
  const round = (v: number) => Number(v.toFixed(2));
  return {
    top: round(r(1) * 46),
    left: round(r(2) * 100),
    size: 1 + Math.round(r(3) * 1.5),
    delay: round(r(4) * 4),
  };
});

function HeroScene() {
  return (
    <div className="relative h-64 w-full overflow-hidden rounded-3xl border border-white/5 bg-[var(--bg-2)]">
      {/* sky + sea */}
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--sky-top)] via-[var(--sky-mid)] to-[var(--sky-horizon)]" />
      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-b from-transparent to-[var(--sea-deep)]" />

      {/* stars */}
      <div className="pointer-events-none absolute inset-0">
        {STARS.map((s, i) => (
          <span
            key={i}
            className="twinkle absolute rounded-full bg-white"
            style={{
              top: `${s.top}%`,
              left: `${s.left}%`,
              height: s.size,
              width: s.size,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}
      </div>

      {/* moon */}
      <div
        className="pointer-events-none absolute right-8 top-7 h-9 w-9 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 38% 38%, #f4f1e4, #cdd4dd 60%, #9aa6b4)",
          boxShadow: "0 0 24px rgba(220,230,245,0.3)",
        }}
      />

      {/* sweeping beam from the tower */}
      <div className="pointer-events-none absolute bottom-[22%] left-1/2 h-[130%] w-0">
        <div
          className="beam-hero absolute bottom-0 left-1/2 h-full w-[70vw] max-w-[360px] -translate-x-1/2"
          style={{
            background:
              "linear-gradient(to top, rgba(255,217,138,0.34), rgba(255,217,138,0.04) 68%, transparent)",
            clipPath: "polygon(50% 100%, 8% 0, 92% 0)",
            filter: "blur(3px)",
          }}
        />
      </div>

      {/* distant ship lights on the horizon */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[34%] flex justify-around px-10">
        <span className="h-1 w-1 rounded-full bg-[var(--danger)]/70 shadow-[0_0_6px_var(--danger)]" />
        <span className="h-1 w-1 rounded-full bg-white/50 shadow-[0_0_6px_#fff]" />
        <span className="h-1 w-1 rounded-full bg-[var(--danger)]/60 shadow-[0_0_6px_var(--danger)]" />
      </div>

      {/* rocks */}
      <div className="absolute inset-x-0 bottom-[20%] flex justify-center">
        <div className="h-5 w-3/4 rounded-t-[45%] bg-[var(--sea-deep)] shadow-[0_-6px_18px_rgba(0,0,0,0.6)]" />
      </div>

      {/* the tower */}
      <div className="pointer-events-none absolute bottom-[17%] left-1/2 -translate-x-1/2">
        <div
          className="mx-auto h-28 w-9 rounded-t-md"
          style={{
            background: "linear-gradient(to bottom, #223046, #0a121d)",
            clipPath: "polygon(26% 0, 74% 0, 100% 100%, 0 100%)",
          }}
        />
        <div
          className="mx-auto -mt-[120px] h-5 w-7 rounded-sm border border-white/10"
          style={{
            background:
              "radial-gradient(circle, var(--beam-hot), rgba(255,217,138,0.3) 70%)",
          }}
        />
      </div>

      {/* lantern glow */}
      <div
        className="breathe absolute bottom-[26%] left-1/2 h-16 w-16 -translate-x-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, var(--beam-hot), rgba(255,217,138,0.22) 55%, transparent 70%)",
        }}
      />

      {/* fog bank rolling across */}
      <div className="fog-bank pointer-events-none absolute inset-0 opacity-40" />
    </div>
  );
}

function PlayStep({ tag, label }: { tag: string; label: string }) {
  return (
    <div className="flex-1 rounded-xl border border-white/5 bg-white/5 px-3 py-2.5">
      <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--beam)]">
        {tag}
      </div>
      <div className="mt-0.5 text-xs text-[var(--ink-dim)]">{label}</div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="safe mx-auto flex min-h-[100dvh] w-full max-w-md flex-col gap-6 px-5 py-8">
      <header className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--ink-dim)]">
        <span>The Lighthouse Keepers</span>
        <span className="text-[var(--beam)]">Co-op</span>
      </header>

      <HeroScene />

      <main className="flex flex-col gap-4">
        <h1 className="text-[2rem] font-semibold leading-[1.1]">
          Keep the light alive
          <br />
          until dawn.
        </h1>
        <p className="leading-relaxed text-[var(--ink-dim)]">
          A night watch built for phones. The keeper is gone and the beam is
          dead. Wind the gear, stoke the flame, wipe the lens — three stations,
          two hands. You need each other, and the ships need the light.
        </p>

        <div className="flex gap-2">
          <PlayStep tag="Wind" label="Hold the rotation gear" />
          <PlayStep tag="Stoke" label="Feed the flame" />
          <PlayStep tag="Wipe" label="Clear the fogged lens" />
        </div>

        <Link
          href="/play"
          className="mt-1 rounded-2xl bg-[var(--beam)] py-4 text-center text-lg font-semibold text-[#20160a] shadow-[0_0_30px_rgba(255,217,138,0.25)] active:scale-[0.98]"
        >
          Enter the lighthouse
        </Link>
        <p className="text-center text-xs text-[var(--ink-dim)]">
          Best with 2–4 keepers · portrait · tap &amp; hold, no dexterity
        </p>
      </main>

      <footer className="mt-auto border-t border-white/5 pt-4 text-[11px] leading-relaxed text-[var(--ink-dim)]">
        Playable prototype for the Decentraland Friendzone Mobile Buildathon. The
        submitted build is an SDK7 Decentraland World — this page previews the
        core loop and feel.
      </footer>
    </div>
  );
}
