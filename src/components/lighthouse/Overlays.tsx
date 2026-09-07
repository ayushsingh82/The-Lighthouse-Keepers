"use client";

import { useState } from "react";
import type { GameState } from "@/lib/lighthouse/engine";
import type { LogEntry, Tally } from "@/lib/lighthouse/logbook";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center overflow-y-auto bg-[var(--bg)]/92 p-5 backdrop-blur-sm">
      <div className="w-full max-w-sm rise py-4">{children}</div>
    </div>
  );
}

export function Briefing({ onBegin }: { onBegin: () => void }) {
  return (
    <Shell>
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--ink-dim)]">
        The Lighthouse Keepers
      </p>
      <h1 className="mt-2 text-2xl font-semibold leading-snug">
        The keeper is gone. The light is dead. The fog is coming in.
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-[var(--ink-dim)]">
        You washed ashore with strangers. The only way off this rock is to keep
        the beam alive until dawn — and no one can hold it alone.
      </p>
      <ul className="mt-4 space-y-1.5 text-sm text-[var(--ink)]">
        <li>
          <b>Wind</b> the rotation gear — hold it, or the beam stops turning.
        </li>
        <li>
          <b>Stoke</b> the flame before it gutters out.
        </li>
        <li>
          <b>Wipe</b> the lens when fog fouls the glass.
        </li>
        <li>
          When the beam shines, <b>tap ships</b> to guide them past the rocks.
        </li>
      </ul>
      <p className="mt-3 text-xs text-[var(--ink-dim)]">
        Best with 2–4 keepers on one screen. Solo, you&apos;ll be running.
      </p>
      <button
        type="button"
        onClick={onBegin}
        className="mt-5 w-full rounded-xl bg-[var(--beam)] py-3 font-semibold text-[#20160a] active:scale-[0.98]"
      >
        Light it
      </button>
    </Shell>
  );
}

export function Dawn({
  state,
  bottle,
  tally,
  onSave,
  onAgain,
}: {
  state: GameState;
  bottle: { name: string; line: string };
  tally: Tally;
  onSave: (name: string, line: string) => void;
  onAgain: () => void;
}) {
  const [name, setName] = useState("");
  const [line, setLine] = useState("");
  const [saved, setSaved] = useState(false);

  return (
    <Shell>
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--ok)]">
        Dawn — the light held
      </p>
      <h1 className="mt-2 text-2xl font-semibold">
        {state.guidedHome} guided home
        {state.wrecked > 0 ? `, ${state.wrecked} lost` : ""}.
      </h1>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--ink-dim)]">
          a message in a bottle
        </p>
        <p className="mt-1 text-sm italic text-[var(--ink)]">
          &ldquo;{bottle.line}&rdquo;
        </p>
        <p className="mt-1 text-xs text-[var(--ink-dim)]">— {bottle.name}</p>
      </div>

      {!saved ? (
        <div className="mt-4 space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--ink-dim)]">
            sign the logbook
          </p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="keeper name"
            maxLength={24}
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[var(--beam)]"
          />
          <input
            value={line}
            onChange={(e) => setLine(e.target.value)}
            placeholder="one line for the next keeper"
            maxLength={120}
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[var(--beam)]"
          />
          <button
            type="button"
            onClick={() => {
              onSave(name.trim() || "a keeper", line.trim());
              setSaved(true);
            }}
            className="w-full rounded-xl bg-[var(--beam)] py-2.5 font-semibold text-[#20160a] active:scale-[0.98]"
          >
            Seal the bottle
          </button>
        </div>
      ) : (
        <p className="mt-4 text-sm text-[var(--ok)]">
          Logged. {tally.nightsKept} nights kept · {tally.totalGuidedHome} souls
          guided home in all.
        </p>
      )}

      <button
        type="button"
        onClick={onAgain}
        className="mt-3 w-full rounded-xl border border-white/15 py-2.5 text-sm active:scale-[0.98]"
      >
        Keep another night
      </button>
    </Shell>
  );
}

export function Wreck({
  state,
  onAgain,
}: {
  state: GameState;
  onAgain: () => void;
}) {
  const reason =
    state.wrecked >= 5
      ? "Too many broke on the rocks."
      : "The beam stayed dark too long.";
  return (
    <Shell>
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--danger)]">
        The night is lost
      </p>
      <h1 className="mt-2 text-2xl font-semibold">{reason}</h1>
      <p className="mt-3 text-sm text-[var(--ink-dim)]">
        {state.guidedHome > 0
          ? `${state.guidedHome} made it in before the light failed.`
          : "Not one ship made it past the rocks."}{" "}
        The fog takes the tower. Try again — you know the sound of it now.
      </p>
      <button
        type="button"
        onClick={onAgain}
        className="mt-5 w-full rounded-xl bg-[var(--beam)] py-3 font-semibold text-[#20160a] active:scale-[0.98]"
      >
        Relight
      </button>
    </Shell>
  );
}

export function Logbook({ entries }: { entries: LogEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <details className="rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-sm">
      <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-widest text-[var(--ink-dim)]">
        the logbook · {entries.length}
      </summary>
      <ul className="mt-2 space-y-2">
        {entries.slice(0, 12).map((e, i) => (
          <li key={i} className="border-t border-white/5 pt-2 first:border-0 first:pt-0">
            <p className="text-[var(--ink)]">
              {e.line ? `“${e.line}”` : <span className="text-[var(--ink-dim)]">— no note —</span>}
            </p>
            <p className="text-xs text-[var(--ink-dim)]">
              {e.name} · {e.guidedHome} home{e.reachedDawn ? "" : " · night lost"}
            </p>
          </li>
        ))}
      </ul>
    </details>
  );
}
