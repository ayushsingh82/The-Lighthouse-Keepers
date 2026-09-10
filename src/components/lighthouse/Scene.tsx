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
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--sky-top)] via-[var(--sky-mid)] to-[var(--sky-horizon)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-b from-transparent to-[var(--sea-deep)]" />
      {/* sea shimmer just above the rocks */}
      <div className="sea-shimmer pointer-events-none absolute inset-x-0 bottom-[10%] h-[26%] opacity-60" />

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

      {/* the lit water — a soft wash that rakes with the beam */}
      {lit && (
        <div className="pointer-events-none absolute bottom-[16%] left-1/2 h-[110%] w-0">
          <div
            className={`beam-cone absolute bottom-0 left-1/2 h-full w-[60vw] max-w-[380px] -translate-x-1/2 ${
              state.beamOutFor > 0 ? "beam-weak" : ""
            }`}
            style={{
              background:
                "linear-gradient(to top, rgba(255,231,180,0.16), rgba(255,231,180,0.02) 60%, transparent)",
              clipPath: "polygon(50% 100%, 0 0, 100% 0)",
              filter: "blur(6px)",
            }}
          />
        </div>
      )}

      {/* the beam, anchored to the lantern at the bottom-centre */}
      <div className="pointer-events-none absolute bottom-[18%] left-1/2 h-[120%] w-0">
        <div
          className={`beam-cone absolute bottom-0 left-1/2 h-full w-[46vw] max-w-[320px] -translate-x-1/2 ${
            lit ? "" : "opacity-0"
          } ${state.beamOutFor > 0 && lit ? "beam-weak" : ""}`}
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
        <ShipMark key={s.id} ship={s} canMark={canMark} onMark={onMarkShip} />
      ))}

      {/* the rocks */}
      <div className="absolute inset-x-0 bottom-[14%] flex justify-center">
        <div className="h-6 w-3/4 rounded-t-[40%] bg-[var(--sea-deep)] shadow-[0_-6px_20px_rgba(0,0,0,0.6)]" />
      </div>

      {/* the tower the beam springs from */}
      <div className="pointer-events-none absolute bottom-[12%] left-1/2 -translate-x-1/2">
        {/* tapered shaft */}
        <div
          className="mx-auto h-24 w-9"
          style={{
            background:
              "linear-gradient(90deg, #0a121d, #223046 45%, #2b3c54 55%, #0a121d)",
            clipPath: "polygon(30% 0, 70% 0, 100% 100%, 0 100%)",
          }}
        />
        {/* gallery railing */}
        <div className="mx-auto -mt-[100px] h-1.5 w-11 rounded-sm bg-[#2b3c54]" />
        {/* lantern room */}
        <div
          className="mx-auto mt-0.5 h-5 w-7 rounded-sm border border-white/10"
          style={{
            background: lit
              ? "radial-gradient(circle, var(--beam-hot), rgba(255,217,138,0.3) 70%)"
              : "#221a10",
            boxShadow: lit ? "0 0 18px rgba(255,217,138,0.6)" : "none",
          }}
        />
        {/* cap */}
        <div className="mx-auto -mt-0.5 h-1.5 w-3 rounded-t-full bg-[#2b3c54]" />
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

      {/* fog — a drifting haze plus a bank that rolls through on the waves */}
      {state.fog > 0.02 && (
        <>
          <div
            className="fog-layer pointer-events-none absolute inset-0"
            style={{ opacity: 0.15 + state.fog * 0.55 }}
          />
          <div
            className="fog-bank pointer-events-none absolute inset-x-[-20%] bottom-[8%] h-2/3"
            style={{ opacity: state.fog * 0.7 }}
          />
        </>
      )}

      {/* beam-out warning vignette */}
      {state.phase === "night" && !lit && (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(255,107,87,0.28))]" />
      )}

      {/* horizon label */}
      <div className="absolute left-3 top-3 max-w-[60%] font-mono text-[11px] uppercase leading-tight tracking-widest text-[var(--ink-dim)]">
        {canMark
          ? "tap a ship to guide it in"
          : lit
            ? ""
            : "beam dark — ships can't see the rocks"}
      </div>
    </div>
  );
}

function ShipMark({
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
      {/* wake trailing behind a ship turning for home */}
      {ship.marked && (
        <span className="absolute left-1/2 top-full h-6 w-0.5 -translate-x-1/2 bg-gradient-to-b from-[var(--ok)]/60 to-transparent" />
      )}
      {/* little hull + mast */}
      <span className="relative block">
        <span
          className={`block h-1.5 w-4 rounded-b-full ${
            ship.marked
              ? "bg-[var(--ok)] shadow-[0_0_10px_var(--ok)]"
              : danger
                ? "bg-[var(--danger)] shadow-[0_0_10px_var(--danger)]"
                : "bg-[var(--ink)]/70"
          }`}
        />
        <span
          className={`absolute -top-2 left-1/2 h-2 w-px -translate-x-1/2 ${
            ship.marked
              ? "bg-[var(--ok)]"
              : danger
                ? "bg-[var(--danger)]"
                : "bg-[var(--ink)]/60"
          }`}
        />
      </span>
      {ship.marked && (
        <span className="absolute inset-0 animate-ping rounded-full bg-[var(--ok)]/30" />
      )}
      {danger && (
        <span className="absolute inset-0 animate-ping rounded-full bg-[var(--danger)]/30" />
      )}
    </button>
  );
}
