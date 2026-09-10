// Synced game state + helpers.
//
// The whole night lives in ONE synced component on ONE well-known entity. Any
// client may mutate it (serverless CRDT, last-write-wins) - so a keeper's tap on
// a station writes straight to it. One elected client additionally runs the
// decay tick each frame (see systems.ts). The logbook + all-time tally are a
// second synced component; they persist while at least one keeper is in the
// scene. For persistence across an empty scene, swap `readLog`/`appendLogEntry`
// for a Multiplayer Server call - the shapes are kept identical. See
// docs/SDK7-PORT.md.

import { engine, Schemas, PlayerIdentityData } from '@dcl/sdk/ecs'
import { syncEntity } from '@dcl/sdk/network'
import { getPlayer } from '@dcl/sdk/players'
import { createGame, type GameState, type Ship, type Phase } from './engine'

export enum SyncId {
  STATE = 7001,
  LOG = 7002
}

const ShipSchema = {
  id: Schemas.Int,
  progress: Schemas.Float,
  lane: Schemas.Float,
  marked: Schemas.Boolean,
  resolved: Schemas.Int
}

export const LighthouseState = engine.defineComponent('lighthouse::state', {
  phase: Schemas.String, // 'briefing' | 'night' | 'dawn' | 'wreck'
  elapsed: Schemas.Float,
  gear: Schemas.Float,
  flame: Schemas.Float,
  lens: Schemas.Float,
  beamOutFor: Schemas.Float,
  fog: Schemas.Float,
  ships: Schemas.Array(Schemas.Map(ShipSchema)),
  guidedHome: Schemas.Int,
  wrecked: Schemas.Int,
  nextShipId: Schemas.Int,
  msToNextShip: Schemas.Float,
  seed: Schemas.Float, // advanced by the authority so all clients agree on RNG
  startedBy: Schemas.String
})

const LogEntrySchema = {
  name: Schemas.String,
  line: Schemas.String,
  guidedHome: Schemas.Int,
  reachedDawn: Schemas.Boolean,
  at: Schemas.Int64
}

export const LighthouseLog = engine.defineComponent('lighthouse::log', {
  entries: Schemas.Array(Schemas.Map(LogEntrySchema)),
  totalGuidedHome: Schemas.Int,
  nightsKept: Schemas.Int,
  nightsLost: Schemas.Int
})

export interface LogEntry {
  name: string
  line: string
  guidedHome: number
  reachedDawn: boolean
  at: number
}

let stateEntity = engine.RootEntity
let logEntity = engine.RootEntity

/** Call once from main(). Creates the two synced singletons. */
export function initState(): void {
  stateEntity = engine.addEntity()
  const g = createGame()
  LighthouseState.create(stateEntity, {
    ...g,
    ships: [],
    seed: 12345,
    startedBy: ''
  })
  syncEntity(stateEntity, [LighthouseState.componentId], SyncId.STATE)

  logEntity = engine.addEntity()
  LighthouseLog.create(logEntity, {
    entries: [],
    totalGuidedHome: 0,
    nightsKept: 0,
    nightsLost: 0
  })
  syncEntity(logEntity, [LighthouseLog.componentId], SyncId.LOG)
}

export function stateEnt() {
  return stateEntity
}

// ---- read / write the game state ------------------------------------

export function getState(): GameState {
  const c = LighthouseState.getOrNull(stateEntity)
  if (!c) return createGame()
  return {
    phase: c.phase as Phase,
    elapsed: c.elapsed,
    gear: c.gear,
    flame: c.flame,
    lens: c.lens,
    beamOutFor: c.beamOutFor,
    fog: c.fog,
    ships: c.ships.map(
      (s): Ship => ({
        id: s.id,
        progress: s.progress,
        lane: s.lane,
        marked: s.marked,
        resolved: s.resolved as 0 | 1 | 2
      })
    ),
    guidedHome: c.guidedHome,
    wrecked: c.wrecked,
    nextShipId: c.nextShipId,
    msToNextShip: c.msToNextShip
  }
}

export function setState(s: GameState, opts?: { seed?: number; startedBy?: string }): void {
  const m = LighthouseState.getMutableOrNull(stateEntity)
  if (!m) return
  m.phase = s.phase
  m.elapsed = s.elapsed
  m.gear = s.gear
  m.flame = s.flame
  m.lens = s.lens
  m.beamOutFor = s.beamOutFor
  m.fog = s.fog
  m.ships = s.ships.map((sh) => ({
    id: sh.id,
    progress: sh.progress,
    lane: sh.lane,
    marked: sh.marked,
    resolved: sh.resolved
  }))
  m.guidedHome = s.guidedHome
  m.wrecked = s.wrecked
  m.nextShipId = s.nextShipId
  m.msToNextShip = s.msToNextShip
  if (opts?.seed !== undefined) m.seed = opts.seed
  if (opts?.startedBy !== undefined) m.startedBy = opts.startedBy
}

export function getSeed(): number {
  return LighthouseState.getOrNull(stateEntity)?.seed ?? 12345
}
export function setSeed(seed: number): void {
  const m = LighthouseState.getMutableOrNull(stateEntity)
  if (m) m.seed = seed
}

/** One step of a deterministic LCG. The authority advances the seed in the
 *  synced component so every client (and late joiners) share the RNG sequence. */
export function rngStep(seed: number): { seed: number; value: number } {
  const next = (seed * 1664525 + 1013904223) % 4294967296
  return { seed: next, value: next / 4294967296 }
}

// ---- crew + authority ---------------------------------------------

export function crewSize(): number {
  let n = 0
  for (const _ of engine.getEntitiesWith(PlayerIdentityData)) n++
  return Math.max(1, n)
}

let myAddress = ''
export function setMyAddress(addr: string): void {
  myAddress = addr.toLowerCase()
}
export function getMyAddress(): string {
  if (!myAddress) {
    const p = getPlayer()
    if (p?.userId) myAddress = p.userId.toLowerCase()
  }
  return myAddress
}

/** The keeper whose address sorts lowest runs the tick. Deterministic on every
 *  client, no messages, survives joins/leaves. Solo player is always authority.
 *  If our own address hasn't resolved yet (guest, slow profile), fall back to
 *  "run it if we appear to be alone" so a solo night never freezes. */
export function isAuthority(): boolean {
  const me = getMyAddress()
  if (!me) return crewSize() <= 1
  let lowest = me
  for (const [e] of engine.getEntitiesWith(PlayerIdentityData)) {
    const a = PlayerIdentityData.get(e).address.toLowerCase()
    if (a && a < lowest) lowest = a
  }
  return lowest === me
}

// ---- logbook ----------------------------------------------------

export function readLog(): {
  entries: LogEntry[]
  totalGuidedHome: number
  nightsKept: number
  nightsLost: number
} {
  const c = LighthouseLog.getOrNull(logEntity)
  if (!c) return { entries: [], totalGuidedHome: 0, nightsKept: 0, nightsLost: 0 }
  return {
    entries: c.entries.map((e) => ({
      name: e.name,
      line: e.line,
      guidedHome: e.guidedHome,
      reachedDawn: e.reachedDawn,
      at: Number(e.at)
    })),
    totalGuidedHome: c.totalGuidedHome,
    nightsKept: c.nightsKept,
    nightsLost: c.nightsLost
  }
}

export function appendLogEntry(entry: LogEntry): void {
  const m = LighthouseLog.getMutableOrNull(logEntity)
  if (!m) return
  m.entries = [
    { ...entry, at: entry.at },
    ...m.entries.map((e) => ({
      name: e.name,
      line: e.line,
      guidedHome: e.guidedHome,
      reachedDawn: e.reachedDawn,
      at: e.at
    }))
  ].slice(0, 40)
}

export function recordNight(reachedDawn: boolean, guidedHome: number): void {
  const m = LighthouseLog.getMutableOrNull(logEntity)
  if (!m) return
  m.totalGuidedHome += guidedHome
  if (reachedDawn) m.nightsKept += 1
  else m.nightsLost += 1
}

const SEED_BOTTLES: Array<{ name: string; line: string }> = [
  { name: 'M. Aldous', line: 'The gear forgets you the moment you let go. Never let go.' },
  {
    name: 'Perri',
    line: 'When the fog came I stopped watching the sea and watched the lens. We lost two that night.'
  },
  { name: 'the last keeper', line: 'If you are reading this, the light held. Keep it holding.' }
]

export function drawBottle(): { name: string; line: string } {
  const withLines = readLog().entries.filter((e) => e.line.trim().length > 0)
  const pool = withLines.length > 0 ? withLines : SEED_BOTTLES
  return pool[Math.floor(Math.random() * pool.length)]
}
