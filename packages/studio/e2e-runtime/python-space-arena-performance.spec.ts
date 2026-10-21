import { type CDPSession, expect, type Page, test } from '@playwright/test'
import { z } from 'zod'
import { decodeGameObservations } from '../../../experiments/studio-python-runtime/qualification/game_observations'
import {
  prepareSpaceQualification,
  prepareSpaceScenario,
} from '../../../experiments/studio-python-runtime/qualification/space_arena'
import {
  evaluate,
  instrumentPresentation,
  providerState,
  quantiles,
  readPresentation,
  resetPresentation,
  TWO_DISPLAY_FRAMES_MS,
} from './gamePerformance'

// S10/P16 for the original Space Arena with real keyboard input and no injected state.
// The authored loop schedules ceil(1000/60 - elapsed) ms per tick, and the authored tick is
// heavy: natively (CPython 3.14.2/Tk 8.6.15) this game runs at 33-36 FPS on the development
// machine. A whole-frame bound therefore uses two display frames (>= 30 FPS); the literal
// 33 ms F3 bound applies to the F3 fixture (python-f3-performance.spec.ts). Infrastructure
// bounds stay strict: no long task, paint p95 <= 8 ms, input -> presentation p95 <= 100 ms.
const PLAY_MS = Number(process.env.SZ_GAMES_PLAY_MS ?? 60_000)
const RESTARTS = Number(process.env.SZ_GAMES_RESTARTS ?? 30)

test.use({ trace: 'off' })
const Observation = z.object({ kind: z.string(), simulationCalls: z.number() }).passthrough()
async function observations(cdp: CDPSession) {
  const text = (await providerState(cdp)).events
    .filter((event) => event.type === 'console')
    .map((event) => event.text ?? '')
    .join('')
  return decodeGameObservations(text, '__SZ_SPACE_INPUT__').map((value) => Observation.parse(value))
}
async function openGame(page: Page, request: Parameters<typeof prepareSpaceQualification>[0]) {
  const baseline = await prepareSpaceQualification(request)
  const fixture = await prepareSpaceScenario(baseline.project, 'input-lifecycle')
  await page.route('**/project/spaceArenaPortable', (route) =>
    route.fulfill({ json: fixture.project }),
  )
  await instrumentPresentation(page)
  await page.goto('/provider')
  const cdp = await page.context().newCDPSession(page)
  await expect.poll(() => evaluate(cdp, '!!globalThis.providerProbe')).toBe(true)
  return { cdp, evidence: { baseline: baseline.evidence, fixture: fixture.evidence } }
}
async function play(page: Page, cdp: CDPSession) {
  await evaluate(cdp, "globalThis.providerProbe.prepare('audio','spaceArenaPortable')")
  expect((await providerState(cdp)).status).toBe('ready')
  const clicked = Date.now()
  await page.getByRole('button', { name: 'Jogar', exact: true }).click()
  // Infrastructure: interpreter up and the learner program running.
  await expect
    .poll(async () => (await providerState(cdp)).status, { timeout: 30_000, intervals: [20] })
    .toBe('running')
  const runningMs = Date.now() - clicked
  // Authored: the original setup (80 turtles, drawn typography) until the splash accepts S.
  await expect
    .poll(async () => (await observations(cdp)).some((event) => event.kind === 'input-ready'), {
      timeout: 30_000,
    })
    .toBe(true)
  const splashMs = Date.now() - clicked - runningMs
  const frame = page.frames().find((item) => item.url().includes('/frame.html'))
  if (!frame) throw new Error('Missing protected game frame')
  await frame.locator('canvas').press('s')
  await expect
    .poll(
      async () =>
        (await observations(cdp)).some(
          (event) => event.kind === 'playing-frame' && event.simulationCalls > 0,
        ),
      { timeout: 30_000 },
    )
    .toBe(true)
  return { frame, runningMs, splashMs }
}

test('Space Arena play keeps presented frames, paint cost and input latency within bounds', async ({
  page,
  request,
}, info) => {
  test.setTimeout(PLAY_MS + 180_000)
  const { cdp, evidence } = await openGame(page, request)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(String(error)))
  try {
    const { frame } = await play(page, cdp)
    await frame.locator('canvas').focus()
    await resetPresentation(frame)
    // Thirty real inputs spread over the window; the rest is uninterrupted play.
    const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp']
    const began = Date.now()
    for (let index = 0; index < 30; index++) {
      const key = keys[index % keys.length]!
      await page.keyboard.down(key)
      await page.waitForTimeout(120)
      await page.keyboard.up(key)
      await page.waitForTimeout(Math.max(150, PLAY_MS / 30 - 120))
    }
    const remaining = PLAY_MS - (Date.now() - began)
    if (remaining > 0) await page.waitForTimeout(remaining)
    const presentation = await readPresentation(frame)
    // The game prints its own frame count every second (authored 1000 ms timer).
    const authoredFps = (
      (await providerState(cdp)).events
        .filter((event) => event.type === 'console')
        .map((event) => event.text ?? '')
        .join('')
        .match(/^FPS: [0-9]+$/gm) ?? []
    ).map((line) => Number(line.slice(5)))
    const report = {
      playMs: PLAY_MS,
      authoredFps: quantiles(authoredFps.slice(1)),
      ...presentation,
      evidence,
      scope: 'Local qualification server, this machine, original game; not the 8 GB reference PC',
    }
    await info.attach('space-arena-presentation', {
      body: JSON.stringify(report, null, 2),
      contentType: 'application/json',
    })
    expect(presentation.inputs).toBe(30)
    expect(presentation.inputToSecondPresentedFrame.count).toBe(30)
    expect(presentation.intervals.count).toBeGreaterThan(PLAY_MS / 100)
    expect(presentation.intervals.p95).toBeLessThanOrEqual(TWO_DISPLAY_FRAMES_MS)
    expect(presentation.frameBuckets.more).toBeLessThanOrEqual(presentation.intervals.count / 100)
    expect(presentation.paintWork.p95).toBeLessThanOrEqual(8)
    expect(presentation.longPaints).toBe(0)
    expect(presentation.longTasks).toBe(0)
    expect(presentation.inputToSecondPresentedFrame.p95).toBeLessThanOrEqual(100)
    expect(errors).toEqual([])
  } finally {
    await page
      .getByRole('button', { name: 'Parar', exact: true })
      .click()
      .catch(() => {})
    await evaluate(cdp, "globalThis.providerProbe.dispose('audio')").catch(() => {})
    await cdp.detach().catch(() => {})
  }
})

test('Space Arena survives repeated Stop and restart without leftover activity', async ({
  page,
  request,
}, info) => {
  test.setTimeout(RESTARTS * 25_000 + 60_000)
  const { cdp } = await openGame(page, request)
  const starts: number[] = []
  const splashes: number[] = []
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(String(error)))
  try {
    for (let cycle = 0; cycle < RESTARTS; cycle++) {
      const { frame, runningMs, splashMs } = await play(page, cdp)
      starts.push(runningMs)
      splashes.push(splashMs)
      await page.getByRole('button', { name: 'Parar', exact: true }).click()
      await expect.poll(async () => (await providerState(cdp)).status).toBe('stopped')
      const stopped = (await providerState(cdp)).events.length
      await page.waitForTimeout(300)
      // No output or state after Stop; the next prepare replaces the protected frame.
      expect((await providerState(cdp)).events.length).toBe(stopped)
      expect((await providerState(cdp)).status).toBe('stopped')
      if (cycle === RESTARTS - 1) {
        await evaluate(cdp, "globalThis.providerProbe.prepare('audio','spaceArenaPortable')")
        expect(frame.isDetached()).toBe(true)
      }
    }
    const report = {
      restarts: RESTARTS,
      clickToRunning: quantiles(starts),
      authoredSetupToSplash: quantiles(splashes),
    }
    await info.attach('space-arena-restarts', {
      body: JSON.stringify(report, null, 2),
      contentType: 'application/json',
    })
    expect(starts).toHaveLength(RESTARTS)
    // Restart is a cached reopen: the cached bound applies to the infrastructure part.
    // The authored setup is reported, never shortened (contract §3, deliberate program work).
    expect(report.clickToRunning.p95).toBeLessThanOrEqual(3000)
    expect(errors).toEqual([])
  } finally {
    await evaluate(cdp, "globalThis.providerProbe.dispose('audio')").catch(() => {})
    await cdp.detach().catch(() => {})
  }
})
