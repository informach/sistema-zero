import { expect, type Page, test } from '@playwright/test'
import type {} from '../../../experiments/studio-python-runtime/analysisHost'
import type {} from '../../../experiments/studio-python-runtime/providerHost'

async function isolatedHost(page: Page, pathname: string) {
  // The anonymous frame reaches a loopback QA service. Grant the browser's local
  // network permission explicitly; deployed runtimes use public HTTPS origins.
  await page.context().grantPermissions(['local-network-access'])
  page.on('requestfailed', (request) => {
    console.info(
      JSON.stringify({
        event: 'isolated-host-request-failed',
        path: new URL(request.url()).pathname,
        reason: request.failure()?.errorText,
      }),
    )
  })
  await page.route(`**${pathname}`, async (route) => {
    const response = await route.fetch()
    await route.fulfill({
      response,
      headers: {
        ...response.headers(),
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'credentialless',
      },
    })
  })
  await page.goto(pathname)
}

async function seedRuntimeCookie(page: Page) {
  const configuration = await (await page.request.get('/configuration')).json()
  const runtime = new URL(configuration.providerFrameURL)
  await page
    .context()
    .addCookies([{ name: 'ambient-runtime-proof', value: 'must-not-be-sent', url: runtime.origin }])
  expect(
    (await page.context().cookies(runtime.origin)).some(
      (cookie) => cookie.name === 'ambient-runtime-proof',
    ),
  ).toBe(true)
  await page.context().request.get(new URL('/cookie-control', runtime.origin).href)
  const control = await (await page.request.get('/runtime-privacy')).json()
  expect(control.requests).toContainEqual({ path: '/cookie-control', hasCookie: true })
  expect((await page.request.post('/runtime-privacy')).ok()).toBe(true)
}

async function expectAnonymousRequests(page: Page, entrypoint: 'frame.html' | 'analysis.html') {
  const observed = await (await page.request.get('/runtime-privacy')).json()
  expect(observed.overflow).toBe(false)
  expect(observed.requests.length).toBeGreaterThan(0)
  expect(
    observed.requests.some((request: { path: string }) => request.path.endsWith(`/${entrypoint}`)),
  ).toBe(true)
  expect(observed.requests.every((request: { hasCookie: boolean }) => !request.hasCookie)).toBe(
    true,
  )
}

for (const fixture of ['turtleDrawing', 'classic-turtleDrawing'])
  test(`${fixture}: real Python frame runs under the Pro host embedder policy`, async ({
    page,
    request,
  }, testInfo) => {
    await testInfo.attach('runtime-distribution', {
      body: await (await request.get('/distribution')).body(),
      contentType: 'application/json',
    })
    await seedRuntimeCookie(page)
    await isolatedHost(page, '/provider')
    await page.waitForFunction(() => !!globalThis.providerProbe)
    try {
      await page.evaluate((fixture) => providerProbe.prepare('isolated', fixture), fixture)
      expect(await page.evaluate(() => providerProbe.read('isolated').status)).toBe('ready')
      const frame = page.locator('iframe')
      await expect(frame).toHaveAttribute('credentialless', '')
      expect(await frame.getAttribute('sandbox')).not.toContain('allow-same-origin')
      await page.evaluate(() => providerProbe.run('isolated'))
      await page.waitForFunction(() =>
        providerProbe
          .read('isolated')
          .events.some((event) => event.type === 'console' && event.text.includes('drawing-ready')),
      )
      const capture = await page.evaluate(() => providerProbe.capture('isolated'))
      expect(capture).toMatchObject({ width: 400, height: 300 })
      expect(capture?.dataUrl).toMatch(/^data:image\/png;base64,/)
      await expectAnonymousRequests(page, 'frame.html')
      await page.evaluate(() => providerProbe.stop('isolated'))
      expect(await page.evaluate(() => providerProbe.read('isolated').status)).toBe('stopped')
    } finally {
      await page.evaluate(() => providerProbe.dispose('isolated'))
    }
    await expect(page.locator('iframe')).toHaveCount(0)
  })

test('real Python analysis frame parses under the Pro host embedder policy without executing source', async ({
  page,
}) => {
  await seedRuntimeCookie(page)
  await isolatedHost(page, '/analysis')
  await page.waitForFunction(() => !!globalThis.analysisProbe)
  try {
    await page.evaluate(() => analysisProbe.start())
    await expect(page.locator('iframe')).toHaveAttribute('credentialless', '')
    expect(await page.locator('iframe').getAttribute('sandbox')).not.toContain('allow-same-origin')
    const source = 'raise RuntimeError("must not execute")\nclass Jogo:\n    pontos = 42\n'
    const result = await page.evaluate((source) => analysisProbe.parse(source), source)
    expect(result.source).toBe(source)
    expect(result.tree?.kind).toBe('Module')
    expect(result.diagnostics).toEqual([])
    await expectAnonymousRequests(page, 'analysis.html')
  } finally {
    await page.evaluate(() => analysisProbe.dispose())
  }
  await expect(page.locator('iframe')).toHaveCount(0)
})
