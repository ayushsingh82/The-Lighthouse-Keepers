// Sound cues. Stubbed for now: the web prototype synthesises every cue with the
// Web Audio API, which the Decentraland QuickJS runtime does not have. To wire
// real audio, drop short .mp3/.ogg files into assets/Audio/ (the free DCL audio
// catalog has fitting ones) and play them through an `AudioSource` component
// here - the trigger points below already match the web build's cue list.
// Downloading those assets needs the user's OK, so it is left as a polish step.
// See docs/SDK7-PORT.md.

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

export function fx(cue: Cue): void {
  // no-op until AudioSource clips are added; kept as the single call site
  void cue
}
