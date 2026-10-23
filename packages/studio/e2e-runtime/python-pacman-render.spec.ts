import { type CDPSession, expect, test } from '@playwright/test'
import { z } from 'zod'
import { decodeGameObservations } from '../../../experiments/studio-python-runtime/qualification/game_observations'
import {
  preparePacmanQualification,
  preparePacmanScenario,
} from '../../../experiments/studio-python-runtime/qualification/pacman'

test.use({
  trace: 'off',
  launchOptions: {
    ignoreDefaultArgs: ['--mute-audio', '--autoplay-policy=no-user-gesture-required'],
  },
})
async function evaluate(cdp: CDPSession, expression: string): Promise<unknown> {
  const response = await cdp.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
    userGesture: false,
  })
  if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails))
  return response.result.value
}
const Console = z.object({
  status: z.string(),
  events: z.array(
    z.object({
      type: z.string(),
      text: z.string().optional(),
      omittedChars: z.number().optional(),
      omittedLines: z.number().optional(),
    }),
  ),
})
async function observations(cdp: CDPSession) {
  const result = Console.parse(await evaluate(cdp, "globalThis.providerProbe.read('audio')"))
  if (result.status === 'failed') throw new Error(JSON.stringify(result))
  const output = result.events.filter((event) => event.type === 'console')
  expect(output.every((event) => event.omittedChars === 0 && event.omittedLines === 0)).toBe(true)
  return decodeGameObservations(
    output.map((event) => event.text ?? '').join(''),
    '__SZ_PACMAN_QA__',
  ).map((value) =>
    z.object({ event: z.string(), tick: z.number(), value: z.unknown() }).parse(value),
  )
}

test('portable Pac-Man raster keeps logical dimensions through wide and narrow consultation', async ({
  page,
  request,
}, info) => {
  const baseline = await preparePacmanQualification(request, process.env.SZ_PACMAN_QA_DISTRIBUTION)
  const fixture = await preparePacmanScenario(baseline.project, 'observe') // No position/state injection.
  await info.attach('render-source-identity', {
    body: JSON.stringify({ baseline: baseline.evidence, fixture: fixture.evidence }),
    contentType: 'application/json',
  })
  await page.route('**/project/pacmanPortable', (route) => route.fulfill({ json: fixture.project }))
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(String(error)))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.setViewportSize({ width: 1280, height: 1000 })
  await page.goto('/provider')
  const cdp = await page.context().newCDPSession(page)
  let primary: unknown
  try {
    await expect.poll(() => evaluate(cdp, '!!globalThis.providerProbe')).toBe(true)
    await evaluate(cdp, "globalThis.providerProbe.prepare('audio','pacmanPortable')")
    await evaluate(
      cdp,
      "document.body.style.margin='0';document.querySelector('iframe').style.cssText='display:block;width:100%;height:900px;border:0'",
    )
    await page.getByRole('button', { name: 'Jogar', exact: true }).click()
    await expect
      .poll(async () =>
        (await observations(cdp)).some((event) => event.event === 'after' && event.tick === 200),
      )
      .toBe(true)
    const frame = page.frames().find((item) => item.url().includes('/frame.html'))
    if (!frame) throw new Error('Missing protected Pac-Man frame')
    const samples = []
    for (const viewport of [
      { width: 1280, height: 1000 },
      { width: 480, height: 900 },
    ]) {
      await page.setViewportSize(viewport)
      const canvas = frame.locator('canvas')
      await expect
        .poll(() => canvas.evaluate((element) => element.getBoundingClientRect().width))
        .toBeLessThanOrEqual(viewport.width)
      const sample = await canvas.evaluate((element) => {
        const canvas = element as HTMLCanvasElement
        const bounds = canvas.getBoundingClientRect()
        const context = canvas.getContext('2d')
        if (!context) throw new Error('No actual raster context')
        const bytes = context.getImageData(0, 0, canvas.width, canvas.height).data
        let colored = 0
        let opaqueBlack = 0
        for (let index = 0; index < bytes.length; index += 4) {
          if (bytes[index + 3] !== 255) continue
          if (bytes[index] || bytes[index + 1] || bytes[index + 2]) colored++
          else opaqueBlack++
        }
        return {
          width: canvas.width,
          height: canvas.height,
          cssWidth: bounds.width,
          cssHeight: bounds.height,
          colored,
          opaqueBlack,
          firstPixel: Array.from(bytes.slice(0, 4)),
        }
      })
      expect([sample.width, sample.height]).toEqual([1010, 860])
      expect(sample.cssWidth).toBeGreaterThan(0)
      expect(sample.cssHeight).toBeGreaterThan(0)
      expect(sample.cssWidth / sample.cssHeight).toBeCloseTo(1010 / 860, 2)
      expect(sample.firstPixel).toEqual([0, 0, 0, 255])
      expect(sample.opaqueBlack).toBeGreaterThan(5000)
      expect(sample.colored).toBeGreaterThan(5000)
      samples.push({ viewport, sample })
      await info.attach(`pacman-${viewport.width}-raster`, {
        body: await canvas.screenshot(),
        contentType: 'image/png',
      })
    }
    expect(samples[1]!.sample.cssWidth).toBeLessThan(samples[0]!.sample.cssWidth)
    // Real keyboard delivery still reaches the unchanged logical game at the narrow size.
    await frame.locator('canvas').press('ArrowUp')
    await expect
      .poll(async () =>
        (await observations(cdp)).some(
          (event) =>
            event.event === 'key' &&
            z.object({ key: z.string(), heading: z.number(), state: z.string() }).parse(event.value)
              .key === 'Up',
        ),
      )
      .toBe(true)
    const key = (await observations(cdp)).find((event) => event.event === 'key')
    expect(
      z
        .object({ key: z.literal('Up'), heading: z.literal(90), state: z.literal('move') })
        .parse(key?.value),
    ).toBeDefined()
    await info.attach('render-viewport-witnesses', {
      body: JSON.stringify({
        samples,
        scope:
          'Real raster and CSS geometry, no golden-image/all-GIF/mobile-device or full-game claim',
      }),
      contentType: 'application/json',
    })
    expect(errors).toEqual([])
  } catch (error) {
    primary = error
  }
  try {
    await info.attach('render-final-state', {
      body: JSON.stringify(await evaluate(cdp, "globalThis.providerProbe.read('audio')")),
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
