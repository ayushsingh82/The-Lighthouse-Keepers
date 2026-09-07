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
          pushToast("Guided home", "ok");
          break;
        case "beam-relit":
          pushToast("Beam relit", "ok");
          break;
        case "night-lost":
          jolt();
          setTally(recordNight(false, e.guidedHome));
          break;
        case "ship-wrecked":
          pushToast("Lost on the rocks", "bad");
          jolt();
          break;
        case "beam-died":
          pushToast("The beam is dark!", "bad");
          break;
        case "dawn":
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
        <Scene state={state} onMarkShip={doMark} />

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

        {state.phase === "briefing" && <Briefing onBegin={begin} />}
        {state.phase === "dawn" && (
          <Dawn
            state={state}
            bottle={bottle}
            tally={tally}
            onSave={saveEntry}
            onAgain={reset}
          />
        )}
        {state.phase === "wreck" && <Wreck state={state} onAgain={reset} />}
      </div>

      <StationDock
        state={state}
        setWind={setWind}
        onStoke={doStoke}
        onWipe={doWipe}
      />

      {state.phase === "briefing" && <Logbook entries={log} />}
    </div>
  );
}
