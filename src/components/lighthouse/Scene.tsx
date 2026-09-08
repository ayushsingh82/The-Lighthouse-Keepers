"use client";

import { beamLit, type GameState, type Ship } from "@/lib/lighthouse/engine";

/** A fixed starfield. Values are rounded to a fixed precision so the string the
 *  server serialises is byte-identical to the one the client computes — an
 *  unrounded float can differ between the two and trip a hydration warning. */
const STARS = Array.from({ length: 26 }, (_, i) => {
  const r = (n: number) =>
    (((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1) + 1) % 1;
  const round = (v: number, p: number) => Number(v.toFixed(p));
  return {
    top: round(r(1) * 55, 2),
    left: round(r(2) * 100, 2),
    size: 1 + Math.round(r(3) * 1.5),
    delay: round(r(4) * 4, 2),
  };
});

/** The view out of the lantern room: sea, rocks, incoming ships, fog, and the
 *  sweeping beam. Ships are tap targets — tapping one marks it for the light. */
export function Scene({
  state,
  onMarkShip,
}: {
  state: GameState;
  onMarkShip: (id: number) => void;
}) {
  const lit = beamLit(state);
  const canMark = state.phase === "night" && lit;

  return (
    <div className="relative flex-1 overflow-hidden rounded-2xl border border-white/5 bg-[var(--bg-2)]">
      {/* sky + sea */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a1020] via-[#0b1524] to-[#0e2233]" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-b from-transparent to-[#04101a]" />

      {/* stars — fade out as the fog thickens */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ opacity: 0.7 * (1 - state.fog) }}
      >
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

      {/* the moon */}
      <div
        className="pointer-events-none absolute right-6 top-6 h-10 w-10 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 38% 38%, #f4f1e4, #cdd4dd 60%, #9aa6b4)",
          boxShadow: "0 0 26px rgba(220,230,245,0.35)",
          opacity: 0.5 + 0.5 * (1 - state.fog),
        }}
      />

      {/* the beam, anchored to the lantern at the bottom-centre */}
      <div className="pointer-events-none absolute bottom-[18%] left-1/2 h-[120%] w-0">
        <div
          className={`beam-cone absolute bottom-0 left-1/2 h-full w-[46vw] max-w-[320px] -translate-x-1/2 ${
            lit ? "" : "opacity-0"
          } ${
            state.beamOutFor > 0 && lit ? "beam-weak" : ""
          }`}
          style={{
            background:
              "linear-gradient(to top, rgba(255,217,138,0.42), rgba(255,217,138,0.05) 70%, transparent)",
            clipPath: "polygon(50% 100%, 0 0, 100% 0)",
            filter: "blur(2px)",
          }}
        />
      </div>

      {/* ships */}
      {state.ships.map((s) => (
        <ShipDot key={s.id} ship={s} canMark={canMark} onMark={onMarkShip} />
      ))}

      {/* the rocks */}
      <div className="absolute inset-x-0 bottom-[14%] flex justify-center">
        <div className="h-6 w-3/4 rounded-t-[40%] bg-[#04101a] shadow-[0_-6px_20px_rgba(0,0,0,0.6)]" />
      </div>

      {/* the tower the beam springs from */}
      <div className="pointer-events-none absolute bottom-[12%] left-1/2 -translate-x-1/2">
        <div
          className="mx-auto h-24 w-8 rounded-t-md"
          style={{
            background: "linear-gradient(to bottom, #1a2636, #0a121d)",
            clipPath: "polygon(28% 0, 72% 0, 100% 100%, 0 100%)",
          }}
        />
        <div
          className="mx-auto -mt-[104px] h-4 w-6 rounded-sm border border-white/10"
          style={{
            background: lit
              ? "radial-gradient(circle, var(--beam-hot), rgba(255,217,138,0.3) 70%)"
              : "#221a10",
          }}
        />
      </div>

      {/* lantern glow at the base */}
      <div
        className="absolute bottom-[15%] left-1/2 h-16 w-16 -translate-x-1/2 rounded-full"
        style={{
          background: lit
            ? "radial-gradient(circle, var(--beam-hot), rgba(255,217,138,0.25) 55%, transparent 70%)"
            : "radial-gradient(circle, #3a2f1e, transparent 70%)",
        }}
      />

      {/* fog */}
      {state.fog > 0.02 && (
        <div
          className="fog-layer pointer-events-none absolute inset-0"
          style={{ opacity: 0.15 + state.fog * 0.6 }}
        />
      )}

      {/* beam-out warning vignette */}
      {state.phase === "night" && !lit && (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(255,107,87,0.28))]" />
      )}

      {/* horizon label */}
      <div className="absolute left-3 top-3 font-mono text-[11px] uppercase tracking-widest text-[var(--ink-dim)]">
        {canMark
          ? "tap a ship to guide it in"
          : lit
            ? ""
            : "beam dark — ships can't see the rocks"}
      </div>
    </div>
  );
}

function ShipDot({
  ship,
  canMark,
  onMark,
}: {
  ship: Ship;
  canMark: boolean;
  onMark: (id: number) => void;
}) {
  // progress 0 (far, near horizon ~22% down) -> 1 (rocks ~84% down)
  const top = 22 + ship.progress * 62;
  const left = 50 + ship.lane * 34;
  const danger = ship.progress > 0.6 && !ship.marked;

  return (
    <button
      type="button"
      aria-label={ship.marked ? "ship marked" : "mark ship"}
      disabled={!canMark || ship.marked || !!ship.resolved}
      onPointerDown={() => canMark && onMark(ship.id)}
      className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full p-3 disabled:cursor-default"
      style={{ top: `${top}%`, left: `${left}%` }}
    >
      <span
        className={`block h-3 w-3 rounded-full ${
          ship.marked
            ? "bg-[var(--ok)] shadow-[0_0_10px_var(--ok)]"
            : danger
              ? "bg-[var(--danger)] shadow-[0_0_10px_var(--danger)]"
              : "bg-[var(--ink)]/70"
        }`}
      />
      {ship.marked && (
        <span className="absolute inset-0 animate-ping rounded-full bg-[var(--ok)]/40" />
      )}
    </button>
  );
}
