# Porting The Lighthouse Keepers to Decentraland SDK7

The Next.js app in this repo is a **feel prototype** — it proves the loop, the
mobile controls, and the art direction. It is **not submittable**. The
submission must be an SDK7 scene deployed to a Decentraland World. This doc is
the plan to get there.

> Good news: the hard part (game design + tuned engine) is already done. The
> engine in `src/lib/lighthouse/engine.ts` is framework-agnostic pure functions.
> It moves to SDK7 almost unchanged.

---

## STATUS — the port is built

The SDK7 scene lives in [`scene/`](../scene/). Done:

- `scene/src/engine.ts` — the engine, ported verbatim + `crewFactor()` difficulty scaling
- `scene/src/state.ts` — whole night in one `syncEntity`'d component (serverless, multi-writer); authority election by lowest wallet address; logbook + all-time tally as a second synced component
- `scene/src/world.ts` — island, tower, rotating emissive **beam cone**, three **physical** stations (walk up + press interact — spatial division of labour *is* the co-op mechanic), ship entities synced to state each frame
- `scene/src/systems.ts` — authority tick, beam spin, 20 Hz render, transition sound cues
- `scene/src/ui.tsx` — React-ECS HUD (meters, clock, tally, beam countdown, "call a second keeper" nudge) + briefing / dawn / wreck overlays with logbook signing
- `scene.json` — title, description, `tags: ["game","social"]`, spawn point, `worldConfiguration.name` placeholder

`npm run build` type-checks and bundles clean on `@dcl/sdk` 7.28.0. `npm run start --no-client` serves with 0 errors.

**Not done (needs things only you can provide):**
- Verify in the Decentraland **desktop client** (`npm run start`) and **mobile** (`npm run start -- --mobile`) — not installable in this environment
- A **World name** on a wallet → `scene.json` → `npm run deploy` (§1)
- Sound: `AudioSource` clips wired into `scene/src/feedback.ts` (needs asset downloads — your call)
- Optional: move the static tower/island entities into `main.composite` for Creator Hub editing (§6)

The rest of this doc is the reference/rationale behind those choices.

---

## 0. What "doing SDK7" actually means

SDK7 is Decentraland's TypeScript game framework. It is an **ECS** (Entity /
Component / System):

- **Entities** — numeric ids for things in the scene (the tower, a station, a ship)
- **Components** — data attached to entities (`Transform`, `MeshRenderer`, `GltfContainer`, plus your own custom components)
- **Systems** — functions that run every frame with `dt` (delta time) — this is your game loop

You write `src/index.ts`, it compiles to a scene bundle, you preview it in the
Decentraland desktop client, then deploy it to a World.

You are **not** writing React, HTML, or CSS. UI is built with SDK7's UI system
(`ReactEcs` / `@dcl/sdk/react-ecs` — JSX-like, but its own flexbox renderer, not the DOM).

---

## 1. One-time setup (do this first — it's the real blocker)

### 1.1 Toolchain
```bash
# Node 18+ required
npm i -g @dcl/sdk-commands

# scaffold a fresh scene in a sibling folder
cd ..
npx @dcl/sdk-commands init          # pick an empty / minimal template
cd my-lighthouse-scene
npm run start                        # opens the desktop client preview
npm run start -- --mobile            # QR code -> preview on your actual phone
```
Or install **Creator Hub** (desktop app) and use its "Show QR for Mobile"
button — same thing with a GUI and one-click publish.

### 1.2 A World name (deployment is blocked without this)
You need a wallet that owns a **Decentraland NAME** (`something.dcl.eth`) — it
grants a World + 100 MB storage. Costs 100 MANA (burned) + a little Polygon gas.

- **Ask in the Friendzone Discord channel first** — buildathons often hand out
  free World names. Costs nothing, unblocks you immediately.
- Fallback: buy ~100 MANA + ~$1 POL, claim a NAME at
  `decentraland.org/builder/names`.
- Cheapest: attach a World to an ENS `.eth` name you already own (36 MB cap).

Put the name in `scene.json`:
```json
{
  "worldConfiguration": { "name": "yourname.dcl.eth" }
}
```

### 1.3 Deploy
```bash
npx sdk-commands deploy --target-content https://worlds-content-server.decentraland.org
# live at: decentraland.org/play?realm=yourname.dcl.eth
```

---

## 2. Map the prototype onto SDK7

| Prototype (Next.js)                       | SDK7 equivalent |
|------------------------------------------|-----------------|
| `engine.ts` pure functions (`tick`, `wind`, `stoke`, `wipe`, `markShip`) | **Keep as-is.** Drop the file in, call `tick(state, dt*1000)` from a system. |
| `useLighthouse.ts` rAF loop              | An SDK7 **system**: `engine.addSystem(update)` where `update(dt)` runs the tick |
| React state → re-render                  | Mutate a module-level `state` object; systems and UI read it each frame |
| `Scene.tsx` (DOM art)                    | 3D entities: `GltfContainer` props + `MeshRenderer` primitives + a real spotlight-style beam mesh |
| `HUD.tsx`, `Overlays.tsx`, `StationDock.tsx` (HTML/CSS) | SDK7 UI via `ReactEcs.render()` — `<UiEntity>` with flexbox, `uiText`, `uiBackground` |
| Tap a ship `<button onPointerDown>`      | `pointerEventsSystem.onPointerDown(entity, cb, { button: InputAction.IA_POINTER })` on the ship entity |
| Hold-to-wind button                      | UI button tracking `IA_PRIMARY` down/up, OR stand-on-a-trigger-area near the gear entity |
| `feedback.ts` Web Audio synths           | `AudioSource` component with short sound files (mobile has no Web Audio) |
| `logbook.ts` localStorage                | **Multiplayer server** (see §4) — key-value for logbook + tally |
| `localStorage` quiet toggle              | Per-player UI state in the scene, or drop it (client has its own volume) |

---

## 3. Multiplayer — the thing that makes it eligible

Rule 2 of the buildathon: single-player experiences are **ineligible**. The
scene must sync between players in the same World.

### 3.1 Station state — peer-to-peer via MessageBus / synced entities
The three system values (`gear`, `flame`, `lens`) and the ship list are shared
game state. Two options:

- **`@dcl/sdk/network`** (`syncEntity` / `NetworkEntity`) — mark the entities
  whose components should replicate; SDK handles the sync. Simplest.
- **`MessageBus`** — `bus.emit('wind', {...})`, `bus.on('wind', cb)`. Manual but
  total control. Good for "player X tapped Stoke" events.

Design choice: run the authoritative `tick` on **one elected client** (the first
player in, or lowest id) and broadcast the resulting `state` snapshot ~5×/sec.
Other clients render the last snapshot and interpolate. Actions
(`wind`/`stoke`/`wipe`/`mark`) are sent as messages to the authority.

### 3.2 Persistence — the Multiplayer Server (authoritative)
The **logbook** and the global **"ships guided home"** tally must survive
between sessions and can't be client-faked. Use DCL's Multiplayer Server
pattern (reference: `kickoff-2026`, "Multiplayer Server Leaderboard"):

- Server owns: `logbook[]`, `tally { totalGuidedHome, nightsKept, nightsLost }`
- Client calls: `getLogbook()`, `appendEntry(name, line, result)` at dawn
- Server validates + broadcasts. This is a tiny Node service you also deploy.

Keep the interface identical to `logbook.ts` so it's a one-file swap.

### 3.3 Works with 1–2 players too (Rule 3)
Judges may test alone. The night must be *hard but winnable* solo and
*comfortable* with 2–4. Concretely:
- Solo: decay rates as tuned now — you're constantly running between stations.
- Scale `GEAR_DECAY` / `FLAME_DECAY` **down ~15%** per additional player present,
  OR spawn ships faster with more players (more to do, not less pressure).
- Never *require* N players for a door/action — that strands a solo judge.

---

## 4. The beam (the one bit of real 3D work)

Options, cheapest first:
1. **A long thin glowing cone mesh** (`MeshRenderer.setCylinder` scaled, or a
   custom `.glb`) parented to the lantern, with an emissive semi-transparent
   material. Rotate its `Transform` every frame in a system. This is the
   prototype's CSS beam, in 3D. **Do this.**
2. Add a `LightSource` (spotlight) — **not supported on mobile yet** (Aug 2026
   review). Skip or use only as a desktop nicety.
3. Fake volumetric scattering with a few stacked transparent planes. Overkill
   for 4 days.

A ship is "lit" when the angle between (beam forward) and (lantern→ship) is
under a threshold — pure math, same as `markShip` gating, no raycast needed.

---

## 5. Mobile UI rules (SDK7 specifics)

- Build UI with `@dcl/sdk/react-ecs`. It's flexbox — `flexDirection`, `justifyContent`, `width: '100%'`.
- **Mobile Safe Area API** — inset the root `UiEntity` so it clears notch / home bar.
- Big tap targets. One finger. No multi-touch, no gestures.
- **Smart Items are not reliably supported on mobile → write real systems, not no-code Actions.**
- No "animation finished" event on mobile — track durations manually with `dt`.
- Test framerate on a real mid-range phone, not just desktop.

---

## 6. Asset budget

- Grey-box everything first. One island, one tower, one interior.
- Pull free props from the **OpenDCL catalog** (8,800+ GLBs) and **Genesis Plaza
  assets** — rocks, railings, a lantern, a crate. Load with `GltfContainer`.
- Run GLBs through the **DCL Scene Optimizer** (texture dedup + compression).
- Reuse materials. Keep under the SDK7 "Scene limitations" poly/draw-call budget.

---

## 7. Suggested order of work

1. **Setup + a deployed grey box** — empty scene with the tower, deployed to the
   World, opens on your phone. Proves the pipeline end to end. (Half a day.)
2. Drop in `engine.ts`, run `tick` in a system, render the 3 values as debug text.
3. SDK7 UI: HUD + station buttons + briefing/dawn/wreck overlays.
4. The beam mesh + sweep + ships as tap targets + mark logic.
5. `@dcl/sdk/network` sync for station state; elect an authority.
6. Multiplayer Server for logbook + tally; wire dawn screen to it.
7. Fog waves, sound (`AudioSource`), haptics, polish, safe-area pass.
8. Optimize assets, test on phone, redeploy, submit on DoraHacks, keep the
   World live + repo public through judging (Sep 12–18).

---

## 8. Reference scenes to read (all open source, `github.com/dcl-regenesislabs`)

- `kickoff-2026` — prediction game **with a Multiplayer Server + leaderboard** (copy this for §3.2)
- `dead-surge` — multiplayer shooter, entity sync patterns
- `venetian-hunt` — multiplayer prop hunt, role assignment
- `cozy-farm` — persistent state, mobile UI
- `towerofmadness` — multiplayer parkour, mobile controls

## 9. Key docs

- Build for Mobile: https://docs.decentraland.org/creator/build-for-mobile/mobile-client/
- Mobile missing features: https://docs.decentraland.org/creator/build-for-mobile/mobile-client/missing-features.md
- Player interaction (pointer events): https://docs.decentraland.org/creator/development-guide/sdk7/click-events/
- SDK7 UI: https://docs.decentraland.org/creator/development-guide/sdk7/onscreen-ui/
- Networking / sync: https://docs.decentraland.org/creator/development-guide/sdk7/serverless-multiplayer/
- Multiplayer Server: https://docs.decentraland.org/creator/development-guide/sdk7/multiplayer-server/
- Publishing to a World: https://docs.decentraland.org/creator/worlds/about/
- Scene limitations: https://docs.decentraland.org/creator/development-guide/sdk7/scene-limitations/
