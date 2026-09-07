"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createGame,
  startNight,
  stoke,
  wind,
  wipe,
  markShip,
  tick,
  type GameState,
  type TickEvent,
} from "@/lib/lighthouse/engine";

type Listener = (e: TickEvent) => void;

/** Drives the engine on a requestAnimationFrame loop and mirrors each frame into
 *  React state. The authoritative game state lives in a ref so the loop never
 *  closes over a stale value; React state is just for rendering. */
export function useLighthouse(onEvent?: Listener) {
  const [state, setState] = useState<GameState>(createGame);

  const stateRef = useRef(state);
  const onEventRef = useRef<Listener | undefined>(onEvent);
  const windHeld = useRef(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    let raf = 0;
    let last = 0;

    const frame = (now: number) => {
      if (!last) last = now;
      const dt = now - last;
      last = now;

      let s = stateRef.current;
      if (s.phase === "night") {
        if (windHeld.current) s = wind(s, dt);
        const res = tick(s, dt);
        s = res.state;
        for (const e of res.events) onEventRef.current?.(e);
        stateRef.current = s;
        setState(s);
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const begin = useCallback(() => {
    const s = startNight();
    stateRef.current = s;
    setState(s);
  }, []);

  const reset = useCallback(() => {
    const s = createGame();
    stateRef.current = s;
    windHeld.current = false;
    setState(s);
  }, []);

  const setWind = useCallback((held: boolean) => {
    windHeld.current = held;
  }, []);

  const doStoke = useCallback(() => {
    const s = stoke(stateRef.current);
    stateRef.current = s;
    setState(s);
  }, []);

  const doWipe = useCallback(() => {
    const s = wipe(stateRef.current);
    stateRef.current = s;
    setState(s);
  }, []);

  const doMark = useCallback((id: number) => {
    const s = markShip(stateRef.current, id);
    stateRef.current = s;
    setState(s);
  }, []);

  return { state, begin, reset, setWind, doStoke, doWipe, doMark };
}
