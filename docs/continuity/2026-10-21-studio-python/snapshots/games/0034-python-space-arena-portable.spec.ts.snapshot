import { type CDPSession, expect, test } from '@playwright/test'
import { z } from 'zod'
import { decodeGameObservations } from '../../../experiments/studio-python-runtime/qualification/game_observations'
import {
  prepareSpaceQualification,
  prepareSpaceScenario,
  spaceScenarios,
} from '../../../experiments/studio-python-runtime/qualification/space_arena'

test.use({
  trace: 'off',
  launchOptions: {
    ignoreDefaultArgs: ['--mute-audio', '--autoplay-policy=no-user-gesture-required'],
  },
})
async function read(cdp: CDPSession) {
  const response = await cdp.send('Runtime.evaluate', {
    expression: "globalThis.providerProbe.read('audio')",
    returnByValue: true,
    awaitPromise: true,
    userGesture: false,
  })
  if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails))
  return z
    .object({
      status: z.string(),
      error: z.string().optional(),
      events: z.array(
        z.object({
          type: z.string(),
          sequence: z.number(),
          text: z.string().optional(),
          omittedChars: z.number().optional(),
          omittedLines: z.number().optional(),
        }),
      ),
    })
    .parse(response.result.value)
}

for (const scenario of spaceScenarios) {
  test(`portable Space Arena instrumented ${scenario} preserves authored rules`, async ({
    page,
    request,
  }, info) => {
    const baseline = await prepareSpaceQualification(request)
    const fixture = await prepareSpaceScenario(baseline.project, scenario)
    await info.attach('space-source-identity', {
      body: JSON.stringify({ baseline: baseline.evidence, fixture: fixture.evidence }),
      contentType: 'application/json',
    })
    await page.route('**/project/spaceArenaPortable', (route) =>
      route.fulfill({ json: fixture.project }),
    )
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(String(error)))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    await page.goto('/provider')
    const cdp = await page.context().newCDPSession(page)
    let primary: unknown
    try {
      await expect
        .poll(async () => {
          const readiness = await cdp.send('Runtime.evaluate', {
            expression: '!!globalThis.providerProbe',
            returnByValue: true,
            userGesture: false,
          })
          if (readiness.exceptionDetails)
            throw new Error(JSON.stringify(readiness.exceptionDetails))
          return readiness.result.value
        })
        .toBe(true)
      const prepared = await cdp.send('Runtime.evaluate', {
        expression: "globalThis.providerProbe.prepare('audio','spaceArenaPortable')",
        awaitPromise: true,
        returnByValue: true,
        userGesture: false,
      })
      expect(prepared.exceptionDetails).toBeUndefined()
      expect((await read(cdp)).status).toBe('ready')
      await page.locator('iframe').evaluate((frame) => {
        frame.style.cssText = 'width:1100px;height:900px;border:0'
      })
      await page.getByRole('button', { name: 'Jogar', exact: true }).click()
      await expect
        .poll(async () => {
          const result = await read(cdp)
          if (result.status === 'failed') throw new Error(JSON.stringify(result))
          return result.status
        })
        .toBe('completed')
      const result = await read(cdp)
      const consoleEvents = result.events.filter((event) => event.type === 'console')
      expect(
        consoleEvents.every((event) => event.omittedChars === 0 && event.omittedLines === 0),
      ).toBe(true)
      expect(result.events.length).toBeLessThan(2048)
      expect(
        result.events.every(
          (event, index) =>
            index === 0 || event.sequence === result.events[index - 1]!.sequence + 1,
        ),
      ).toBe(true)
      const observations = decodeGameObservations(
        consoleEvents.map((event) => event.text ?? '').join(''),
        '__SZ_SPACE_QA__',
      ).map((value) => z.object({ kind: z.string() }).passthrough().parse(value))
      expect(observations.filter((event) => event.kind === 'complete')).toHaveLength(1)
      expect(observations.filter((event) => event.kind === 'installed')).toHaveLength(1)
      expect(observations.some((event) => event.kind === 'rendered-frame')).toBe(true)
      expect(errors).toEqual([])
    } catch (error) {
      primary = error
    }
    try {
      await info.attach('space-final-state', {
        body: JSON.stringify(await read(cdp)),
        contentType: 'application/json',
      })
    } catch (error) {
      primary =
        primary === undefined
          ? error
          : new AggregateError([primary, error], 'Primary/evidence failure')
    }
    try {
      const disposed = await cdp.send('Runtime.evaluate', {
        expression: "globalThis.providerProbe.dispose('audio')",
        awaitPromise: true,
        userGesture: false,
      })
      if (disposed.exceptionDetails) throw new Error(JSON.stringify(disposed.exceptionDetails))
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
        primary === undefined
          ? error
          : new AggregateError([primary, error], 'Primary/CDP detach failure')
    }
    if (primary !== undefined) throw primary
  })
}
