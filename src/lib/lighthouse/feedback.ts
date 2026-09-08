// Sound + haptics for The Lighthouse Keepers.
//
// No audio assets — every cue is synthesised with the Web Audio API on first
// gesture. Both channels honour a single "quiet" toggle (persisted), so muting
// silences the buzzer and stops the phone buzzing in one switch.
//
// In the Decentraland build these map onto the scene's own sound sources and the
// mobile client's haptics; the trigger points (see the TickEvent switch) stay
// the same.

const QUIET_KEY = "lighthouse.quiet.v1";

let quiet = false;
try {
  quiet = localStorage.getItem(QUIET_KEY) === "1";
} catch {
  /* SSR / private mode — default to sound on */
}

type QuietListener = (q: boolean) => void;
const listeners = new Set<QuietListener>();

export function isQuiet(): boolean {
  return quiet;
}

export function setQuiet(next: boolean): void {
  quiet = next;
  try {
    localStorage.setItem(QUIET_KEY, next ? "1" : "0");
  } catch {
    /* ignore */
  }
  if (next) stopDrone();
  listeners.forEach((l) => l(next));
}

export function onQuietChange(l: QuietListener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

// ---- audio ------------------------------------------------------------------

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (quiet) return null;
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Call once from a user gesture (the "Light it" button) to unlock audio on iOS. */
export function primeAudio(): void {
  audio();
}

function blip(
  freq: number,
  dur: number,
  type: OscillatorType = "sine",
  gain = 0.2,
  slideTo?: number,
): void {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(amp).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function chord(freqs: number[], dur: number, gain = 0.14): void {
  freqs.forEach((f) => blip(f, dur, "triangle", gain));
}

// ---- the low turning drone (present only while the beam is lit) -------------

let drone: { osc: OscillatorNode; amp: GainNode } | null = null;

export function startDrone(): void {
  const ac = audio();
  if (!ac || drone) return;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  const lfo = ac.createOscillator();
  const lfoAmp = ac.createGain();
  osc.type = "sawtooth";
  osc.frequency.value = 46;
  lfo.frequency.value = 0.9; // the sweep of the lamp
  lfoAmp.gain.value = 0.02;
  amp.gain.value = 0.0001;
  amp.gain.linearRampToValueAtTime(0.05, ac.currentTime + 0.6);
  lfo.connect(lfoAmp).connect(amp.gain);
  osc.connect(amp).connect(ac.destination);
  osc.start();
  lfo.start();
  drone = { osc, amp };
}

export function stopDrone(): void {
  if (!drone || !ctx) {
    drone = null;
    return;
  }
  const { osc, amp } = drone;
  const t = ctx.currentTime;
  amp.gain.cancelScheduledValues(t);
  amp.gain.setValueAtTime(amp.gain.value, t);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  osc.stop(t + 0.34);
  drone = null;
}

// ---- haptics --------------------------------------------------------------

function buzz(pattern: number | number[]): void {
  if (quiet) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
}

// ---- named cues ----------------------------------------------------------

export const cue = {
  stoke: () => {
    blip(180, 0.14, "square", 0.16, 320);
    buzz(8);
  },
  wipe: () => {
    blip(2200, 0.12, "sine", 0.1, 900);
    buzz(6);
  },
  windStart: () => blip(90, 0.25, "sawtooth", 0.1, 130),
  mark: () => {
    blip(880, 0.1, "sine", 0.12);
    blip(1320, 0.16, "sine", 0.1);
    buzz(10);
  },
  shipHome: () => {
    chord([523.25, 659.25, 783.99], 0.5);
    buzz([12, 40, 12]);
  },
  shipWrecked: () => {
    blip(70, 0.5, "sawtooth", 0.28, 40);
    buzz([40, 30, 120]);
  },
  beamDied: () => {
    stopDrone();
    blip(140, 0.6, "sawtooth", 0.2, 60);
    buzz([80, 40, 80, 40, 80]);
  },
  beamRelit: () => {
    startDrone();
    blip(330, 0.2, "triangle", 0.14, 660);
  },
  dawn: () => {
    stopDrone();
    chord([392, 493.88, 587.33, 783.99], 1.4, 0.12);
    buzz([20, 60, 20, 60, 40]);
  },
  nightLost: () => {
    stopDrone();
    blip(110, 1.2, "sawtooth", 0.3, 40);
    buzz([120, 80, 200]);
  },
};
