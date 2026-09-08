"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLighthouse } from "@/hooks/useLighthouse";
import type { TickEvent } from "@/lib/lighthouse/engine";
import {
  appendLog,
  drawBottleMessage,
  readLogbook,
  readTally,
  recordNight,
  type LogEntry,
  type Tally,
} from "@/lib/lighthouse/logbook";
import { cue, primeAudio, startDrone, stopDrone } from "@/lib/lighthouse/feedback";
import { Scene } from "./Scene";
import { HUD } from "./HUD";
import { StationDock } from "./StationDock";
import { Briefing, Dawn, Wreck, Logbook } from "./Overlays";

interface Toast {
  id: number;
  text: string;
  tone: "ok" | "bad";
}

export function LighthouseGame() {
  const [shaking, setShaking] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const [log, setLog] = useState<LogEntry[]>([]);
  const [tally, setTally] = useState<Tally>({
    totalGuidedHome: 0,
    nightsKept: 0,
    nightsLost: 0,
  });
  const [bottle, setBottle] = useState({ name: "", line: "" });

  useEffect(() => {
    // Hydrate persisted keeper history once, after mount. This must be an effect
    // (not lazy state) to avoid an SSR/client hydration mismatch on the logbook.
    // localStorage here is a stand-in for the scene's shared server — see logbook.ts.
    /* eslint-disable react-hooks/set-state-in-effect */
    setLog(readLogbook());
    setTally(readTally());
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const pushToast = useCallback((text: string, tone: "ok" | "bad") => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2200);
  }, []);

  const jolt = useCallback(() => {
    setShaking(true);
    setTimeout(() => setShaking(false), 420);
  }, []);

  const onEvent = useCallback(
    (e: TickEvent) => {
      switch (e.type) {
        case "ship-home":
          cue.shipHome();
          pushToast("Guided home", "ok");
          break;
        case "beam-relit":
          cue.beamRelit();
          pushToast("Beam relit", "ok");
          break;
        case "night-lost":
          cue.nightLost();
          jolt();
          setTally(recordNight(false, e.guidedHome));
          break;
        case "ship-wrecked":
          cue.shipWrecked();
          pushToast("Lost on the rocks", "bad");
          jolt();
          break;
        case "beam-died":
          cue.beamDied();
          pushToast("The beam is dark!", "bad");
          break;
        case "dawn":
          cue.dawn();
          setBottle(drawBottleMessage(readLogbook()));
          setTally(recordNight(true, e.guidedHome));
          break;
        default:
          break;
      }
    },
    [pushToast, jolt],
  );

  const { state, begin, reset, setWind, doStoke, doWipe, doMark } =
    useLighthouse(onEvent);

  const startNight = useCallback(() => {
    primeAudio();
    startDrone();
    begin();
  }, [begin]);

  const restart = useCallback(() => {
    stopDrone();
    reset();
  }, [reset]);

  const wind = useCallback(
    (held: boolean) => {
      if (held) cue.windStart();
      setWind(held);
    },
    [setWind],
  );

  const stokeFlame = useCallback(() => {
    cue.stoke();
    doStoke();
  }, [doStoke]);

  const wipeLens = useCallback(() => {
    cue.wipe();
    doWipe();
  }, [doWipe]);

  const markShip = useCallback(
    (id: number) => {
      cue.mark();
      doMark(id);
    },
    [doMark],
  );

  // stop the turning drone if the player leaves mid-night
  useEffect(() => () => stopDrone(), []);

  const saveEntry = useCallback(
    (name: string, line: string) => {
      const entry: LogEntry = {
        name,
        line,
        guidedHome: state.guidedHome,
        wrecked: state.wrecked,
        reachedDawn: state.phase === "dawn",
        at: Date.now(),
      };
      setLog(appendLog(entry));
    },
    [state.guidedHome, state.wrecked, state.phase],
  );

  return (
    <div
      className={`safe mx-auto flex h-[100dvh] w-full max-w-md flex-col gap-3 px-3 ${
        shaking ? "shake" : ""
      }`}
    >
      <HUD state={state} />

      <div className="relative flex flex-1 flex-col">
        <Scene state={state} onMarkShip={markShip} />

        {/* toasts */}
        <div className="pointer-events-none absolute inset-x-0 top-2 z-10 flex flex-col items-center gap-1">
          {toasts.map((t) => (
            <span
              key={t.id}
              className={`rise rounded-full px-3 py-1 text-xs font-medium ${
                t.tone === "ok"
                  ? "bg-[var(--ok)]/20 text-[var(--ok)]"
                  : "bg-[var(--danger)]/20 text-[var(--danger)]"
              }`}
            >
              {t.text}
            </span>
          ))}
        </div>

        {state.phase === "briefing" && <Briefing onBegin={startNight} />}
        {state.phase === "dawn" && (
          <Dawn
            state={state}
            bottle={bottle}
            tally={tally}
            onSave={saveEntry}
            onAgain={restart}
          />
        )}
        {state.phase === "wreck" && <Wreck state={state} onAgain={restart} />}
      </div>

      <StationDock
        state={state}
        setWind={wind}
        onStoke={stokeFlame}
        onWipe={wipeLens}
      />

      {state.phase === "briefing" && <Logbook entries={log} />}
    </div>
  );
}
