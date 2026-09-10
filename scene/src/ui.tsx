// The screen-space HUD and the briefing / dawn / wreck overlays.
//
// The three stations are physical entities in the world - you walk to one and
// press the interact button - so there are no on-screen station buttons. The UI
// is just readouts and the between-nights flow.

import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { Button, Input, Label, ReactEcsRenderer, UiEntity } from '@dcl/sdk/react-ecs'
import { isMobile } from '@dcl/sdk/platform'
import { CONFIG, beamStrength, createGame, nightClock, weakestSystem, type GameState } from './engine'
import { applyAction } from './actions'
import { appendLogEntry, drawBottle, readLog, type LogEntry } from './state'

let hud: GameState = createGame()
export function pushHudState(s: GameState): void {
  hud = s
}

// between-nights form state (module-level - no hooks in react-ecs)
let signName = ''
let signLine = ''
let signedThisNight = false
let bottle = { name: '', line: '' }
let lastPhase = ''

const INK = Color4.create(0.91, 0.93, 0.97, 1)
const DIM = Color4.create(0.58, 0.64, 0.73, 1)
const BEAM = Color4.create(1, 0.85, 0.54, 1)
const OK = Color4.create(0.44, 0.88, 0.65, 1)
const BAD = Color4.create(1, 0.42, 0.34, 1)
const PANEL = Color4.create(0.03, 0.05, 0.08, 0.92)

// isMobile() can be false until the platform resolves, so read it per call
const fs = (n: number) => Math.round(n * (isMobile() ? 1.15 : 1))

function meter(label: string, value: number, warn: boolean) {
  const low = value <= CONFIG.BEAM_MIN
  return (
    <UiEntity
      uiTransform={{ width: 190, height: 66, margin: { right: 8 }, padding: 8, flexDirection: 'column' }}
      uiBackground={{ color: low ? Color4.create(0.3, 0.08, 0.06, 0.9) : Color4.create(1, 1, 1, 0.06) }}
    >
      <UiEntity uiTransform={{ width: '100%', height: 22, flexDirection: 'row', justifyContent: 'space-between' }}>
        <Label value={label} fontSize={fs(16)} color={DIM} uiTransform={{ width: 110, height: 22 }} textAlign="middle-left" />
        <Label
          value={`${Math.round(value)}`}
          fontSize={fs(16)}
          color={low ? BAD : warn ? BEAM : INK}
          uiTransform={{ width: 50, height: 22 }}
          textAlign="middle-right"
        />
      </UiEntity>
      <UiEntity uiTransform={{ width: '100%', height: 8, margin: { top: 6 } }} uiBackground={{ color: Color4.create(0, 0, 0, 0.4) }}>
        <UiEntity uiTransform={{ width: `${Math.max(0, Math.min(100, value))}%`, height: 8 }} uiBackground={{ color: low ? BAD : BEAM }} />
      </UiEntity>
    </UiEntity>
  )
}

function Hud() {
  const s = hud
  if (s.phase !== 'night') return <UiEntity uiTransform={{ width: 0, height: 0 }} />
  const strength = beamStrength(s)
  const frac = Math.min(s.elapsed / CONFIG.NIGHT_MS, 1)
  const weak = weakestSystem(s)
  const lit = strength > 0
  const graceLeft = Math.max(0, Math.ceil((CONFIG.GRACE_MS - s.beamOutFor) / 1000))
  const stretched = [s.gear, s.flame, s.lens].filter((v) => v < 42).length >= 2

  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { top: 24, left: 24 },
        width: 640,
        flexDirection: 'column',
        padding: 12
      }}
      uiBackground={{ color: PANEL }}
    >
      {/* clock + rescue tally */}
      <UiEntity uiTransform={{ width: '100%', height: 26, flexDirection: 'row', justifyContent: 'space-between' }}>
        <Label value={`${nightClock(s.elapsed)}  ->  dawn 05:00`} fontSize={fs(16)} color={DIM} uiTransform={{ width: 320, height: 26 }} textAlign="middle-left" />
        <Label value={`${s.guidedHome} home`} fontSize={fs(16)} color={OK} uiTransform={{ width: 140, height: 26 }} textAlign="middle-right" />
        <Label value={`${s.wrecked}/${CONFIG.MAX_WRECKS} lost`} fontSize={fs(16)} color={BAD} uiTransform={{ width: 130, height: 26 }} textAlign="middle-right" />
      </UiEntity>

      {/* night progress */}
      <UiEntity uiTransform={{ width: '100%', height: 8, margin: { top: 8 } }} uiBackground={{ color: Color4.create(1, 1, 1, 0.1) }}>
        <UiEntity uiTransform={{ width: `${frac * 100}%`, height: 8 }} uiBackground={{ color: BEAM }} />
      </UiEntity>

      {/* beam status */}
      <Label
        value={lit ? 'beam lit - tap ships from the balcony' : `BEAM DARK - ${graceLeft}s before the night is lost`}
        fontSize={fs(16)}
        color={lit ? DIM : BAD}
        uiTransform={{ width: '100%', height: 24, margin: { top: 8 } }}
        textAlign="middle-left"
      />

      {/* three meters */}
      <UiEntity uiTransform={{ width: '100%', height: 74, flexDirection: 'row', margin: { top: 8 } }}>
        {meter('Gear', s.gear, weak === 'gear')}
        {meter('Flame', s.flame, weak === 'flame')}
        {meter('Lens', s.lens, weak === 'lens')}
      </UiEntity>

      {stretched && (
        <Label
          value='Two stations slipping at once - call a second keeper.'
          fontSize={fs(15)}
          color={BEAM}
          uiTransform={{ width: '100%', height: 22, margin: { top: 6 } }}
          textAlign="middle-left"
        />
      )}
    </UiEntity>
  )
}

function overlayShell(children: unknown) {
  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { top: 0, left: 0 },
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <UiEntity
        uiTransform={{ width: 760, flexDirection: 'column', padding: 28, pointerFilter: 'block' }}
        uiBackground={{ color: PANEL }}
      >
        {children as ReactEcs.JSX.Element}
      </UiEntity>
    </UiEntity>
  )
}

function heading(text: string, color: Color4) {
  return <Label value={text} fontSize={fs(22)} color={color} uiTransform={{ width: '100%', height: 30 }} textAlign="middle-left" />
}
function para(text: string, h = 60) {
  return <Label value={text} fontSize={fs(17)} color={DIM} uiTransform={{ width: '100%', height: h, margin: { top: 8 } }} textAlign="middle-left" />
}

function Briefing() {
  return overlayShell([
    heading('THE LIGHTHOUSE KEEPERS', DIM),
    <Label
      key='t'
      value='The keeper is gone. The light is dead. The fog is coming in.'
      fontSize={fs(30)}
      color={INK}
      uiTransform={{ width: '100%', height: 84, margin: { top: 10 } }}
      textAlign="middle-left"
    />,
    para('You washed ashore with strangers. Keep the beam alive until dawn - and no one can hold it alone. Walk to a station and press the interact button:', 80),
    para('WIND the gear  -  STOKE the flame  -  WIPE the lens.  When the beam shines, tap ships from the balcony to guide them past the rocks.', 80),
    <Button
      key='b'
      value='Light it'
      variant='primary'
      fontSize={fs(20)}
      uiTransform={{ width: 240, height: 56, margin: { top: 16 } }}
      onMouseDown={() => applyAction('light')}
    />
  ])
}

function Dawn() {
  const s = hud
  const log = readLog()
  return overlayShell([
    heading('DAWN - THE LIGHT HELD', BEAM),
    <Label
      key='h'
      value={`${s.guidedHome} guided home${s.wrecked > 0 ? `, ${s.wrecked} lost` : ''}.`}
      fontSize={fs(28)}
      color={INK}
      uiTransform={{ width: '100%', height: 40, margin: { top: 10 } }}
      textAlign="middle-left"
    />,
    <Label key='bl' value='a message in a bottle' fontSize={fs(14)} color={DIM} uiTransform={{ width: '100%', height: 20, margin: { top: 14 } }} textAlign="middle-left" />,
    <Label key='bt' value={`"${bottle.line}"`} fontSize={fs(17)} color={INK} uiTransform={{ width: '100%', height: 54 }} textAlign="middle-left" />,
    <Label key='bn' value={`- ${bottle.name}`} fontSize={fs(14)} color={DIM} uiTransform={{ width: '100%', height: 20 }} textAlign="middle-left" />,

    ...(signedThisNight
      ? [
          <Label
            key='done'
            value={`Logged. ${log.nightsKept} nights kept - ${log.totalGuidedHome} souls guided home in all.`}
            fontSize={fs(16)}
            color={OK}
            uiTransform={{ width: '100%', height: 24, margin: { top: 14 } }}
            textAlign="middle-left"
          />
        ]
      : [
          <Label key='sl' value='sign the logbook' fontSize={fs(14)} color={DIM} uiTransform={{ width: '100%', height: 20, margin: { top: 14 } }} textAlign="middle-left" />,
          <Input
            key='in'
            placeholder='keeper name'
            fontSize={fs(16)}
            uiTransform={{ width: '100%', height: 40, margin: { top: 6 } }}
            onChange={(v) => (signName = v)}
          />,
          <Input
            key='il'
            placeholder='one line for the next keeper'
            fontSize={fs(16)}
            uiTransform={{ width: '100%', height: 40, margin: { top: 6 } }}
            onChange={(v) => (signLine = v)}
          />,
          <Button
            key='seal'
            value='Seal the bottle'
            variant='primary'
            fontSize={fs(16)}
            uiTransform={{ width: 220, height: 46, margin: { top: 8 } }}
            onMouseDown={() => {
              const entry: LogEntry = {
                name: signName.trim() || 'a keeper',
                line: signLine.trim(),
                guidedHome: s.guidedHome,
                reachedDawn: true,
                at: Date.now()
              }
              appendLogEntry(entry)
              signedThisNight = true
            }}
          />
        ]),

    <Button
      key='again'
      value='Keep another night'
      variant='secondary'
      fontSize={fs(16)}
      uiTransform={{ width: 260, height: 46, margin: { top: 14 } }}
      onMouseDown={() => applyAction('light')}
    />
  ])
}

function Wreck() {
  const s = hud
  const reason = s.wrecked >= CONFIG.MAX_WRECKS ? 'Too many broke on the rocks.' : 'The beam stayed dark too long.'
  return overlayShell([
    heading('THE NIGHT IS LOST', BAD),
    <Label key='r' value={reason} fontSize={fs(28)} color={INK} uiTransform={{ width: '100%', height: 40, margin: { top: 10 } }} textAlign="middle-left" />,
    para(
      s.guidedHome > 0
        ? `${s.guidedHome} made it in before the light failed. The fog takes the tower.`
        : 'Not one ship made it past the rocks. The fog takes the tower.',
      60
    ),
    <Button
      key='b'
      value='Relight'
      variant='primary'
      fontSize={fs(20)}
      uiTransform={{ width: 220, height: 56, margin: { top: 16 } }}
      onMouseDown={() => applyAction('light')}
    />
  ])
}

const root = () => {
  // reset the between-nights form whenever a fresh night starts / ends
  if (hud.phase !== lastPhase) {
    if (hud.phase === 'night') {
      signedThisNight = false
      signName = ''
      signLine = ''
    }
    if (hud.phase === 'dawn' && lastPhase === 'night') {
      bottle = drawBottle()
    }
    lastPhase = hud.phase
  }

  return (
    <UiEntity uiTransform={{ width: '100%', height: '100%' }}>
      <Hud />
      {hud.phase === 'briefing' && <Briefing />}
      {hud.phase === 'dawn' && <Dawn />}
      {hud.phase === 'wreck' && <Wreck />}
    </UiEntity>
  )
}

export function setupUi(): void {
  ReactEcsRenderer.setUiRenderer(root, { virtualWidth: 1920, virtualHeight: 1080 })
}
