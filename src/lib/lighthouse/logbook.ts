// Local persistence for the keeper's logbook and the running rescue tally.
//
// This is a stand-in. In the Decentraland build these reads/writes go to the
// scene's multiplayer server so the logbook and "ships guided home" counter are
// shared by everyone who has ever kept the light. The shape is kept identical so
// the swap is a one-file change.

const LOG_KEY = "lighthouse.logbook.v1";
const TALLY_KEY = "lighthouse.tally.v1";

export interface LogEntry {
  name: string;
  line: string;
  guidedHome: number;
  wrecked: number;
  reachedDawn: boolean;
  at: number; // epoch ms
}

export interface Tally {
  totalGuidedHome: number;
  nightsKept: number;
  nightsLost: number;
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function readLogbook(): LogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return safeParse<LogEntry[]>(localStorage.getItem(LOG_KEY), []);
  } catch {
    return [];
  }
}

export function readTally(): Tally {
  const fallback: Tally = { totalGuidedHome: 0, nightsKept: 0, nightsLost: 0 };
  if (typeof window === "undefined") return fallback;
  try {
    return safeParse<Tally>(localStorage.getItem(TALLY_KEY), fallback);
  } catch {
    return fallback;
  }
}

export function appendLog(entry: LogEntry): LogEntry[] {
  const next = [entry, ...readLogbook()].slice(0, 50);
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(next));
  } catch {
    /* private mode / quota — the night still counts, it just isn't remembered */
  }
  return next;
}

export function recordNight(reachedDawn: boolean, guidedHome: number): Tally {
  const t = readTally();
  const next: Tally = {
    totalGuidedHome: t.totalGuidedHome + guidedHome,
    nightsKept: t.nightsKept + (reachedDawn ? 1 : 0),
    nightsLost: t.nightsLost + (reachedDawn ? 0 : 1),
  };
  try {
    localStorage.setItem(TALLY_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

/** The message in a bottle shown at dawn — a real line left by a past keeper,
 *  or a seeded one the first time anybody plays. */
export function drawBottleMessage(log: LogEntry[]): { name: string; line: string } {
  const withLines = log.filter((e) => e.line.trim().length > 0);
  if (withLines.length > 0) {
    return withLines[Math.floor(Math.random() * withLines.length)];
  }
  const seed = [
    { name: "M. Aldous", line: "The gear forgets you the moment you let go. Never let go." },
    { name: "Perri", line: "When the fog came I stopped watching the sea and watched the lens. We lost two that night." },
    { name: "the last keeper", line: "If you are reading this, the light held. Keep it holding." },
  ];
  return seed[Math.floor(Math.random() * seed.length)];
}
