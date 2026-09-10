// Per-frame systems.
//
//  authoritySystem  - only the elected keeper runs the decay tick and writes state
//  beamSpinSystem   - rotates the beam (all clients, cosmetic)
//  renderSystem     - pushes state into the 3D world + the HUD (all clients)
//  effectsSystem    - fires sound cues on state transitions (all clients)

import { Transform } from '@dcl/sdk/ecs'
import { Quaternion, Vector3 } from '@dcl/sdk/math'
import { tick, beamLit, type GameState, type Phase } from './engine'
import {
  getState,
  setState,
  getSeed,
  rngStep,
  crewSize,
  isAuthority,
  recordNight
} from './state'
import { beamAnchor, renderWorld } from './world'
import { pushHudState } from './ui'
import { fx } from './feedback'

let recordedFor: Phase | '' = ''

export function authoritySystem(dt: number): void {
  const s = getState()
  if (s.phase !== 'night') {
    if (isAuthority() && (s.phase === 'dawn' || s.phase === 'wreck') && recordedFor !== s.phase) {
      recordNight(s.phase === 'dawn', s.guidedHome)
      recordedFor = s.phase
    }
    if (s.phase === 'briefing') recordedFor = ''
    return
  }
  if (!isAuthority()) return

  let seed = getSeed()
  const rand = () => {
    const r = rngStep(seed)
    seed = r.seed
    return r.value
  }
  const res = tick(s, dt * 1000, crewSize(), rand)
  setState(res.state, { seed })
}

export function beamSpinSystem(dt: number): void {
  const s = getState()
  const t = Transform.getMutableOrNull(beamAnchor)
  if (!t) return
  const spin = s.phase === 'night' && beamLit(s) ? 42 : 10 // deg/sec
  t.rotation = Quaternion.multiply(t.rotation, Quaternion.fromAngleAxis(dt * spin, Vector3.Up()))
}

let renderAcc = 0
export function renderSystem(dt: number): void {
  renderAcc += dt
  if (renderAcc < 1 / 20) return // 20 Hz is plenty for this scene
  renderAcc = 0
  const s = getState()
  renderWorld(s)
  pushHudState(s)
}

// ---- transition cues (every client) ----------------------------

let prev: GameState | null = null
export function effectsSystem(): void {
  const s = getState()
  if (prev) {
    if (s.guidedHome > prev.guidedHome) fx('ship-home')
    if (s.wrecked > prev.wrecked) fx('ship-wrecked')
    const wasLit = beamLit(prev)
    const nowLit = beamLit(s)
    if (prev.phase === 'night' && wasLit && !nowLit) fx('beam-died')
    if (prev.phase === 'night' && !wasLit && nowLit) fx('beam-relit')
    if (prev.phase === 'night' && s.phase === 'dawn') fx('dawn')
    if (prev.phase === 'night' && s.phase === 'wreck') fx('night-lost')
  }
  prev = s
}
