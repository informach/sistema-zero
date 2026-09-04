import { expect, test } from '@playwright/test'

const SKY = {
  kind: 'sky' as const,
  id: 'e2e-sky',
  name: 'e2e-sky',
  createdAt: 1,
  updatedAt: 1,
  params: {
    preset: 'noite' as const,
    sunElevation: -30,
    sunAzimuth: 180,
    sunSize: 2,
    sunIntensity: 1,
    topColor: '#07152f',
    horizonColor: '#18294a',
    groundColor: '#05070d',
    clouds: { amount: 0.2, softness: 0.5, seed: 42 },
    stars: 0.8,
    exposure: 1,
  },
}

test('a prévia do céu recria o ambiente PMREM depois de perder o contexto', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(async (asset) => window.__molda?.persistence.save(asset), SKY)
  await page.goto('/?criacao=e2e-sky')

  const canvas = page.locator('canvas[aria-label="Prévia do céu"]')
  await expect(canvas).toBeVisible()
  await expect.poll(() => page.evaluate(() => window.__molda?.skyEnvironmentId())).not.toBeNull()
  const before = await page.evaluate(() => window.__molda?.skyEnvironmentId())

  const supported = await canvas.evaluate(async (element) => {
    const gl = element.getContext('webgl2')
    const extension = gl?.getExtension('WEBGL_lose_context')
    if (!extension) return false
    Reflect.set(element, '__moldaLossExtension', extension)
    await new Promise<void>((resolve) => {
      element.addEventListener('webglcontextlost', () => resolve(), { once: true })
      extension.loseContext()
    })
    return true
  })
  expect(supported).toBe(true)
  await canvas.evaluate(async (element) => {
    const extension = Reflect.get(element, '__moldaLossExtension')
    const restore =
      typeof extension === 'object' && extension !== null
        ? Reflect.get(extension, 'restoreContext')
        : null
    if (typeof restore !== 'function') throw new Error('WEBGL_lose_context sumiu durante o teste')
    await new Promise<void>((resolve) => {
      element.addEventListener('webglcontextrestored', () => resolve(), { once: true })
      restore.call(extension)
    })
  })
  await expect.poll(() => page.evaluate(() => window.__molda?.skyEnvironmentId())).not.toBe(before)
})

test('a prévia 3D repete a textura três vezes nos dois eixos', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(async () => {
    await window.__molda?.persistence.save({
      kind: 'texture',
      id: 'e2e-texture',
      name: 'e2e-texture',
      createdAt: 1,
      updatedAt: 1,
      paletteId: 'arcade',
      size: 16,
      bitmap: { width: 16, height: 16, data: new Uint8Array(16 * 16).fill(2) },
      seamless: true,
    })
  })
  await page.goto('/?criacao=e2e-texture')

  await expect(page.locator('canvas[aria-label="Prévia 3D"]')).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => window.__molda?.textureWrapping()))
    .toEqual({
      wrapS: 1000,
      wrapT: 1000,
      repeatX: 3,
      repeatY: 3,
    })
})
