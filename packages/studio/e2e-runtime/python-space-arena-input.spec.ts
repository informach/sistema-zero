import { type CDPSession, expect, test } from '@playwright/test'
import { z } from 'zod'
import { decodeGameObservations } from '../../../experiments/studio-python-runtime/qualification/game_observations'
import {
  prepareSpaceQualification,
  prepareSpaceScenario,
} from '../../../experiments/studio-python-runtime/qualification/space_arena'

test.use({
  trace: 'off',
  launchOptions: {
    ignoreDefaultArgs: ['--mute-audio', '--autoplay-policy=no-user-gesture-required'],
  },
})
const State = z.object({
  status: z.string(),
  error: z.string().optional(),
  events: z.array(
    z.object({
      type: z.string(),
      message: z.string().optional(),
      text: z.string().optional(),
      omittedChars: z.number().optional(),
      omittedLines: z.number().optional(),
    }),
  ),
})
const InputEvent = z
  .object({
    kind: z.string(),
    key: z.string().optional(),
    release: z.boolean().optional(),
    simulationCalls: z.number(),
    gameState: z.string().optional(),
    cameraVisible: z.boolean().optional(),
    elapsedSeconds: z.number().optional(),
    activeMissiles: z.number().int().optional(),
    player: z.object({ da: z.number(), thrust: z.number() }).passthrough().optional(),
  })
  .passthrough()
async function evaluate(cdp: CDPSession, expression: string): Promise<unknown> {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
    userGesture: false,
  })
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
  return result.result.value
}
const state = async (cdp: CDPSession) =>
  State.parse(await evaluate(cdp, "globalThis.providerProbe.read('audio')"))
async function events(cdp: CDPSession) {
  const result = await state(cdp)
  if (result.status === 'failed') throw new Error(JSON.stringify(result))
  const output = result.events.filter((event) => event.type === 'console')
  expect(output.every((event) => event.omittedChars === 0 && event.omittedLines === 0)).toBe(true)
  return decodeGameObservations(
    output.map((event) => event.text ?? '').join(''),
    '__SZ_SPACE_INPUT__',
  ).map((value) => InputEvent.parse(value))
}
async function delivered(cdp: CDPSession, key: string, release = false, count = 1) {
  await expect
    .poll(
      async () =>
        (await events(cdp)).filter(
          (event) =>
            event.kind === 'input-delivered' && event.key === key && event.release === release,
        ).length,
    )
    .toBe(count)
  return (await events(cdp))
    .filter(
      (event) => event.kind === 'input-delivered' && event.key === key && event.release === release,
    )
    .at(-1)!
}
const media =
  'globalThis.__spaceMedia.map(item=>({paused:item.paused,src:item.getAttribute("src"),currentTime:item.currentTime}))'
const Media = z.array(
  z.object({ paused: z.boolean(), src: z.string().nullable(), currentTime: z.number() }),
)

test('portable Space Arena real keyboard pause Stop and restart preserve original game', async ({
  page,
  request,
}, info) => {
  test.setTimeout(90_000)
  const baseline = await prepareSpaceQualification(request)
  const fixture = await prepareSpaceScenario(baseline.project, 'input-lifecycle')
  await info.attach('input-source-identity', {
    body: JSON.stringify({ baseline: baseline.evidence, fixture: fixture.evidence }),
    contentType: 'application/json',
  })
  await page.route('**/project/spaceArenaPortable', (route) =>
    route.fulfill({ json: fixture.project }),
  )
  const browserErrors: string[] = []
  page.on('pageerror', (error) => browserErrors.push(String(error)))
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text())
  })
  await page.goto('/provider')
  const cdp = await page.context().newCDPSession(page)
  let primary: unknown
  try {
    await expect.poll(() => evaluate(cdp, '!!globalThis.providerProbe')).toBe(true)
    await evaluate(
      cdp,
      'globalThis.__spaceMedia=[];globalThis.Audio=new Proxy(globalThis.Audio,{construct(target,args){const item=Reflect.construct(target,args,target);globalThis.__spaceMedia.push(item);return item}})',
    )
    await evaluate(cdp, "globalThis.providerProbe.prepare('audio','spaceArenaPortable')")
    expect((await state(cdp)).status).toBe('ready')
    expect(await evaluate(cdp, 'navigator.userActivation.hasBeenActive')).toBe(false)
    await page.getByRole('button', { name: 'Jogar', exact: true }).click()
    await expect
      .poll(async () =>
        (await events(cdp)).some(
          (event) =>
            event.kind === 'input-ready' &&
            event.simulationCalls === 0 &&
            event.gameState === 'splash',
        ),
      )
      .toBe(true)
    const frame = page.frames().find((item) => item.url().includes('/frame.html'))
    if (!frame) throw new Error('Missing protected game frame')
    const canvas = frame.locator('canvas')
    await canvas.evaluate((element) => {
      const target = element as HTMLCanvasElement & { inputEvidence?: unknown[] }
      target.inputEvidence = []
      for (const type of ['keydown', 'keyup'])
        target.addEventListener(type, (event) => {
          const key = event as KeyboardEvent
          if (target.inputEvidence!.length < 64)
            target.inputEvidence!.push({
              type,
              key: key.key,
              repeat: key.repeat,
              trusted: key.isTrusted,
            })
        })
    })
    // Focus isolation: keys on host controls do not invoke canvas bindings.
    await page.getByRole('button', { name: 'Jogar', exact: true }).focus()
    await page.keyboard.press('ArrowUp')
    await page.waitForTimeout(100)
    expect((await events(cdp)).filter((event) => event.kind === 'input-delivered')).toHaveLength(0)
    await canvas.press('s')
    expect((await delivered(cdp, 's')).gameState).toBe('playing')
    await expect
      .poll(async () =>
        (await events(cdp)).some(
          (event) => event.kind === 'playing-frame' && event.simulationCalls > 0,
        ),
      )
      .toBe(true)
    await canvas.focus()
    await page.keyboard.down('ArrowLeft')
    expect((await delivered(cdp, 'Left')).player?.da).toBe(10)
    await page.keyboard.up('ArrowLeft')
    expect((await delivered(cdp, 'Left', true)).player?.da).toBe(0)
    await page.keyboard.down('ArrowRight')
    expect((await delivered(cdp, 'Right')).player?.da).toBe(-10)
    await page.keyboard.up('ArrowRight')
    expect((await delivered(cdp, 'Right', true)).player?.da).toBe(0)
    await page.keyboard.down('ArrowUp')
    expect((await delivered(cdp, 'Up')).player?.thrust).toBe(0.2)
    await page.keyboard.down('ArrowUp')
    expect((await delivered(cdp, 'Up', false, 2)).player?.thrust).toBe(0.4)
    await page.keyboard.up('ArrowUp')
    expect((await delivered(cdp, 'Up', true)).player?.thrust).toBe(0)
    await canvas.press('Space')
    expect((await delivered(cdp, 'space')).activeMissiles).toBe(3)
    const fpsBeforePause =
      (await state(cdp)).events
        .map((event) => event.text ?? '')
        .join('')
        .match(/^FPS: \d+$/gm)?.length ?? 0
    await canvas.press('p')
    const paused = await delivered(cdp, 'p')
    expect(paused.gameState).toBe('paused')
    await canvas.press('c')
    expect((await delivered(cdp, 'c')).cameraVisible).toBe(true)
    await canvas.press('C')
    expect((await delivered(cdp, 'C')).cameraVisible).toBe(false)
    await expect
      .poll(async () =>
        (await events(cdp)).some(
          (event) =>
            event.kind === 'pause-proof' &&
            (event.elapsedSeconds ?? 0) >= 1.2 &&
            event.simulationCalls === paused.simulationCalls,
        ),
      )
      .toBe(true)
    const fpsAfterPause =
      (await state(cdp)).events
        .map((event) => event.text ?? '')
        .join('')
        .match(/^FPS: \d+$/gm)?.length ?? 0
    expect(fpsAfterPause).toBeGreaterThan(fpsBeforePause)
    await canvas.press('P')
    expect((await delivered(cdp, 'P')).gameState).toBe('playing')
    const trusted = z
      .array(
        z.object({ type: z.string(), key: z.string(), repeat: z.boolean(), trusted: z.boolean() }),
      )
      .parse(
        await canvas.evaluate(
          (element) => (element as HTMLCanvasElement & { inputEvidence: unknown[] }).inputEvidence,
        ),
      )
    expect(trusted.every((event) => event.trusted)).toBe(true)
    expect(
      trusted.some((event) => event.type === 'keydown' && event.key === 'ArrowUp' && event.repeat),
    ).toBe(true)
    await expect
      .poll(async () =>
        Media.parse(await evaluate(cdp, media)).some(
          (item) => !item.paused && item.currentTime > 0.1,
        ),
      )
      .toBe(true)
    const oldMediaCount = Media.parse(await evaluate(cdp, media)).length
    expect(oldMediaCount).toBeGreaterThanOrEqual(3) // Real BGM, thruster and missile voices.
    await info.attach('first-run-input', {
      body: JSON.stringify({ state: await state(cdp), trusted, media: await evaluate(cdp, media) }),
      contentType: 'application/json',
    })
    await page.getByRole('button', { name: 'Parar', exact: true }).click()
    await expect.poll(async () => (await state(cdp)).status).toBe('stopped')
    await expect
      .poll(async () =>
        Media.parse(await evaluate(cdp, media)).every((item) => item.paused && item.src === null),
      )
      .toBe(true)
    const stoppedEvents = (await state(cdp)).events
    await page.waitForTimeout(1100) // Observation beyond the original FPS interval; no virtual clock.
    expect((await state(cdp)).status).toBe('stopped')
    expect((await state(cdp)).events).toEqual(stoppedEvents)
    await evaluate(cdp, "globalThis.providerProbe.prepare('audio','spaceArenaPortable')")
    expect(frame.isDetached()).toBe(true)
    await page.getByRole('button', { name: 'Jogar', exact: true }).click()
    await expect
      .poll(async () =>
        (await events(cdp)).some(
          (event) =>
            event.kind === 'input-ready' &&
            event.simulationCalls === 0 &&
            event.gameState === 'splash',
        ),
      )
      .toBe(true)
    const restarted = page.frames().find((item) => item.url().includes('/frame.html'))
    if (!restarted) throw new Error('Missing restarted protected frame')
    await restarted.locator('canvas').press('S')
    expect((await delivered(cdp, 'S')).gameState).toBe('playing')
    await expect
      .poll(async () => (await events(cdp)).some((event) => event.kind === 'playing-frame'))
      .toBe(true)
    await expect
      .poll(async () =>
        Media.parse(await evaluate(cdp, media))
          .slice(oldMediaCount)
          .some((item) => !item.paused && item.currentTime > 0.1),
      )
      .toBe(true)
    expect(
      Media.parse(await evaluate(cdp, media))
        .slice(0, oldMediaCount)
        .every((item) => item.paused && item.src === null),
    ).toBe(true)
    await page.getByRole('button', { name: 'Parar', exact: true }).click()
    await expect.poll(async () => (await state(cdp)).status).toBe('stopped')
    await expect
      .poll(async () =>
        Media.parse(await evaluate(cdp, media)).every((item) => item.paused && item.src === null),
      )
      .toBe(true)
    expect(browserErrors).toEqual([])
  } catch (error) {
    primary = error
  }
  try {
    await info.attach('input-lifecycle-final', {
      body: JSON.stringify({ state: await state(cdp), media: await evaluate(cdp, media) }),
      contentType: 'application/json',
    })
  } catch (error) {
    primary =
      primary === undefined
        ? error
        : new AggregateError([primary, error], 'Primary/evidence failure')
  }
  try {
    await evaluate(cdp, "globalThis.providerProbe.dispose('audio')")
  } catch (error) {
    primary =
      primary === undefined
        ? error
        : new AggregateError([primary, error], 'Primary/disposal failure')
  }
  try {
    await cdp.detach()
  } catch (error) {
    primary =
      primary === undefined ? error : new AggregateError([primary, error], 'Primary/CDP failure')
  }
  if (primary !== undefined) throw primary
})
