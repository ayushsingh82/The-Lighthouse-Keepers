// Sound cues. Each cue is a short clip from the free Decentraland audio catalog,
// played through a global (non-spatial) AudioSource. The trigger points match
// the web prototype's cue list (see systems.ts effectsSystem + actions.ts).
//
// Decentraland has no scene haptics API, so the web build's vibration is dropped.

import { engine, AudioSource, Transform, type Entity } from '@dcl/sdk/ecs'

export type Cue =
  | 'wind'
  | 'stoke'
  | 'wipe'
  | 'mark'
  | 'light'
  | 'ship-home'
  | 'ship-wrecked'
  | 'beam-died'
  | 'beam-relit'
  | 'dawn'
  | 'night-lost'

const CLIP: Record<Cue, { file: string; volume: number }> = {
  wind: { file: 'assets/Audio/wind.mp3', volume: 0.5 },
  stoke: { file: 'assets/Audio/stoke.mp3', volume: 0.6 },
  wipe: { file: 'assets/Audio/wipe.mp3', volume: 0.6 },
  mark: { file: 'assets/Audio/mark.mp3', volume: 0.7 },
  light: { file: 'assets/Audio/light.mp3', volume: 0.7 },
  'ship-home': { file: 'assets/Audio/ship-home.mp3', volume: 0.8 },
  'ship-wrecked': { file: 'assets/Audio/ship-wrecked.mp3', volume: 0.8 },
  'beam-died': { file: 'assets/Audio/beam-died.mp3', volume: 0.5 },
  'beam-relit': { file: 'assets/Audio/beam-relit.mp3', volume: 0.6 },
  dawn: { file: 'assets/Audio/dawn.mp3', volume: 0.8 },
  'night-lost': { file: 'assets/Audio/night-lost.mp3', volume: 0.8 }
}

const cueEntity = new Map<Cue, Entity>()
let ambient: Entity = engine.RootEntity
let ready = false

/** Call once from main(). Creates one audio entity per cue + the night bed. */
export function initAudio(): void {
  for (const key of Object.keys(CLIP) as Cue[]) {
    const e = engine.addEntity()
    Transform.create(e, {})
    AudioSource.create(e, { audioClipUrl: CLIP[key].file, playing: false, global: true, volume: CLIP[key].volume })
    cueEntity.set(key, e)
  }
  ambient = engine.addEntity()
  Transform.create(ambient, {})
  AudioSource.create(ambient, {
    audioClipUrl: 'assets/Audio/night-ambient.mp3',
    playing: false,
    loop: true,
    global: true,
    volume: 0.25
  })
  ready = true
}

export function fx(cue: Cue): void {
  if (!ready) return
  const e = cueEntity.get(cue)
  if (e) AudioSource.playSound(e, CLIP[cue].file)

  if (cue === 'light') startAmbient()
  if (cue === 'dawn' || cue === 'night-lost') stopAmbient()
}

export function startAmbient(): void {
  if (!ready) return
  const a = AudioSource.getMutableOrNull(ambient)
  if (a) a.playing = true
}

export function stopAmbient(): void {
  if (!ready) return
  const a = AudioSource.getMutableOrNull(ambient)
  if (a) a.playing = false
}
