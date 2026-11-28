import { expect, test } from '@playwright/test'
import type {} from '../../../experiments/studio-python-runtime/providerHost'

for (const projection of ['hexagonal', 'isometric'] as const) {
  test(`the real Pinta play button creates a ${projection} game and runs its PNG6`, async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    const namespace = `lg05-button-${projection}-${Date.now()}`
    await page.goto('/provider')
    await page.waitForFunction(() => !!globalThis.providerProbe)
    const { name } = await page.evaluate(
      ({ namespace, projection }) =>
        globalThis.providerProbe.showPintaPlayButton(namespace, projection),
      { namespace, projection },
    )
    await page.getByRole('button', { name: `Abrir ${name} (Mapa)`, exact: true }).click()
    await expect(page.locator(`[data-projected-map-editor="${projection}"]`)).toBeVisible()
    await page.getByRole('button', { name: 'Jogar meu mapa', exact: true }).click()
    const result: {
      value: Awaited<ReturnType<typeof globalThis.providerProbe.readPintaPlayButton>>
    } = { value: null }
    await expect
      .poll(async () => {
        result.value = await page.evaluate(
          (namespace) => globalThis.providerProbe.readPintaPlayButton(namespace),
          namespace,
        )
        return result.value?.projectId
      })
      .toBeTruthy()
    expect(result.value?.dataVersion).toBe(6)
    expect(result.value?.projection).toBe(projection)
    expect(result.value?.navigation).toBe(`/estudio?projeto=${result.value?.projectId}`)
    const canvas = page
      .frameLocator('iframe[title="Projeto regional público"]')
      .locator('canvas')
      .first()
    await expect(canvas).toBeVisible()
    await expect
      .poll(async () =>
        canvas.evaluate((element) => {
          const canvas = element as HTMLCanvasElement
          const pixels = canvas
            .getContext('2d')!
            .getImageData(0, 0, canvas.width, canvas.height).data
          const colors = new Set<number>()
          for (let index = 0; index < pixels.length; index += 4)
            colors.add((pixels[index]! << 16) | (pixels[index + 1]! << 8) | pixels[index + 2]!)
          return colors.size
        }),
      )
      .toBeGreaterThan(2)
    expect(errors).toEqual([])
  })
}

test('the real Pinta play button creates a complete regional game on first use', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const namespace = `lg04-public-button-${Date.now()}`
  await page.goto('/provider')
  await page.waitForFunction(() => !!globalThis.providerProbe)
  const { name } = await page.evaluate(
    (namespace) => globalThis.providerProbe.showPintaPlayButton(namespace),
    namespace,
  )
  await page.getByRole('button', { name: `Abrir ${name} (Mapa)`, exact: true }).click()
  const grid = page.getByRole('img', { name: 'Grade do mapa', exact: true })
  await expect(grid).toBeVisible()
  const canvas = await grid.evaluate((element) => ({
    width: (element as HTMLCanvasElement).width,
    height: (element as HTMLCanvasElement).height,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
  }))
  expect(canvas.width).toBeGreaterThan(0)
  expect(canvas.height).toBeGreaterThan(0)
  expect(canvas.width).toBeLessThanOrEqual(canvas.screenWidth)
  expect(canvas.height).toBeLessThanOrEqual(canvas.screenHeight)
  await page.getByRole('button', { name: 'Jogar meu mapa', exact: true }).click()
  const observed: {
    result: Awaited<ReturnType<typeof globalThis.providerProbe.readPintaPlayButton>>
  } = { result: null }
  await expect
    .poll(async () => {
      observed.result = await page.evaluate(
        (namespace) => globalThis.providerProbe.readPintaPlayButton(namespace),
        namespace,
      )
      return observed.result?.projectId
    })
    .toBeTruthy()
  expect(observed.result?.maps).toBeGreaterThanOrEqual(2)
  expect(observed.result?.navigation).toBe(`/estudio?projeto=${observed.result?.projectId}`)
  expect(observed.result?.layers).toBeGreaterThanOrEqual(16)
  await expect(
    page.frameLocator('iframe[title="Projeto regional público"]').locator('canvas').first(),
  ).toBeVisible()
  expect(errors).toEqual([])
})

test('native8 public gallery exports the complete world, creates editable blocks and reopens the same PNG5', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const namespace = `lg04-public-${Date.now()}`
  await page.goto('/provider')
  await page.waitForFunction(() => !!globalThis.providerProbe)
  const first = await page.evaluate(
    (namespace) => globalThis.providerProbe.showPintaPublicBridge(namespace),
    namespace,
  )
  expect(first.origin).toEqual({ col: -64, row: -64 })
  expect(first.maps).toBeGreaterThanOrEqual(2)
  expect(first.layers).toBeGreaterThanOrEqual(16)
  expect(first.blocksState).toBeDefined()
  await expect(
    page.frameLocator('iframe[title="Projeto regional público"]').locator('canvas').first(),
  ).toBeVisible()
  await page.reload()
  await page.waitForFunction(() => !!globalThis.providerProbe)
  const reopened = await page.evaluate(
    ({ namespace, projectId }) =>
      globalThis.providerProbe.showPintaPublicBridge(namespace, projectId),
    { namespace, projectId: first.projectId },
  )
  expect(reopened).toEqual(first)
  await expect(
    page.frameLocator('iframe[title="Projeto regional público"]').locator('canvas').first(),
  ).toBeVisible()
  expect(errors).toEqual([])
})
