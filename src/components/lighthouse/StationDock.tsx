"use client";

import { useEffect, useRef, useState } from "react";
import { CONFIG, type GameState } from "@/lib/lighthouse/engine";

/** The thumb-zone controls. Three stations, one screen — which is the whole
 *  point: one pair of hands can't hold all three, so you split the work. */
export function StationDock({
  state,
  setWind,
  onStoke,
  onWipe,
}: {
  state: GameState;
  setWind: (held: boolean) => void;
  onStoke: () => void;
  onWipe: () => void;
}) {
  const disabled = state.phase !== "night";

  return (
    <div className="grid grid-cols-3 gap-2">
      <HoldButton
        label="Wind"
        hint="hold"
        disabled={disabled}
        onHoldChange={setWind}
        tone="gear"
        value={state.gear}
        low={state.gear <= CONFIG.BEAM_MIN}
      />
      <TapButton
        label="Stoke"
        hint="tap"
        disabled={disabled}
        onTap={onStoke}
        tone="flame"
        value={state.flame}
        low={state.flame <= CONFIG.BEAM_MIN}
      />
      <TapButton
        label="Wipe"
        hint="tap"
        disabled={disabled}
        onTap={onWipe}
        tone="lens"
        value={state.lens}
        low={state.lens <= CONFIG.BEAM_MIN}
      />
    </div>
  );
}

const TONE: Record<string, string> = {
  gear: "from-[#3b5b7a] to-[#22405c]",
  flame: "from-[#8a3b1e] to-[#5c2412]",
  lens: "from-[#2f6d5a] to-[#1c453a]",
};

const FILL: Record<string, { body: string; cap: string }> = {
  gear: { body: "rgba(120,178,224,0.34)", cap: "rgba(160,205,240,0.9)" },
  flame: { body: "rgba(255,150,90,0.36)", cap: "rgba(255,190,130,0.95)" },
  lens: { body: "rgba(120,224,190,0.32)", cap: "rgba(150,240,210,0.9)" },
};

function baseCls(low: boolean, disabled: boolean, tone: string) {
  return [
    "relative h-24 overflow-hidden rounded-2xl bg-gradient-to-b text-left px-4 py-3",
    "border transition-transform active:scale-[0.97]",
    TONE[tone],
    low
      ? "border-[var(--danger)] shadow-[0_0_16px_rgba(255,107,87,0.35)] pulse-low"
      : "border-white/10",
    disabled ? "opacity-40" : "",
  ].join(" ");
}

/** A bottom-up fuel level, so keepers can read each system from the thumb zone
 *  without looking up at the HUD. */
function Fill({ tone, value }: { tone: string; value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  const c = FILL[tone];
  return (
    <span
      aria-hidden
      className="meter pointer-events-none absolute inset-x-0 bottom-0 z-0 border-t"
      style={{
        height: `${pct}%`,
        background: `linear-gradient(to top, ${c.body}, transparent)`,
        borderTopColor: pct > 1 ? c.cap : "transparent",
      }}
    />
  );
}

function Face({ label, hint }: { label: string; hint: string }) {
  return (
    <span className="relative z-10 block">
      <span className="block text-lg font-semibold text-[var(--ink)]">
        {label}
      </span>
      <span className="font-mono text-[11px] uppercase tracking-widest text-white/60">
        {hint}
      </span>
    </span>
  );
}

function TapButton({
  label,
  hint,
  disabled,
  onTap,
  tone,
  value,
  low,
}: {
  label: string;
  hint: string;
  disabled: boolean;
  onTap: () => void;
  tone: string;
  value: number;
  low: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={(e) => {
        e.preventDefault();
        onTap();
      }}
      className={baseCls(low, disabled, tone)}
    >
      <Fill tone={tone} value={value} />
      <Face label={label} hint={hint} />
    </button>
  );
}

function HoldButton({
  label,
  hint,
  disabled,
  onHoldChange,
  tone,
  value,
  low,
}: {
  label: string;
  hint: string;
  disabled: boolean;
  onHoldChange: (held: boolean) => void;
  tone: string;
  value: number;
  low: boolean;
}) {
  const held = useRef(false);
  const [isHeld, setIsHeld] = useState(false);

  const set = (v: boolean) => {
    if (held.current === v) return;
    held.current = v;
    setIsHeld(v);
    onHoldChange(v);
  };

  // safety: release the crank if the component unmounts or the game ends
  useEffect(() => {
    if (disabled) set(false);
    return () => set(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={(e) => {
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        set(true);
      }}
      onPointerUp={() => set(false)}
      onPointerCancel={() => set(false)}
      onPointerLeave={() => set(false)}
      className={`${baseCls(low, disabled, tone)} ${
        isHeld ? "ring-2 ring-[var(--beam)]" : ""
      }`}
    >
      <Fill tone={tone} value={value} />
      <Face label={label} hint={hint} />
    </button>
  );
}
