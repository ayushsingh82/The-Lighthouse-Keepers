# The Lighthouse Keepers

A co-op night watch for mobile Decentraland. The keeper is gone and the beacon
is dead. You and a few strangers wash ashore in the fog. Three stations keep the
light alive — the rotation **gear**, the **flame**, the **lens** — and one pair
of hands can't hold all three. Keep the beam burning until dawn and guide the
ships past the rocks. At first light a message in a bottle washes up — a line
left by a real group who kept the light before you. You sign the logbook and
leave one line for whoever comes next.

> **Tagline:** *Keep the light alive until dawn. Nobody keeps it alone.*

Built for the **Decentraland Friendzone Mobile Buildathon** (DCL Regenesis Labs).

---

## Repository layout

| Path | What it is |
|---|---|
| [`scene/`](./scene/) | **The submission.** A Decentraland **SDK7** scene — the real, deployable build. Multiplayer via `syncEntity`, physical stations, a sweeping beam, React-ECS HUD + overlays, a persistent logbook. |
| `src/`, `public/` … | The **feel prototype** — a Next.js web app that previews the core loop, the mobile controls, and the art direction. Not submittable (wrong stack); it's the pitch demo and design reference. |
| [`docs/`](./docs/) | Requirements, pitch, and the SDK7 port guide. |

## The SDK7 scene (`scene/`)

```bash
cd scene
npm install
npm run start              # preview in the Decentraland desktop client
npm run start -- --mobile  # QR code — preview on your phone (same Wi-Fi)
npm run build              # type-check + bundle only
```

**Deploy** (needs a World name — a `*.dcl.eth` NAME on a wallet, or a free one
from the Friendzone Discord):

1. Put the name in `scene/scene.json` → `worldConfiguration.name`
2. `npm run deploy` and sign with the wallet that owns it
3. Live at `decentraland.org/play?realm=<name>.dcl.eth`

Build details and the multiplayer model are in [`scene/README.md`](./scene/README.md)
and [`docs/SDK7-PORT.md`](./docs/SDK7-PORT.md).

## The web prototype

```bash
npm install
npm run dev     # http://localhost:3000  — landing page + /play
```

Portrait, mobile-first. `/play` runs the full night loop with sound and haptics.
It is a **prototype** — the Decentraland scene is the submission.

## How it scores

| Criterion | Answer |
|---|---|
| Mobile-First | Every action is one finger — walk to a station and tap, tap a ship. No dexterity, no multi-touch, portrait. |
| Social Value | The meters decay faster than one keeper can service. You divide the stations and call out what's slipping. No voice needed — the shared HUD and the beam going dark *are* the channel. |
| Mobile UX | Safe-area insets, big tap targets, `isMobile()` sizing, colour + shape + text for every state. |
| Performance | One parcel, primitives + one beam mesh, 20 Hz render, snapshot netcode. |
| Creativity | Leads with a world and a mood — dread, fog, a failing light, a ghost — not a mechanic. |
| Retention | The World's running "souls guided home" counter, the logbook your line stays in, bottle messages you only see by surviving. "Bring a friend, we need a third." |

Full pitch: [`docs/PITCH.md`](./docs/PITCH.md).

## Status

- Web prototype: complete, builds clean.
- SDK7 scene: engine ported, multiplayer + UI + world built; type-checks and
  bundles clean on `@dcl/sdk` 7.28.0. **Not yet verified in the Decentraland
  client or deployed** — needs the app installed and a World name.

## License

Open source. See the buildathon terms for submission conditions.
