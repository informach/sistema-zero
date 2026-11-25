import { expect, test } from '@playwright/test'
import type {} from '../../../experiments/studio-python-runtime/providerHost'

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
