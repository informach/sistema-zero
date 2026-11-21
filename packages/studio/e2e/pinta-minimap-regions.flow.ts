import { expect, test } from '@playwright/test'
import { COPY } from '../../pinta/src/core/copy'

test('componente real navega pelo mundo esparso sem criar uma imagem do tamanho do mundo', async ({
  page,
}, info) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const cdp = await page.context().newCDPSession(page),
    rate = Number(info.project.metadata.cpuSlowdown ?? 1)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate })
  await page.goto('/')
  const minimap = page.getByRole('button', { name: COPY.scene.navegarPeloMinimapa }),
    canvas = minimap.locator('canvas'),
    jump = page.locator('[data-jump]'),
    view = page.locator('[data-pin-minimap-view]')
  await expect(canvas).toHaveAttribute('width', '256')
  await expect(canvas).toHaveAttribute('height', '256')
  const pixels = await canvas.evaluate((canvas: HTMLCanvasElement) => {
    const data = canvas.getContext('2d')!.getImageData(0, 0, 256, 256).data,
      colors: string[] = []
    for (let at = 0; at < data.length; at += 4)
      if (data[at + 3]) colors.push(Array.from(data.slice(at, at + 4)).join(','))
    return colors.sort()
  })
  expect(pixels).toEqual(['255,255,255,255', '255,33,33,255'].sort())
  await expect(page.getByText(COPY.scene.budget(2048, 2097152), { exact: false })).toBeVisible()
  const box = await minimap.boundingBox()
  if (!box) throw Error('Minimapa sem geometria')
  const point = {
    x: Math.round(box.x + box.width * 0.75),
    y: Math.round(box.y + box.height * 0.25),
  }
  if (info.project.name === 'touch') await page.touchscreen.tap(point.x, point.y)
  else await page.mouse.click(point.x, point.y)
  const target = JSON.parse((await jump.textContent())!) as [number, number]
  expect(target[0]).toBeCloseTo(-100 + ((point.x - box.x) / box.width) * 10000, 1)
  expect(target[1]).toBeCloseTo(-100 + ((point.y - box.y) / box.height) * 10000, 1)
  await expect
    .poll(() => view.evaluate((e) => parseFloat((e as HTMLElement).style.left)))
    .toBeGreaterThan(70)
  await minimap.focus()
  await minimap.press('Home')
  await expect(jump).toHaveText('[-100,-100]')
  await minimap.press('End')
  await expect(jump).toHaveText('[9899,9899]')
  await expect
    .poll(() => view.evaluate((e) => parseFloat((e as HTMLElement).style.left)))
    .toBeGreaterThan(99)
  const before = await view.getAttribute('style')
  await minimap.press('Enter')
  await expect(view).toHaveAttribute('style', before!)
  await expect(page.locator('[data-unchanged]')).toHaveText('true')
  expect(await minimap.getAttribute('aria-describedby')).toBeTruthy()
  expect(errors).toEqual([])
  await info.attach('perfil', {
    body: JSON.stringify({ cpuSlowdown: rate, canvas: [256, 256], occupiedPixels: pixels.length }),
    contentType: 'application/json',
  })
  await info.attach('minimapa-regioes', { body: await page.screenshot(), contentType: 'image/png' })
  await cdp.detach()
})
