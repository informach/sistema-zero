import { expect, type Page, test } from '@playwright/test'
import type {} from '../../../experiments/studio-python-runtime/providerHost'

async function run(page: Page, fixture: string) {
  await page.goto('/provider')
  await page.waitForFunction(() => !!globalThis.providerProbe)
  await page.evaluate((name) => globalThis.providerProbe.prepare('game', name), fixture)
  const ready = await page.evaluate(() => globalThis.providerProbe.read('game'))
  expect(ready.status, JSON.stringify(ready)).toBe('ready')
  await page.locator('iframe').evaluate((frame) => {
    frame.style.cssText = 'width:1100px;height:900px;border:0'
  })
  await page.evaluate(() => globalThis.providerProbe.run('game'))
}
test.beforeEach(async ({ request }, testInfo) => {
  await testInfo.attach('distribution', {
    body: await (await request.get('/distribution')).body(),
    contentType: 'application/json',
  })
})

test('upstream os.system returns failure without raising; absence of an exception does not certify audio', async ({
  page,
}, testInfo) => {
  await run(page, 'osSystem')
  await page.waitForFunction(() =>
    ['completed', 'failed'].includes(globalThis.providerProbe.read('game').status),
  )
  const state = await page.evaluate(() => globalThis.providerProbe.read('game'))
  await testInfo.attach('os-system-result', {
    body: JSON.stringify(state, null, 2),
    contentType: 'application/json',
  })
  expect(state.status, JSON.stringify(state)).toBe('completed')
  const stdout = state.events
    .flatMap((event) => (event.type === 'console' ? [event.text] : []))
    .join('')
  expect(stdout).toBe('os-system result -1\n')
  await page.evaluate(() => globalThis.providerProbe.dispose('game'))
})

test('Pac-Man original reaches its real scene; this smoke test does not qualify its unavailable OS audio', async ({
  page,
}, testInfo) => {
  await run(page, 'pacmanOriginal')
  const frame = page.frames().find((frame) => frame.url().includes('/frame.html'))!
  await frame.waitForFunction(() => {
    const canvas = document.querySelector('canvas')
    if (canvas?.width !== 1010 || canvas.height !== 860) return false
    const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
    let colored = 0
    for (let i = 0; i < data.length; i += 4)
      if (data[i]! > 0 || data[i + 1]! > 0 || data[i + 2]! > 0) colored++
    return data[0] === 0 && data[1] === 0 && data[2] === 0 && colored > 5000
  })
  const state = await page.evaluate(() => globalThis.providerProbe.read('game'))
  expect(state.status, JSON.stringify(state)).toBe('running')
  await testInfo.attach('original-pacman-scene', {
    body: await frame.locator('canvas').screenshot(),
    contentType: 'image/png',
  })
  await page.evaluate(() => globalThis.providerProbe.stop('game'))
  expect((await page.evaluate(() => globalThis.providerProbe.read('game'))).status).toBe('stopped')
  await page.evaluate(() => globalThis.providerProbe.dispose('game'))
})

test('Space Arena original reports its CPython 3.14 float randint incompatibility', async ({
  page,
}, testInfo) => {
  await run(page, 'spaceArenaOriginal')
  await page.waitForFunction(() => globalThis.providerProbe.read('game').status === 'failed')
  const state = await page.evaluate(() => globalThis.providerProbe.read('game'))
  const diagnostics = state.events.filter((event) => event.type === 'diagnostic')
  await testInfo.attach('original-diagnostic', {
    body: JSON.stringify(state, null, 2),
    contentType: 'application/json',
  })
  expect(diagnostics).toHaveLength(1)
  expect(diagnostics[0]!.traceback).toContain('random.randint(-game.width/2.0, game.width/2.0)')
  expect(diagnostics[0]!.traceback).toContain("'float' object cannot be interpreted as an integer")
  await page.evaluate(() => globalThis.providerProbe.dispose('game'))
})
