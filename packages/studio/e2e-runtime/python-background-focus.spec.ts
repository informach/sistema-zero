import { expect, test } from '@playwright/test'
import type {} from '../../../experiments/studio-python-runtime/providerHost'
import { requireCleanRuntimeBrowser, requireRetainedHostFocus } from '../e2e/helpers/cleanBrowser'

requireCleanRuntimeBrowser()
requireRetainedHostFocus('Teste do programa')

test.beforeEach(async ({ page, request, browser }, info) => {
  await info.attach('background-runtime', {
    body: JSON.stringify({
      browser: browser.version(),
      distribution: await (await request.get('/distribution')).json(),
    }),
    contentType: 'application/json',
  })
  await page.goto('/provider')
  await page.waitForFunction(() => !!globalThis.pythonControllerProbe)
  await page.evaluate(() => {
    const editor = document.createElement('input')
    editor.id = 'background-host-editor'
    editor.value = 'Meu programa'
    document.body.append(editor)
    editor.focus()
  })
})

for (const fixture of ['pinta-world-1x', 'turtleDrawing', 'raylibGame'])
  test(`${fixture}: a background renderer paints while the host retains the keyboard`, async ({
    page,
  }) => {
    await page.evaluate(async (fixture) => {
      const pending = globalThis.providerProbe.prepare('background', fixture, false, true)
      const frame = document.querySelector('iframe')
      if (!frame) throw new Error('The real provider did not mount its frame')
      const holder = document.createElement('div')
      holder.setAttribute('inert', '')
      holder.setAttribute('aria-hidden', 'true')
      holder.style.cssText =
        'position:fixed;left:0;top:0;width:800px;height:600px;opacity:0;pointer-events:none'
      frame.title = 'Teste do programa'
      frame.tabIndex = -1
      frame.before(holder)
      holder.append(frame)
      frame.style.cssText = 'width:100%;height:100%;border:0'
      await pending
      const prepared = globalThis.providerProbe.read('background')
      if (prepared.status !== 'ready') throw new Error(JSON.stringify(prepared))
      await globalThis.providerProbe.run('background')
    }, fixture)
    try {
      const frame = page.locator('iframe[title="Teste do programa"]')
      await expect(frame).toHaveAttribute('allow', "focus-without-user-activation 'none'")
      const canvas = page
        .frameLocator('iframe[title="Teste do programa"]')
        .locator('canvas')
        .first()
      await canvas.waitFor({ state: 'attached' })
      await expect
        .poll(() => canvas.evaluate((element: HTMLCanvasElement) => element.width))
        .toBeGreaterThan(0)
      const colors = () =>
        page.evaluate(async () => {
          const snapshot = await globalThis.providerProbe.capture('background')
          if (!snapshot) return 0
          const image = new Image()
          image.src = snapshot.dataUrl
          await image.decode()
          const copy = document.createElement('canvas')
          copy.width = image.naturalWidth
          copy.height = image.naturalHeight
          const context = copy.getContext('2d')!
          context.drawImage(image, 0, 0)
          const rgba = context.getImageData(0, 0, copy.width, copy.height).data
          const seen = new Set<number>()
          for (let i = 0; i < rgba.length; i += 4)
            seen.add((rgba[i]! << 16) | (rgba[i + 1]! << 8) | rgba[i + 2]!)
          return seen.size
        })
      await expect
        .poll(colors)
        .toBeGreaterThan(fixture === 'pinta-world-1x' ? 16 : fixture === 'turtleDrawing' ? 1 : 2)
      await expect(page.locator('#background-host-editor')).toBeFocused()
    } finally {
      await page.evaluate(() => globalThis.providerProbe.dispose('background'))
    }
  })

for (const [fixture, key, expected] of [
  ['classic-pgzeroGame', 'Space', 'espaco 1'],
  ['classic-pinta-world-1x', 'Enter', 'world-place'],
] as const)
  test(`${fixture}: the real student-test runner drives the game without taking focus`, async ({
    page,
  }, info) => {
    const outcome = await page.evaluate(
      ({ fixture, key, expected }) =>
        globalThis.pythonControllerProbe.studentTest(fixture, {
          id: 'background-input',
          name: 'O piloto aperta a tecla',
          rule: {
            type: 'behavior',
            steps: [
              { action: 'wait', ms: 1000 },
              { action: 'press', key, holdMs: 150 },
              { action: 'wait', ms: 400 },
            ],
            expect: { target: { kind: 'console' }, compare: 'contains', value: expected },
          },
        }),
      { fixture, key, expected },
    )
    await info.attach('student-test-outcome', {
      body: JSON.stringify(outcome),
      contentType: 'application/json',
    })
    expect(outcome.status, JSON.stringify(outcome)).toBe('passed')
    await expect(page.locator('#background-host-editor')).toBeFocused()
    await expect(page.locator('iframe[title="Teste do programa"]')).toHaveCount(0)
  })
