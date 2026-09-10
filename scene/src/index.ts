import { engine } from '@dcl/sdk/ecs'
import { getPlayer } from '@dcl/sdk/players'
import { initState, setMyAddress } from './state'
import { buildWorld } from './world'
import { setupUi } from './ui'
import { initAudio } from './feedback'
import { authoritySystem, beamSpinSystem, effectsSystem, renderSystem } from './systems'

export function main() {
  initState()
  buildWorld()
  initAudio()
  setupUi()

  // learn our own wallet address once it is available (drives authority election)
  engine.addSystem(function resolveIdentity() {
    const p = getPlayer()
    if (p?.userId) {
      setMyAddress(p.userId)
      engine.removeSystem(resolveIdentity)
    }
  })

  engine.addSystem(authoritySystem)
  engine.addSystem(beamSpinSystem)
  engine.addSystem(renderSystem)
  engine.addSystem(effectsSystem)
}
