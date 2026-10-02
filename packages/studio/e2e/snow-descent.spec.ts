import { expect, test } from '@playwright/test'
import { createEmptyProject } from '../src/core/project'
import { generateProjectFiles } from '../src/generators/project'
import { snowDescentExample } from '../src/official-extensions/game-2d/examples/snowDescent'
import { snowDescentAdvancedExample } from '../src/official-extensions/game-2d-advanced/examples/snowDescent'
import { renderProjectToPreviewDocAsync } from '../src/preview/renderProject'

test.use({ hasTouch: true })

for (const [id, example, apiName] of [
  ['game-2d', snowDescentExample, 'SZGame2D'],
  ['game-2d-advanced', snowDescentAdvancedExample, 'SZGameKit'],
] as const) {
  for (const viewport of [
    { width: 960, height: 800 },
    { width: 390, height: 844 },
  ]) {
    test(`${id}: animated snow, touch and pause at ${viewport.width}px`, async ({ page }, info) => {
      await page.setViewportSize(viewport)
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      page.on('console', (message) => {
        if (['error', 'warning'].includes(message.type())) errors.push(message.text())
      })
      const project = createEmptyProject('snow-browser', example.name)
      project.ir = null
      project.mode = 'bridge'
      project.blocksState = null
      project.assets = example.assets
      project.files = generateProjectFiles({ ir: example.ir, projectName: example.name })
      project.files['script.js'] += `
setInterval(function () { document.body.dataset.snowDistance = String(${apiName}.${id === 'game-2d' ? 'spriteTrackValue' : 'trackPosition'}("pista", "distance")); }, 16);`
      project.installedExtensions = [{ id, version: '1.0.0', installedAt: Date.now() }]
      const srcdoc = await renderProjectToPreviewDocAsync(project)
      await page.goto('/')
      errors.length = 0
      await page.evaluate((source) => {
        document.body.replaceChildren()
        document.body.style.margin = '0'
        const frame = document.createElement('iframe')
        frame.id = 'snow'
        frame.setAttribute('sandbox', 'allow-scripts')
        frame.style.cssText = 'width:100vw;height:100dvh;border:0;display:block'
        frame.srcdoc = source
        document.body.appendChild(frame)
      }, srcdoc)
      const frame = page.frameLocator('#snow')
      const canvas = frame.locator('canvas').first()
      await expect(canvas).toBeVisible()
      const box = await canvas.boundingBox()
      expect(box).not.toBeNull()
      expect(box!.width).toBeLessThanOrEqual(viewport.width + 1)
      expect(box!.height).toBeLessThanOrEqual(viewport.height + 1)
      if (id === 'game-2d-advanced')
        await frame.getByRole('button', { name: 'Descer a montanha', exact: true }).click()
      else await canvas.tap({ position: { x: box!.width / 2, y: box!.height * 0.6 } })
      const body = frame.locator('body')
      const distance = async () => Number(await body.getAttribute('data-snow-distance'))
      await expect.poll(distance).toBeGreaterThan(0)
      const frames = await body.evaluate(async () => {
        const canvas = document.querySelector('canvas')!
        const ctx = canvas.getContext('2d')!
        const draw = ctx.drawImage
        const sourceX = new Set<number>()
        ctx.drawImage = function (
          this: CanvasRenderingContext2D,
          ...args: Parameters<typeof draw>
        ) {
          if (args.length === 9) sourceX.add(Number(args[1]))
          return Reflect.apply(draw, this, args)
        } as typeof draw
        const times: number[] = []
        let previous = performance.now()
        for (let i = 0; i < 45; i++)
          await new Promise<void>((resolve) =>
            requestAnimationFrame((now) => {
              times.push(now - previous)
              previous = now
              resolve()
            }),
          )
        ctx.drawImage = draw
        return { sourceX: [...sourceX], p95: times.sort((a, b) => a - b)[42] }
      })
      expect(frames.sourceX).toEqual(expect.arrayContaining([0, 52]))
      expect(frames.p95).toBeLessThan(100)
      await info.attach('animation-and-frame-time', {
        body: JSON.stringify(frames),
        contentType: 'application/json',
      })
      await canvas.screenshot({ path: info.outputPath('snow-playing.png') })
      await canvas.tap({ position: { x: box!.width * 0.89, y: box!.height * 0.0625 } })
      await expect.poll(() => body.getAttribute('data-snow-distance')).not.toBeNull()
      await body.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      )
      const pausedAt = await distance()
      await body.evaluate(
        () =>
          new Promise<void>((resolve) => {
            let count = 0
            const frame = () => {
              if (++count === 12) resolve()
              else requestAnimationFrame(frame)
            }
            requestAnimationFrame(frame)
          }),
      )
      expect(await distance()).toBe(pausedAt)
      await canvas.screenshot({ path: info.outputPath('snow-paused.png') })
      if (id === 'game-2d-advanced')
        await frame.getByRole('button', { name: 'Continuar', exact: true }).click()
      else await canvas.tap({ position: { x: box!.width / 2, y: box!.height * 0.6 } })
      await expect.poll(distance).toBeGreaterThan(pausedAt)
      if (id === 'game-2d-advanced') {
        await body.evaluate(() =>
          (
            window as unknown as { SZGameKit: { setState(state: string): void } }
          ).SZGameKit.setState('fim'),
        )
        await frame.getByRole('button', { name: 'Tentar de novo', exact: true }).click()
      } else await canvas.press('r')
      await expect.poll(distance).toBeLessThan(pausedAt)
      expect(errors).toEqual([])
    })
  }
}
