import { type CDPSession, expect, type Page, type TestInfo, test } from '@playwright/test'
import { z } from 'zod'
import type {} from '../../../experiments/studio-python-runtime/providerHost'
import { decodeGameObservations } from '../../../experiments/studio-python-runtime/qualification/game_observations'
import {
  type PacmanScenario,
  preparePacmanQualification,
  preparePacmanScenario,
} from '../../../experiments/studio-python-runtime/qualification/pacman'

// Functional, instrumented game cases. Natural full games and performance are separate gates.
test.use({
  trace: 'off',
  launchOptions: {
    ignoreDefaultArgs: ['--mute-audio', '--autoplay-policy=no-user-gesture-required'],
  },
})
const Position = z.tuple([z.number(), z.number()])
const Snapshot = z.object({
  player: z.object({
    position: Position,
    heading: z.number(),
    state: z.string(),
    shape: z.string(),
    speed: z.number(),
    score: z.number(),
    lives: z.number(),
    visible: z.boolean(),
  }),
  pellets: z.number().int(),
  power: z.number().int(),
  enemies: z.array(z.object({ position: Position, state: z.string(), visible: z.boolean() })),
  timersScheduled: z.record(z.string(), z.number()),
})
const Event = z.object({
  event: z.string(),
  tick: z.number(),
  clock: z.number().finite(),
  value: z.unknown(),
})

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

async function observations(cdp: CDPSession) {
  const output = z
    .string()
    .parse(
      await evaluate(
        cdp,
        `globalThis.providerProbe.read('audio').events.filter(e=>e.type==='console').map(e=>e.text).join('')`,
      ),
    )
  return decodeGameObservations(output, '__SZ_PACMAN_QA__').map((value) => Event.parse(value))
}

async function waitForObservation(cdp: CDPSession, event: string, tick?: number) {
  let found: z.infer<typeof Event> | undefined
  await expect
    .poll(async () => {
      found = (await observations(cdp)).find(
        (item) => item.event === event && (tick === undefined || item.tick === tick),
      )
      return found !== undefined
    })
    .toBe(true)
  if (!found) throw new Error('Missing game observation')
  return found
}

async function attachAndDispose(page: Page, cdp: CDPSession, info: TestInfo) {
  const errors: unknown[] = []
  try {
    await info.attach('game-observations', {
      body: JSON.stringify(await evaluate(cdp, `globalThis.providerProbe.read('audio')`)),
      contentType: 'application/json',
    })
    const frame = page.frames().find((item) => item.url().includes('/frame.html'))
    if (frame && (await frame.locator('canvas').count()))
      await info.attach('game-frame-before-dispose', {
        body: await frame.locator('canvas').screenshot(),
        contentType: 'image/png',
      })
  } catch (error) {
    errors.push(error)
  }
  try {
    await evaluate(cdp, `globalThis.providerProbe.dispose('audio')`)
  } catch (error) {
    errors.push(error)
  }
  try {
    await cdp.detach()
  } catch (error) {
    errors.push(error)
  }
  if (errors.length) throw new AggregateError(errors, 'Game evidence/disposal failed')
}

for (const scenario of [
  'observe',
  'pellet',
  'power',
  'death',
  'victory-near-end',
  'defeat-near-end',
  'geometry',
  'ai',
] as const satisfies readonly PacmanScenario[]) {
  test(`portable Pac-Man instrumented ${scenario} preserves authored rules`, async ({
    page,
    request,
  }, info) => {
    const baseline = await preparePacmanQualification(
      request,
      process.env.SZ_PACMAN_QA_DISTRIBUTION,
    )
    const fixture = await preparePacmanScenario(baseline.project, scenario)
    await info.attach('game-source-identity', {
      body: JSON.stringify({ ...baseline.evidence, scenario: fixture.evidence }),
      contentType: 'application/json',
    })
    // Source fixture only. Real provider, interpreter, renderer, media and input are unchanged.
    await page.route('**/project/pacmanPortable', (route) =>
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
      await expect.poll(() => evaluate(cdp, `!!globalThis.providerProbe`)).toBe(true)
      await evaluate(cdp, `globalThis.providerProbe.prepare('audio','pacmanPortable')`)
      expect(await evaluate(cdp, `globalThis.providerProbe.read('audio').status`)).toBe('ready')
      await page.locator('iframe').evaluate((frame) => {
        frame.style.cssText = 'width:1100px;height:900px;border:0'
      })
      await page.getByRole('button', { name: 'Jogar', exact: true }).click()
      if (scenario === 'geometry' || scenario === 'ai') {
        const expectedCount = scenario === 'geometry' ? 32 : 10
        const manifest = z
          .object({ cases: z.array(z.object({ name: z.string() })) })
          .parse((await waitForObservation(cdp, 'case-manifest')).value)
        const completed = z
          .object({ count: z.number().int(), closedByQA: z.literal(true) })
          .parse((await waitForObservation(cdp, 'functional-complete')).value)
        expect(manifest.cases).toHaveLength(expectedCount)
        expect(completed.count).toBe(expectedCount)
        const passed = (await observations(cdp))
          .filter((item) => item.event === 'case-passed')
          .map((item) => z.object({ name: z.string() }).parse(item.value).name)
        expect(passed).toEqual(manifest.cases.map((item) => item.name))
        expect(new Set(passed).size).toBe(expectedCount)
        await expect
          .poll(() => evaluate(cdp, `globalThis.providerProbe.read('audio').status`))
          .toBe('completed')
        const consoleEvents = z
          .array(z.object({ omittedChars: z.number(), omittedLines: z.number() }))
          .parse(
            await evaluate(
              cdp,
              `globalThis.providerProbe.read('audio').events.filter(e=>e.type==='console')`,
            ),
          )
        expect(
          consoleEvents.every((item) => item.omittedChars === 0 && item.omittedLines === 0),
        ).toBe(true)
        const events = z
          .array(z.object({ sequence: z.number().int().positive() }))
          .parse(await evaluate(cdp, `globalThis.providerProbe.read('audio').events`))
        expect(events.length).toBeLessThan(2048)
        expect(
          events.every(
            (item, index) => index === 0 || item.sequence === events[index - 1]!.sequence + 1,
          ),
        ).toBe(true)
      } else {
        const before = Snapshot.parse((await waitForObservation(cdp, 'before', 1)).value)
        const afterEvent = await waitForObservation(cdp, 'after', 1)
        const after = Snapshot.parse(afterEvent.value)
        expect(before.player.lives).toBe(3)
        expect(after.enemies).toHaveLength(7)
        if (scenario === 'pellet') {
          expect(after.player.score - before.player.score).toBe(2)
          expect(after.pellets).toBe(before.pellets - 1)
        } else if (scenario === 'power') {
          expect(after.player.score - before.player.score).toBe(50)
          expect(after.power).toBe(before.power - 1)
          expect(after.player.speed).toBe(before.player.speed + 3)
          expect(after.timersScheduled['3000']).toBe(1)
          // Observe the real callback's result, beyond merely recording a scheduled timer.
          const reset = await waitForObservation(cdp, 'after', 250)
          expect(reset.clock - afterEvent.clock).toBeGreaterThanOrEqual(3)
          expect(Snapshot.parse(reset.value).player.speed).toBe(before.player.speed)
        } else if (scenario === 'death' || scenario === 'defeat-near-end') {
          expect(after.player.lives).toBe(scenario === 'death' ? 2 : 0)
          expect(after.player.position).not.toEqual(before.player.position)
          if (scenario === 'defeat-near-end') {
            expect(after.player.visible).toBe(false)
            expect(after.player.state).toBe('stop')
            expect(after.timersScheduled['3000']).toBe(1)
          }
        } else if (scenario === 'victory-near-end') {
          expect(after.pellets + after.power).toBe(0)
          expect(after.player.state).toBe('stop')
          expect(after.enemies.every((enemy) => !enemy.visible && enemy.state === 'stop')).toBe(
            true,
          )
          expect(after.timersScheduled['3000']).toBe(1)
        } else {
          // Bindings become active at the author's real 2500ms timer; no clock replacement.
          await waitForObservation(cdp, 'after', 200)
          const frame = page.frames().find((item) => item.url().includes('/frame.html'))
          if (!frame) throw new Error('Missing protected Python frame')
          for (const [key, heading] of [
            ['Left', 180],
            ['Up', 90],
            ['Right', 0],
            ['Down', 270],
          ] as const) {
            await frame.locator('canvas').press(`Arrow${key}`)
            await expect
              .poll(async () =>
                (await observations(cdp)).some((item) => {
                  if (item.event !== 'key') return false
                  const value = z
                    .object({ key: z.string(), heading: z.number(), state: z.string() })
                    .parse(item.value)
                  return value.key === key && value.heading === heading && value.state === 'move'
                }),
              )
              .toBe(true)
          }
        }
        if (scenario === 'victory-near-end' || scenario === 'defeat-near-end') {
          // Wait for the authored callback instead of disposing immediately after scheduling.
          const fired = z
            .object({
              delay: z.literal(3000),
              callback: z.literal('bye'),
              elapsedSeconds: z.number(),
            })
            .parse((await waitForObservation(cdp, 'timer-fired')).value)
          expect(fired.elapsedSeconds).toBeGreaterThanOrEqual(3)
          await waitForObservation(cdp, 'natural-close')
          await expect
            .poll(() => evaluate(cdp, `globalThis.providerProbe.read('audio').status`))
            .toBe('completed')
          const completedEvents = await observations(cdp)
          const byeTimers = completedEvents
            .filter((event) => event.event === 'timer-scheduled' || event.event === 'timer-fired')
            .map((event) => ({
              event: event.event,
              value: z
                .object({
                  delay: z.number(),
                  callback: z.string(),
                  scheduledClock: z.number(),
                  elapsedSeconds: z.number().optional(),
                })
                .parse(event.value),
            }))
            .filter(({ value }) => value.delay === 3000 && value.callback === 'bye')
          const scheduledBye = byeTimers.filter((event) => event.event === 'timer-scheduled')
          const firedBye = byeTimers.filter((event) => event.event === 'timer-fired')
          expect(scheduledBye).toHaveLength(1)
          expect(firedBye).toHaveLength(1)
          const scheduled = scheduledBye[0]
          const completed = firedBye[0]
          if (!scheduled || !completed) throw new Error('Missing authored bye timer observation')
          expect(completed.value.scheduledClock).toBe(scheduled.value.scheduledClock)
          expect(completed.value.elapsedSeconds).toBeGreaterThanOrEqual(3)
          expect(completedEvents.filter((event) => event.event === 'natural-close')).toHaveLength(1)
        }
      }
      expect(await evaluate(cdp, `globalThis.providerProbe.read('audio').status`)).not.toBe(
        'failed',
      )
      expect(browserErrors).toEqual([])
    } catch (error) {
      primary = error
    }
    try {
      await attachAndDispose(page, cdp, info)
    } catch (error) {
      primary =
        primary === undefined
          ? error
          : new AggregateError([primary, error], 'Game primary/evidence/cleanup failure')
    }
    if (primary !== undefined) throw primary
  })
}
