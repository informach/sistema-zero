import { expect, test } from '@playwright/test'
import type { createResizeScreenHost } from '../../pinta/scripts/homologacao/resizeScreenHost'
import type { runResizeRegionsProbe } from '../../pinta/scripts/resize-regions-probe'
import { pintaAssetFromWire } from '../../pinta/src/assets/wire'
import { COPY } from '../../pinta/src/core/copy'

declare global {
  interface Window {
    resizeQa: Awaited<ReturnType<typeof createResizeScreenHost>>
    runResizeRegionsProbe: typeof runResizeRegionsProbe
    resizeStored: unknown[]
  }
}
for (const version of ['current', 'previous'] as const)
  for (const scenario of ['host-update', 'lesson', 'accepted'] as const) {
    test(`${version}: ${scenario}`, async ({ page, context, isMobile }, info) => {
      test.fail(
        version === 'previous' && scenario === 'lesson',
        'Defeito histórico de recusa da revisão',
      )
      const errors: string[] = [],
        cpu = Number(info.project.metadata.cpuSlowdown ?? 1),
        cdp = await context.newCDPSession(page)
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu })
      page.on('pageerror', (error) => errors.push(error.message))
      await page.goto(`/${version}.html${scenario === 'lesson' ? '?lesson=1' : ''}`)
      await page.waitForFunction(() => window.resizeQa?.ready())
      const press = async (name: string) => {
        const b = page.getByRole('button', { name, exact: true })
        if (isMobile) await b.tap()
        else await b.click()
      }
      const tip = page.getByRole('button', { name: 'Entendi!', exact: true })
      if (await tip.isVisible()) await tip.click()
      const initial = scenario === 'lesson' ? 4 : 32
      await press(COPY.editor.resize.button(initial, initial))
      await page
        .getByLabel(COPY.newAsset.customSize.width, { exact: true })
        .fill(scenario === 'lesson' ? '129' : '64')
      if (scenario === 'host-update')
        await page
          .getByRole('button', { name: COPY.editor.resize.apply, exact: true })
          .evaluate((element) =>
            element.addEventListener('click', () => window.resizeQa.adopt(), {
              capture: true,
              once: true,
            }),
          )
      try {
        await press(COPY.editor.resize.apply)
        const state = await page.evaluate(() => window.resizeQa.snapshot()),
          asset = pintaAssetFromWire(state.asset)
        await info.attach('tamanho', {
          body: JSON.stringify({ version, scenario, cpu, state, errors }),
          contentType: 'application/json',
        })
        if (scenario !== 'lesson') {
          const color = scenario === 'host-update' ? 3 : 1
          if (asset?.kind !== 'pixel-background') throw Error('Arte ausente')
          if (scenario === 'host-update') expect(asset.name).toBe('qa-adotado')
          expect(asset.cels[0]!.width).toBe(64)
          expect(asset.cels[0]!.data[16]).toBe(color)
          expect(state.canUndo).toBe(true)
          await press(COPY.editor.undo)
          const restored = pintaAssetFromWire(
            (await page.evaluate(() => window.resizeQa.snapshot())).asset,
          )
          if (restored?.kind !== 'pixel-background') throw Error('Arte ausente')
          expect(restored.cels[0]!.width).toBe(32)
          expect(restored.cels[0]!.data[0]).toBe(color)
          await press(COPY.editor.redo)
          expect(await page.evaluate(() => window.resizeQa.flush())).toEqual({ ok: true })
          const namespace = await page.evaluate(() => window.resizeQa.namespace),
            reopened = await context.newPage()
          await reopened.goto(`/current.html?read=${encodeURIComponent(namespace)}`)
          await reopened.waitForFunction(() => !!window.resizeStored)
          const stored = (await reopened.evaluate(() => window.resizeStored))
            .map(pintaAssetFromWire)
            .find((a) => a?.kind === 'pixel-background')
          if (stored?.kind !== 'pixel-background') throw Error('Arte salva ausente')
          expect(stored.cels[0]!.width).toBe(64)
          expect(stored.cels[0]!.data[16]).toBe(color)
          await reopened.close()
        } else {
          expect(await page.getByRole('dialog', { name: COPY.editor.resize.title }).count()).toBe(1)
          expect(state.canUndo).toBe(false)
          if (asset?.kind !== 'tilemap') throw Error('Mapa ausente')
          expect(asset.cols).toBe(4)
          await expect(page.getByText(COPY.editor.resize.refused, { exact: true })).toBeVisible()
          expect(await page.getByText(COPY.editor.resize.done, { exact: true }).count()).toBe(0)
        }
        expect(errors).toEqual([])
      } finally {
        await page.evaluate(() => window.resizeQa.flush())
        await cdp.detach()
      }
    })
  }

test('regiões: limites, geometria e resultados densos conservados', async ({
  page,
  context,
}, info) => {
  const cpu = Number(info.project.metadata.cpuSlowdown ?? 1),
    cdp = await context.newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu })
  await page.goto('/previous.html')
  await page.waitForFunction(() => !!window.runResizeRegionsProbe)
  const before = await page.evaluate(() => window.runResizeRegionsProbe())
  await page.goto('/current.html')
  await page.waitForFunction(() => !!window.runResizeRegionsProbe)
  const after = await page.evaluate(() => window.runResizeRegionsProbe())
  await info.attach('regioes', {
    body: JSON.stringify({ cpu, before, after, public8: false }),
    contentType: 'application/json',
  })
  expect(before.regions).toEqual({
    target: 256,
    growShared: false,
    growOrigin: { col: -32, row: -32 },
    largeCols: 256,
    largeShared: false,
    cropOrigin: { col: -32, row: -32 },
    objectsShared: false,
    roundTrip: false,
    transform: false,
  })
  expect(after.regions).toEqual({
    target: 10000,
    growShared: true,
    growOrigin: { col: -33, row: -32 },
    largeCols: 10000,
    largeShared: true,
    cropOrigin: { col: -1, row: -1 },
    objectsShared: true,
    roundTrip: true,
    transform: true,
  })
  expect(after.legacy).toHaveLength(64)
  expect(after.legacy).toEqual(before.legacy)
  await cdp.detach()
})
