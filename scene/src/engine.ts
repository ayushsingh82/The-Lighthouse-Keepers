// The Lighthouse Keepers - core game engine (pure functions, no SDK imports).
//
// Ported verbatim from the web prototype (src/lib/lighthouse/engine.ts) with two
// changes for the multiplayer scene:
//   1. `crewSize` scales the decay rates - a fuller watch has an easier night,
//      but a solo keeper can still win a hard one (buildathon rule 3).
//   2. ship lanes/ids are passed in from the caller so the authoritative client
//      owns all randomness (keeps clients in agreement).
//
// Systems in systems.ts call `tick()` every frame on the elected authority.

export type Phase = 'briefing' | 'night' | 'dawn' | 'wreck'
export type System = 'gear' | 'flame' | 'lens'

export interface Ship {
  id: number
  progress: number // 0 = horizon, 1 = onto the rocks
  lane: number // -1 (far left) .. 1 (far right)
  marked: boolean
  resolved: 0 | 1 | 2 // 0 sailing, 1 home, 2 wrecked
}

export interface GameState {
  phase: Phase
  elapsed: number // ms of night elapsed
  gear: number // 0..100
  flame: number // 0..100
  lens: number // 0..100 (100 = crystal clear)
  beamOutFor: number // ms the beam has been continuously dead
  fog: number // 0..1
  ships: Ship[]
  guidedHome: number
  wrecked: number
  nextShipId: number
  msToNextShip: number
}

export interface FogWave {
  at: number
  dur: number
  intensity: number
}

export const CONFIG = {
  NIGHT_MS: 210_000, // ~3.5 minutes to dawn

  GEAR_DECAY: 7.0, // points per second (solo)
  FLAME_DECAY: 5.2,
  LENS_DECAY_BASE: 1.1,
  LENS_DECAY_FOG: 10, // extra points/sec at full fog

  WIND_GAIN: 26, // points per tap on the crank
  STOKE_GAIN: 30,
  WIPE_GAIN: 38,

  BEAM_MIN: 15,
  GRACE_MS: 12_000,
  MAX_WRECKS: 5,

  FOG_WAVES: [
    { at: 24_000, dur: 28_000, intensity: 0.7 },
    { at: 78_000, dur: 34_000, intensity: 0.9 },
    { at: 138_000, dur: 40_000, intensity: 1.0 },
    { at: 186_000, dur: 20_000, intensity: 0.85 }
  ] as FogWave[],

  SHIP_INTERVAL_MS: 17_000,
  SHIP_INTERVAL_JITTER_MS: 6_000,
  SHIP_CROSS_MS: 40_000,
  SHIP_HOME_AT: 0.5
} as const

/** Decay multiplier for a given crew size. 1 keeper = full pressure; each extra
 *  pair of hands eases it, floor at ~55% so a full watch still has to work. */
export function crewFactor(crewSize: number): number {
  const n = Math.max(1, crewSize)
  return Math.max(0.55, 1 - (n - 1) * 0.15)
}

export function createGame(): GameState {
  return {
    phase: 'briefing',
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
    msToNextShip: 9_000
  }
}

export function startNight(): GameState {
  return { ...createGame(), phase: 'night' }
}

export function fogAt(ms: number): number {
  let f = 0
  for (const wave of CONFIG.FOG_WAVES) {
    if (ms >= wave.at && ms <= wave.at + wave.dur) {
      const t = (ms - wave.at) / wave.dur
      const env = Math.sin(Math.PI * t)
      f = Math.max(f, env * wave.intensity)
    }
  }
  return f
}

export function beamLit(s: GameState): boolean {
  return s.gear > CONFIG.BEAM_MIN && s.flame > CONFIG.BEAM_MIN && s.lens > CONFIG.BEAM_MIN
}

/** 0..1 overall health of the light, for the HUD ring */
export function beamStrength(s: GameState): number {
  const g = clamp01((s.gear - CONFIG.BEAM_MIN) / (100 - CONFIG.BEAM_MIN))
  const f = clamp01((s.flame - CONFIG.BEAM_MIN) / (100 - CONFIG.BEAM_MIN))
  const l = clamp01((s.lens - CONFIG.BEAM_MIN) / (100 - CONFIG.BEAM_MIN))
  return Math.min(g, f, l)
}

export function weakestSystem(s: GameState): System {
  const entries: Array<[System, number]> = [
    ['gear', s.gear],
    ['flame', s.flame],
    ['lens', s.lens]
  ]
  entries.sort((a, b) => a[1] - b[1])
  return entries[0][0]
}

// ---- actions (applied by whoever taps the station) ----------------------

export function wind(s: GameState): GameState {
  if (s.phase !== 'night') return s
  return { ...s, gear: clamp(s.gear + CONFIG.WIND_GAIN) }
}
export function stoke(s: GameState): GameState {
  if (s.phase !== 'night') return s
  return { ...s, flame: clamp(s.flame + CONFIG.STOKE_GAIN) }
}
export function wipe(s: GameState): GameState {
  if (s.phase !== 'night') return s
  return { ...s, lens: clamp(s.lens + CONFIG.WIPE_GAIN) }
}
export function markShip(s: GameState, id: number): GameState {
  if (s.phase !== 'night' || !beamLit(s)) return s
  return {
    ...s,
    ships: s.ships.map((sh) => (sh.id === id && !sh.resolved ? { ...sh, marked: true } : sh))
  }
}

// ---- per-frame tick (authority only) ----------------------------------

export type TickEvent =
  | { type: 'ship-home'; id: number }
  | { type: 'ship-wrecked'; id: number }
  | { type: 'beam-died' }
  | { type: 'beam-relit' }
  | { type: 'dawn'; guidedHome: number }
  | { type: 'night-lost'; guidedHome: number }

export interface TickResult {
  state: GameState
  events: TickEvent[]
}

export function tick(state: GameState, dtMsRaw: number, crewSize: number, rand: () => number): TickResult {
  if (state.phase !== 'night') return { state, events: [] }

  const dtMs = Math.min(dtMsRaw, 250)
  const dt = dtMs / 1000
  const cf = crewFactor(crewSize)
  const events: TickEvent[] = []

  const wasLit = beamLit(state)
  const elapsed = state.elapsed + dtMs
  const fog = fogAt(elapsed)

  let gear = clamp(state.gear - CONFIG.GEAR_DECAY * cf * dt)
  let flame = clamp(state.flame - CONFIG.FLAME_DECAY * cf * dt)
  let lens = clamp(state.lens - (CONFIG.LENS_DECAY_BASE + CONFIG.LENS_DECAY_FOG * fog) * cf * dt)

  let next: GameState = { ...state, elapsed, fog, gear, flame, lens }
  const litNow = beamLit(next)

  const beamOutFor = litNow ? 0 : state.beamOutFor + dtMs
  next.beamOutFor = beamOutFor
  if (wasLit && !litNow) events.push({ type: 'beam-died' })
  if (!wasLit && litNow) events.push({ type: 'beam-relit' })

  let ships = next.ships
  let guidedHome = next.guidedHome
  let wrecked = next.wrecked
  let nextShipId = next.nextShipId
  let msToNextShip = next.msToNextShip - dtMs
  ships = ships.map((s) => (s.resolved ? s : advanceShip(s, dt, litNow)))

  const stillSailing: Ship[] = []
  for (const s of ships) {
    if (s.resolved === 1) {
      guidedHome += 1
      events.push({ type: 'ship-home', id: s.id })
      continue
    }
    if (s.resolved === 2) {
      wrecked += 1
      const w = weakestSystem(next)
      if (w === 'gear') gear = clamp(gear - 8)
      else if (w === 'flame') flame = clamp(flame - 8)
      else lens = clamp(lens - 8)
      events.push({ type: 'ship-wrecked', id: s.id })
      continue
    }
    stillSailing.push(s)
  }

  if (msToNextShip <= 0) {
    stillSailing.push({
      id: nextShipId,
      progress: 0,
      lane: rand() * 1.6 - 0.8,
      marked: false,
      resolved: 0
    })
    nextShipId += 1
    msToNextShip = CONFIG.SHIP_INTERVAL_MS + rand() * CONFIG.SHIP_INTERVAL_JITTER_MS
  }

  next = { ...next, gear, flame, lens, ships: stillSailing, guidedHome, wrecked, nextShipId, msToNextShip }

  if (elapsed >= CONFIG.NIGHT_MS) {
    next.phase = 'dawn'
    events.push({ type: 'dawn', guidedHome: next.guidedHome })
  } else if (beamOutFor >= CONFIG.GRACE_MS || wrecked >= CONFIG.MAX_WRECKS) {
    next.phase = 'wreck'
    events.push({ type: 'night-lost', guidedHome: next.guidedHome })
  }

  return { state: next, events }
}

function advanceShip(s: Ship, dt: number, litNow: boolean): Ship {
  const speed = 1 / (CONFIG.SHIP_CROSS_MS / 1000)
  const progress = s.progress + speed * dt

  if (s.marked && litNow && progress >= CONFIG.SHIP_HOME_AT) {
    return { ...s, progress: 1, resolved: 1 }
  }
  if (progress >= 1) {
    const safe = s.marked && litNow
    return { ...s, progress: 1, resolved: safe ? 1 : 2 }
  }
  const lane = s.lane * (1 - progress * 0.35)
  return { ...s, progress, lane }
}

// ---- helpers --------------------------------------------------------

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n))
}
function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

export function nightClock(elapsed: number): string {
  const frac = Math.min(elapsed / CONFIG.NIGHT_MS, 1)
  const totalMin = frac * 8 * 60
  let hour = 21 + Math.floor(totalMin / 60)
  const min = Math.floor(totalMin % 60)
  if (hour >= 24) hour -= 24
  return `${pad(hour)}:${pad(min)}`
}
function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}
