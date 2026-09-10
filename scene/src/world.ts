// Builds the lighthouse and its island in code, and keeps the ship entities in
// sync with the game state each frame. Everything here is either static scenery
// or a runtime-spawned ship, so a code-first build is fine (no Creator Hub in
// the loop). To author it visually instead, move the static entities into
// assets/scene/main.composite and fetch them by name - see docs/SDK7-PORT.md.

import {
  engine,
  Transform,
  MeshRenderer,
  MeshCollider,
  Material,
  PointerEvents,
  PointerEventType,
  InputAction,
  pointerEventsSystem,
  VisibilityComponent,
  type Entity
} from '@dcl/sdk/ecs'
import { Color3, Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import { applyAction } from './actions'
import { beamLit, type GameState } from './engine'

function c3(c: Color4): Color3 {
  return Color3.create(c.r, c.g, c.b)
}

export let beamAnchor: Entity = engine.RootEntity
let lanternRoom: Entity = engine.RootEntity
let flameGlow: Entity = engine.RootEntity
let beamCone: Entity = engine.RootEntity

// ---- small builders -------------------------------------------------

function box(
  pos: Vector3,
  scale: Vector3,
  color: Color4,
  opts: { emissive?: Color3; emissiveIntensity?: number; alpha?: number; collider?: boolean; parent?: Entity } = {}
): Entity {
  const e = engine.addEntity()
  Transform.create(e, { position: pos, scale, parent: opts.parent })
  MeshRenderer.setBox(e)
  if (opts.collider) MeshCollider.setBox(e)
  Material.setPbrMaterial(e, {
    albedoColor: color,
    emissiveColor: opts.emissive,
    emissiveIntensity: opts.emissiveIntensity ?? (opts.emissive ? 1.5 : 0),
    metallic: 0.1,
    roughness: 0.9
  })
  return e
}

function cyl(
  pos: Vector3,
  scale: Vector3,
  color: Color4,
  opts: { radiusTop?: number; radiusBottom?: number; collider?: boolean; parent?: Entity; rot?: Quaternion } = {}
): Entity {
  const e = engine.addEntity()
  Transform.create(e, { position: pos, scale, parent: opts.parent, rotation: opts.rot })
  MeshRenderer.setCylinder(e, opts.radiusTop ?? 1, opts.radiusBottom ?? 1)
  if (opts.collider) MeshCollider.setCylinder(e, opts.radiusTop ?? 1, opts.radiusBottom ?? 1)
  Material.setPbrMaterial(e, { albedoColor: color, metallic: 0.1, roughness: 0.9 })
  return e
}

// ---- the island + tower -------------------------------------------

export function buildWorld(): void {
  // floor - dark wet stone
  box(Vector3.create(8, -0.05, 8), Vector3.create(16, 0.2, 16), Color4.create(0.06, 0.09, 0.13, 1), {
    collider: true
  })

  // tower shaft
  cyl(Vector3.create(8, 3, 8), Vector3.create(2.4, 6, 2.4), Color4.create(0.13, 0.17, 0.24, 1), {
    radiusTop: 0.8,
    radiusBottom: 1,
    collider: true
  })
  // gallery ring
  cyl(Vector3.create(8, 6.05, 8), Vector3.create(2.2, 0.2, 2.2), Color4.create(0.17, 0.22, 0.31, 1))

  // lantern room - lights up when the beam is lit
  lanternRoom = box(Vector3.create(8, 6.9, 8), Vector3.create(1.7, 1.4, 1.7), Color4.create(0.14, 0.11, 0.06, 1), {
    emissive: Color3.create(1, 0.85, 0.5),
    emissiveIntensity: 0
  })
  // roof
  cyl(Vector3.create(8, 7.9, 8), Vector3.create(1.3, 0.9, 1.3), Color4.create(0.17, 0.22, 0.31, 1), {
    radiusTop: 0,
    radiusBottom: 1
  })

  // the sweeping beam: an anchor at the lantern that a system rotates about Y,
  // with a translucent emissive cone fanning out from it
  beamAnchor = engine.addEntity()
  Transform.create(beamAnchor, { position: Vector3.create(8, 7, 8) })

  beamCone = engine.addEntity()
  Transform.create(beamCone, {
    position: Vector3.create(0, 0, 5),
    rotation: Quaternion.fromEulerDegrees(90, 0, 0),
    scale: Vector3.create(1, 9, 1),
    parent: beamAnchor
  })
  MeshRenderer.setCylinder(beamCone, 0.06, 1.7)
  Material.setPbrMaterial(beamCone, {
    albedoColor: Color4.create(1, 0.86, 0.55, 0.12),
    emissiveColor: Color3.create(1, 0.86, 0.55),
    emissiveIntensity: 2.2,
    castShadows: false
  })

  // balcony railing on the sea side (a gap in the middle to watch through)
  for (const x of [3.5, 4.7, 5.9, 10.1, 11.3, 12.5]) {
    box(Vector3.create(x, 0.6, 12.8), Vector3.create(0.15, 1.2, 0.15), Color4.create(0.17, 0.22, 0.31, 1))
  }
  box(Vector3.create(8, 1.15, 12.8), Vector3.create(9.2, 0.12, 0.12), Color4.create(0.17, 0.22, 0.31, 1))

  // rocks between the balcony and the open sea
  for (const [x, z, s] of [
    [5.5, 9.6, 1.1],
    [8.2, 9.2, 1.4],
    [10.8, 9.7, 1.0]
  ] as Array<[number, number, number]>) {
    box(Vector3.create(x, 0.2, z), Vector3.create(s, 0.6, s), Color4.create(0.04, 0.06, 0.09, 1), { collider: true })
  }

  buildStations()
}

// ---- the three stations ------------------------------------------

function station(pos: Vector3, capColor: Color4, hoverText: string, kind: 'wind' | 'stoke' | 'wipe'): Entity {
  cyl(Vector3.create(pos.x, 0.5, pos.z), Vector3.create(0.6, 1, 0.6), Color4.create(0.1, 0.13, 0.18, 1), {
    collider: true
  })
  const cap = box(Vector3.create(pos.x, 1.15, pos.z), Vector3.create(0.7, 0.35, 0.7), capColor, {
    emissive: c3(capColor),
    emissiveIntensity: 0.4,
    collider: true
  })
  PointerEvents.create(cap, {
    pointerEvents: [
      {
        eventType: PointerEventType.PET_DOWN,
        eventInfo: { button: InputAction.IA_POINTER, hoverText, maxDistance: 3.5 }
      }
    ]
  })
  pointerEventsSystem.onPointerDown(
    { entity: cap, opts: { button: InputAction.IA_POINTER, hoverText, maxDistance: 3.5 } },
    () => applyAction(kind)
  )
  return cap
}

function buildStations(): void {
  station(Vector3.create(4.5, 0, 7), Color4.create(0.42, 0.66, 0.9, 1), 'Wind the gear', 'wind')
  station(Vector3.create(11.5, 0, 7), Color4.create(0.85, 0.42, 0.2, 1), 'Stoke the flame', 'stoke')
  station(Vector3.create(8, 0, 11), Color4.create(0.36, 0.8, 0.66, 1), 'Wipe the lens', 'wipe')

  // a small emissive flame that grows with the brazier's fuel
  flameGlow = engine.addEntity()
  Transform.create(flameGlow, { position: Vector3.create(11.5, 1.5, 7), scale: Vector3.create(0.3, 0.3, 0.3) })
  MeshRenderer.setSphere(flameGlow)
  Material.setPbrMaterial(flameGlow, {
    albedoColor: Color4.create(1, 0.6, 0.2, 1),
    emissiveColor: Color3.create(1, 0.55, 0.15),
    emissiveIntensity: 3
  })
}

// ---- per-frame visual sync --------------------------------------

const shipEntities = new Map<number, Entity>()

function makeShip(): Entity {
  const hull = engine.addEntity()
  Transform.create(hull, { scale: Vector3.create(0.7, 0.4, 1.1) })
  MeshRenderer.setBox(hull)
  Material.setPbrMaterial(hull, { albedoColor: Color4.create(0.7, 0.72, 0.78, 1), roughness: 0.8 })
  const mast = engine.addEntity()
  Transform.create(mast, { position: Vector3.create(0, 1.4, 0), scale: Vector3.create(0.12, 2, 0.12), parent: hull })
  MeshRenderer.setBox(mast)
  Material.setPbrMaterial(mast, { albedoColor: Color4.create(0.5, 0.52, 0.58, 1) })
  return hull
}

function shipColor(marked: boolean, danger: boolean): Color4 {
  if (marked) return Color4.create(0.44, 0.88, 0.65, 1)
  if (danger) return Color4.create(1, 0.42, 0.34, 1)
  return Color4.create(0.7, 0.72, 0.78, 1)
}

/** Called every frame from a system. Positions ships, updates the lantern glow,
 *  the flame, and the beam's visibility from the current state. */
export function renderWorld(s: GameState): void {
  const lit = beamLit(s)

  // lantern + beam
  Material.setPbrMaterial(lanternRoom, {
    albedoColor: Color4.create(0.14, 0.11, 0.06, 1),
    emissiveColor: Color3.create(1, 0.85, 0.5),
    emissiveIntensity: lit ? 2.2 : 0
  })
  VisibilityComponent.createOrReplace(beamCone, { visible: lit && s.phase === 'night' })

  // flame size
  const f = Math.max(0.12, s.flame / 100)
  Transform.getMutable(flameGlow).scale = Vector3.create(0.18 + f * 0.5, 0.18 + f * 0.7, 0.18 + f * 0.5)
  Material.setPbrMaterial(flameGlow, {
    albedoColor: Color4.create(1, 0.6, 0.2, 1),
    emissiveColor: Color3.create(1, 0.55, 0.15),
    emissiveIntensity: s.flame > 15 ? 3 : 0.6
  })

  // ships
  const live = new Set<number>()
  for (const sh of s.ships) {
    if (sh.resolved) continue
    live.add(sh.id)
    let e = shipEntities.get(sh.id)
    if (!e) {
      e = makeShip()
      shipEntities.set(sh.id, e)
      const id = sh.id
      pointerEventsSystem.onPointerDown(
        { entity: e, opts: { button: InputAction.IA_POINTER, hoverText: 'Mark for the light', maxDistance: 14 } },
        () => applyAction('mark', id)
      )
    }
    const danger = sh.progress > 0.6 && !sh.marked
    const x = 8 + sh.lane * 4.5
    const z = sh.marked ? 15.5 - sh.progress * 3 : 15.5 - sh.progress * 5.5
    Transform.getMutable(e).position = Vector3.create(x, 0.5, z)
    Transform.getMutable(e).rotation = Quaternion.fromEulerDegrees(0, sh.marked ? 180 : 0, 0)
    Material.setPbrMaterial(e, { albedoColor: shipColor(sh.marked, danger), roughness: 0.8 })
  }
  for (const [id, e] of shipEntities) {
    if (!live.has(id)) {
      pointerEventsSystem.removeOnPointerDown(e)
      engine.removeEntity(e)
      shipEntities.delete(id)
    }
  }
}

