// The Lighthouse Keepers — core game engine (framework-agnostic, pure functions).
//
// Design: three systems keep the beam alive — the rotation GEAR, the FLAME, and
// the LENS. Each decays on its own; the flame and gear constantly, the lens
// faster when fog rolls in. The beam only shines when all three are above a
// minimum. While the beam shines, keepers on the balcony can MARK ships so the
// light guides them past the rocks. Reach dawn to win; let the beam stay dead
// too long and the night ends in a wreck.

export type Phase = "briefing" | "night" | "dawn" | "wreck";

export type System = "gear" | "flame" | "lens";

export interface Ship {
  id: number;
  /** 0 = on the horizon, 1 = onto the rocks */
  progress: number;
  /** horizontal lane, -1 (far left) .. 1 (far right) */
  lane: number;
  marked: boolean;
  resolved: null | "home" | "wrecked";
}

export interface GameState {
  phase: Phase;
  /** ms of night elapsed */
  elapsed: number;
  gear: number; // 0..100
  flame: number; // 0..100
  lens: number; // 0..100 (100 = crystal clear)
  /** ms the beam has been continuously dead */
  beamOutFor: number;
  /** current fog density 0..1 */
  fog: number;
  ships: Ship[];
  guidedHome: number;
  wrecked: number;
  nextShipId: number;
  msToNextShip: number;
}

export interface FogWave {
  at: number;
  dur: number;
  intensity: number;
}

export const CONFIG = {
  NIGHT_MS: 210_000, // ~3.5 minutes to dawn

  GEAR_DECAY: 7.0, // points per second
  FLAME_DECAY: 5.2,
  LENS_DECAY_BASE: 1.1,
  LENS_DECAY_FOG: 10, // extra points/sec at full fog

  WIND_GAIN: 30, // points per second while the crank is held
  STOKE_GAIN: 30, // points per tap
  WIPE_GAIN: 38, // points per tap

  BEAM_MIN: 15, // each system must sit above this for the beam to shine
  GRACE_MS: 12_000, // beam may be dead this long before the night is lost
  MAX_WRECKS: 5,

  FOG_WAVES: [
    { at: 24_000, dur: 28_000, intensity: 0.7 },
    { at: 78_000, dur: 34_000, intensity: 0.9 },
    { at: 138_000, dur: 40_000, intensity: 1.0 },
    { at: 186_000, dur: 20_000, intensity: 0.85 },
  ] as FogWave[],

  SHIP_INTERVAL_MS: 17_000,
  SHIP_INTERVAL_JITTER_MS: 6_000,
  SHIP_CROSS_MS: 40_000, // horizon -> rocks if the light never catches it
  SHIP_HOME_AT: 0.5, // a marked ship under a lit beam turns for home past this point
} as const;

export function createGame(): GameState {
  return {
    phase: "briefing",
    elapsed: 0,
    gear: 70,
    flame: 70,
    lens: 100,
    beamOutFor: 0,
    fog: 0,
    ships: [],
    guidedHome: 0,
    wrecked: 0,
    nextShipId: 1,
    msToNextShip: 9_000,
  };
}

export function startNight(): GameState {
  return { ...createGame(), phase: "night" };
}

export function fogAt(ms: number): number {
  let f = 0;
  for (const wave of CONFIG.FOG_WAVES) {
    if (ms >= wave.at && ms <= wave.at + wave.dur) {
      // ease in and out across the wave
      const t = (ms - wave.at) / wave.dur;
      const env = Math.sin(Math.PI * t);
      f = Math.max(f, env * wave.intensity);
    }
  }
  return f;
}

export function beamLit(state: GameState): boolean {
  return (
    state.gear > CONFIG.BEAM_MIN &&
    state.flame > CONFIG.BEAM_MIN &&
    state.lens > CONFIG.BEAM_MIN
  );
}

/** 0..1 overall health of the light, for the HUD ring */
export function beamStrength(state: GameState): number {
  const g = clamp01((state.gear - CONFIG.BEAM_MIN) / (100 - CONFIG.BEAM_MIN));
  const f = clamp01((state.flame - CONFIG.BEAM_MIN) / (100 - CONFIG.BEAM_MIN));
  const l = clamp01((state.lens - CONFIG.BEAM_MIN) / (100 - CONFIG.BEAM_MIN));
  return Math.min(g, f, l);
}

export function weakestSystem(state: GameState): System {
  const entries: [System, number][] = [
    ["gear", state.gear],
    ["flame", state.flame],
    ["lens", state.lens],
  ];
  entries.sort((a, b) => a[1] - b[1]);
  return entries[0][0];
}

// ---- actions -------------------------------------------------------------

export function wind(state: GameState, dtMs: number): GameState {
  if (state.phase !== "night") return state;
  return { ...state, gear: clamp(state.gear + (CONFIG.WIND_GAIN * dtMs) / 1000) };
}

export function stoke(state: GameState): GameState {
  if (state.phase !== "night") return state;
  return { ...state, flame: clamp(state.flame + CONFIG.STOKE_GAIN) };
}

export function wipe(state: GameState): GameState {
  if (state.phase !== "night") return state;
  return { ...state, lens: clamp(state.lens + CONFIG.WIPE_GAIN) };
}

export function markShip(state: GameState, id: number): GameState {
  if (state.phase !== "night" || !beamLit(state)) return state;
  return {
    ...state,
    ships: state.ships.map((s) =>
      s.id === id && !s.resolved ? { ...s, marked: true } : s,
    ),
  };
}

// ---- per-frame tick -----------------------------------------------------

export interface TickResult {
  state: GameState;
  /** events for the UI layer to react to (sound, shake, toast) */
  events: TickEvent[];
}

export type TickEvent =
  | { type: "ship-home"; id: number }
  | { type: "ship-wrecked"; id: number }
  | { type: "beam-died" }
  | { type: "beam-relit" }
  | { type: "dawn"; guidedHome: number }
  | { type: "night-lost"; guidedHome: number };

export function tick(state: GameState, dtMsRaw: number): TickResult {
  if (state.phase !== "night") return { state, events: [] };

  const dtMs = Math.min(dtMsRaw, 250); // guard against tab-away spikes
  const dt = dtMs / 1000;
  const events: TickEvent[] = [];

  const wasLit = beamLit(state);
  const elapsed = state.elapsed + dtMs;
  const fog = fogAt(elapsed);

  let gear = clamp(state.gear - CONFIG.GEAR_DECAY * dt);
  let flame = clamp(state.flame - CONFIG.FLAME_DECAY * dt);
  let lens = clamp(
    state.lens - (CONFIG.LENS_DECAY_BASE + CONFIG.LENS_DECAY_FOG * fog) * dt,
  );

  let next: GameState = { ...state, elapsed, fog, gear, flame, lens };
  const litNow = beamLit(next);

  // beam-out grace timer
  const beamOutFor = litNow ? 0 : state.beamOutFor + dtMs;
  next.beamOutFor = beamOutFor;
  if (wasLit && !litNow) events.push({ type: "beam-died" });
  if (!wasLit && litNow) events.push({ type: "beam-relit" });

  // ships
  let { ships, guidedHome, wrecked, nextShipId, msToNextShip } = next;
  msToNextShip -= dtMs;
  ships = ships.map((s) => (s.resolved ? s : advanceShip(s, dt, litNow)));

  const stillSailing: Ship[] = [];
  for (const s of ships) {
    if (s.resolved === "home") {
      guidedHome += 1;
      events.push({ type: "ship-home", id: s.id });
      continue;
    }
    if (s.resolved === "wrecked") {
      wrecked += 1;
      // a wreck rattles the tower — knock the weakest live system
      const w = weakestSystem(next);
      if (w === "gear") gear = clamp(gear - 8);
      else if (w === "flame") flame = clamp(flame - 8);
      else lens = clamp(lens - 8);
      events.push({ type: "ship-wrecked", id: s.id });
      continue;
    }
    stillSailing.push(s);
  }

  if (msToNextShip <= 0) {
    stillSailing.push({
      id: nextShipId,
      progress: 0,
      lane: Math.random() * 1.6 - 0.8,
      marked: false,
      resolved: null,
    });
    nextShipId += 1;
    msToNextShip =
      CONFIG.SHIP_INTERVAL_MS + Math.random() * CONFIG.SHIP_INTERVAL_JITTER_MS;
  }

  next = {
    ...next,
    gear,
    flame,
    lens,
    ships: stillSailing,
    guidedHome,
    wrecked,
    nextShipId,
    msToNextShip,
  };

  // phase transitions
  if (elapsed >= CONFIG.NIGHT_MS) {
    next.phase = "dawn";
    events.push({ type: "dawn", guidedHome: next.guidedHome });
  } else if (beamOutFor >= CONFIG.GRACE_MS || wrecked >= CONFIG.MAX_WRECKS) {
    next.phase = "wreck";
    events.push({ type: "night-lost", guidedHome: next.guidedHome });
  }

  return { state: next, events };
}

function advanceShip(s: Ship, dt: number, litNow: boolean): Ship {
  const speed = 1 / (CONFIG.SHIP_CROSS_MS / 1000);
  const progress = s.progress + speed * dt;

  // a marked ship under a lit beam turns for home rather than the rocks
  if (s.marked && litNow && progress >= CONFIG.SHIP_HOME_AT) {
    return { ...s, progress: 1, resolved: "home" };
  }
  if (progress >= 1) {
    const safe = s.marked && litNow;
    return { ...s, progress: 1, resolved: safe ? "home" : "wrecked" };
  }
  // drift toward centre-rocks as it nears shore
  const lane = s.lane * (1 - progress * 0.35);
  return { ...s, progress, lane };
}

// ---- helpers ----------------------------------------------------------

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}
function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function nightClock(elapsed: number): string {
  // map the night onto 21:00 -> 05:00 (8 in-world hours)
  const frac = Math.min(elapsed / CONFIG.NIGHT_MS, 1);
  const totalMin = frac * 8 * 60;
  let hour = 21 + Math.floor(totalMin / 60);
  const min = Math.floor(totalMin % 60);
  if (hour >= 24) hour -= 24;
  return `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}
