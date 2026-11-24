import { expect, test } from '@playwright/test'
import type {} from '../../../experiments/studio-python-runtime/providerHost'

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
