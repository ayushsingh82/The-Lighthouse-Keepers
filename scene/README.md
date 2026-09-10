# The Lighthouse Keepers — Decentraland SDK7 scene

The submittable build for the Friendzone Mobile Buildathon. A co-op night watch:
three stations keep a lighthouse beam alive, no one keeper can hold all three,
survive to dawn and guide the ships home.

The web app in the parent folder (`../`) is the feel prototype. This is the real
thing.

## Run it

```bash
npm install
npm run start              # opens the Decentraland desktop client preview
npm run start -- --mobile  # QR code — preview on your phone (same Wi-Fi)
npm run build              # type-check + bundle only
```

## Deploy it (needs a World name)

1. Get a **Decentraland NAME** (`something.dcl.eth`) on a wallet, or ask in the
   Friendzone Discord for a free buildathon name. See `../docs/SDK7-PORT.md` §1.2.
2. Put it in `scene.json` → `worldConfiguration.name` (currently `CHANGE-ME.dcl.eth`).
3. `npm run deploy` — sign with the wallet that owns the name.
4. Live at `decentraland.org/play?realm=<name>.dcl.eth`. Keep it up through judging.

## How it's built

| File | Role |
|---|---|
| `src/engine.ts` | Pure game engine — decay, fog waves, ships, win/lose. Ported from the web prototype; `crewFactor()` scales difficulty with player count. |
| `src/state.ts` | The whole night in one `syncEntity`'d component (serverless CRDT, any client writes). Authority election (lowest wallet address runs the tick). Logbook + all-time tally as a second synced component. |
| `src/actions.ts` | A tap on a station or ship → writes the synced state. |
| `src/world.ts` | Builds the island, tower, the sweeping beam cone, the three physical stations, and keeps ship entities in sync each frame. |
| `src/systems.ts` | `authoritySystem` (tick), `beamSpinSystem`, `renderSystem` (20 Hz), `effectsSystem` (sound cues on transitions). |
| `src/ui.tsx` | React-ECS HUD (meters, clock, tally, beam status, co-op nudge) + briefing / dawn / wreck overlays. |
| `src/feedback.ts` | Sound-cue stub — wire `AudioSource` clips here (needs asset download). |

## Multiplayer

`syncEntity` (no server) keeps every keeper on the same night; late joiners get
current state. The **logbook persists only while ≥1 keeper is in the scene** — for
true cross-session persistence, swap `readLog`/`appendLogEntry` in `state.ts` for
a Multiplayer Server call (`../docs/SDK7-PORT.md` §3.2). Solo play works: one
keeper is always the authority and `crewFactor()` keeps a solo night winnable.

## Status

Type-checks and bundles clean on `@dcl/sdk` 7.28.0. Not yet verified in the
Decentraland desktop/mobile client or deployed — that needs the app installed and
a World name on a wallet.
