"use client";

import {
  beamStrength,
  CONFIG,
  nightClock,
  weakestSystem,
  type GameState,
} from "@/lib/lighthouse/engine";

const SYS_LABEL: Record<string, string> = {
  gear: "Gear",
  flame: "Flame",
  lens: "Lens",
};

export function HUD({ state }: { state: GameState }) {
  const strength = beamStrength(state);
  const frac = Math.min(state.elapsed / CONFIG.NIGHT_MS, 1);
  const weak = weakestSystem(state);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <BeamRing strength={strength} />

        <div className="flex-1">
          <div className="mb-1 flex items-center justify-between font-mono text-[11px] uppercase tracking-widest text-[var(--ink-dim)]">
            <span>{nightClock(state.elapsed)}</span>
            <span>dawn 05:00</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="meter h-full rounded-full bg-gradient-to-r from-[#2b4a6b] to-[var(--beam)]"
              style={{ width: `${frac * 100}%` }}
            />
          </div>
        </div>

        <div className="text-right">
          <div className="font-mono text-lg leading-none text-[var(--ok)]">
            {state.guidedHome}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--ink-dim)]">
            home
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-lg leading-none text-[var(--danger)]">
            {state.wrecked}
            <span className="text-[var(--ink-dim)]">/{CONFIG.MAX_WRECKS}</span>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--ink-dim)]">
            lost
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Gauge label={SYS_LABEL.gear} value={state.gear} warn={weak === "gear"} />
        <Gauge
          label={SYS_LABEL.flame}
          value={state.flame}
          warn={weak === "flame"}
        />
        <Gauge label={SYS_LABEL.lens} value={state.lens} warn={weak === "lens"} />
      </div>
    </div>
  );
}

function Gauge({
  label,
  value,
  warn,
}: {
  label: string;
  value: number;
  warn: boolean;
}) {
  const low = value <= CONFIG.BEAM_MIN;
  return (
    <div
      className={`rounded-xl border px-2.5 py-1.5 ${
        low
          ? "border-[var(--danger)]/60 bg-[var(--danger)]/10"
          : warn
            ? "border-[var(--beam)]/40 bg-white/5"
            : "border-white/5 bg-white/5"
      }`}
    >
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--ink-dim)]">
          {label}
        </span>
        <span
          className={`font-mono text-xs ${low ? "text-[var(--danger)]" : "text-[var(--ink)]"}`}
        >
          {Math.round(value)}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/40">
        <div
          className={`meter h-full rounded-full ${
            low ? "bg-[var(--danger)]" : "bg-[var(--beam)]"
          }`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function BeamRing({ strength }: { strength: number }) {
  const deg = Math.round(strength * 360);
  const dead = strength <= 0;
  return (
    <div
      className="relative h-12 w-12 shrink-0 rounded-full"
      style={{
        background: `conic-gradient(${
          dead ? "var(--danger)" : "var(--beam)"
        } ${deg}deg, rgba(255,255,255,0.08) 0deg)`,
      }}
    >
      <div className="absolute inset-[3px] flex items-center justify-center rounded-full bg-[var(--bg)]">
        <span
          className={`h-3 w-3 rounded-full ${
            dead
              ? "bg-[var(--danger)]"
              : "bg-[var(--beam-hot)] shadow-[0_0_8px_var(--beam)]"
          }`}
        />
      </div>
    </div>
  );
}
