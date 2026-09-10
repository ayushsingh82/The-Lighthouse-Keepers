// A keeper tapped a station or a ship. Any client may write the synced state
// directly (serverless CRDT) - the authority's next tick just builds on it.

import { getState, setState } from './state'
import { stoke, wind, wipe, markShip, startNight } from './engine'
import { fx } from './feedback'

export type ActionKind = 'wind' | 'stoke' | 'wipe' | 'mark' | 'light'

export function applyAction(kind: ActionKind, shipId?: number): void {
  const s = getState()

  if (kind === 'light') {
    if (s.phase !== 'briefing' && s.phase !== 'dawn' && s.phase !== 'wreck') return
    setState(startNight(), { seed: (Math.floor(Math.random() * 4294967296)) >>> 0, startedBy: '' })
    fx('light')
    return
  }

  if (s.phase !== 'night') return

  switch (kind) {
    case 'wind':
      setState(wind(s))
      fx('wind')
      break
    case 'stoke':
      setState(stoke(s))
      fx('stoke')
      break
    case 'wipe':
      setState(wipe(s))
      fx('wipe')
      break
    case 'mark':
      if (shipId !== undefined) {
        const before = s.ships.find((sh) => sh.id === shipId)?.marked
        const next = markShip(s, shipId)
        setState(next)
        if (!before && next.ships.find((sh) => sh.id === shipId)?.marked) fx('mark')
      }
      break
  }
}
