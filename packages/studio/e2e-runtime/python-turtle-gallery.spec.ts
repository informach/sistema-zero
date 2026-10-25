import { expect, test } from '@playwright/test'
import type {} from '../../../experiments/studio-python-runtime/providerHost'
import { PYTHON_EXAMPLE_SUMMARIES } from '../src/examples/pythonCatalog'
import { pythonFilesToTree } from '../src/state/pythonProjectValidation'

const examples = PYTHON_EXAMPLE_SUMMARIES.filter(
  (entry) => entry.kind === 'pro' && entry.extensions.some(({ id }) => id === 'python-turtle'),
)

for (const example of examples)
  test(`Turtle gallery: ${example.key} draws, takes input and stops`, async ({
    page,
    request,
  }, testInfo) => {
    const project = await (await request.get('/project/turtleDrawing')).json()
    const payload = await example.load()
    project.python.entrypoint = payload.entrypoint
    project.tree = pythonFilesToTree(payload.files)
    project.assets = [...(payload.assets ?? [])]
    await page.route('**/project/turtleDrawing', (route) => route.fulfill({ json: project }))
    await page.goto('/provider')
    await page.waitForFunction(() => !!globalThis.providerProbe)
    await page.evaluate(() => globalThis.providerProbe.prepare('game', 'turtleDrawing'))
    expect((await page.evaluate(() => globalThis.providerProbe.read('game'))).status).toBe('ready')
    await page.evaluate(() => globalThis.providerProbe.run('game'))
    const frame = page.frames().find((candidate) => candidate.url().includes('/frame.html'))!
    const canvas = frame.locator('canvas')
    await expect(canvas).toHaveCount(1)
    await expect
      .poll(() =>
        canvas.evaluate((node: HTMLCanvasElement) => {
          const pixels = node.getContext('2d')!.getImageData(0, 0, node.width, node.height).data
          const colors = new Set<number>()
          for (let index = 0; index < pixels.length; index += 4 * 31)
            colors.add((pixels[index]! << 16) | (pixels[index + 1]! << 8) | pixels[index + 2]!)
          return colors.size
        }),
      )
      .toBeGreaterThan(3)
    await canvas.press('1')
    await canvas.press('Space')
    await canvas.press('ArrowRight')
    await canvas.press('r')
    await testInfo.attach('scene', {
      body: await canvas.screenshot({ path: testInfo.outputPath('scene.png') }),
      contentType: 'image/png',
    })
    const state = await page.evaluate(() => globalThis.providerProbe.read('game'))
    expect(
      state.events.filter((event) => event.type === 'diagnostic'),
      JSON.stringify(state),
    ).toEqual([])
    expect(state.status).toBe('running')
    await page.evaluate(() => globalThis.providerProbe.stop('game'))
    expect((await page.evaluate(() => globalThis.providerProbe.read('game'))).status).toBe(
      'stopped',
    )
    await page.evaluate(() => globalThis.providerProbe.dispose('game'))
  })
