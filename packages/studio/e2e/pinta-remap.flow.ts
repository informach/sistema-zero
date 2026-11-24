import { expect, test } from '@playwright/test'
import type { createTilesetRemapHost } from '../../pinta/scripts/homologacao/tilesetRemapHost'
import type { runRemapRegionsProbe } from '../../pinta/scripts/remap-regions-probe'
import { pintaAssetFromWire } from '../../pinta/src/assets/wire'
import { isObjectLayer, tilemapOfAsset } from '../../pinta/src/core/project'

declare global {
  interface Window {
    tileRemapQa: Awaited<ReturnType<typeof createTilesetRemapHost>>
    tileRemapStored: unknown[]
    runRemapRegionsProbe: typeof runRemapRegionsProbe
  }
}

type Snapshot = ReturnType<Window['tileRemapQa']['snapshot']>
function artwork(snapshot: Snapshot) {
  const asset = snapshot.linked.map(pintaAssetFromWire).find((a) => a?.name === 'qa-objeto')
  const map = asset && tilemapOfAsset(asset)
  if (!map) throw Error('Mapa vinculado ausente')
  return map.layers.find(isObjectLayer)?.objects[0]?.art
}

for (const version of ['current', 'previous'] as const) {
  for (const scenario of ['normal', 'overflow', 'supersede', 'accepted'] as const) {
    test(`${version}: ${scenario}`, async ({ page, context, isMobile }, info) => {
      test.fail(
        version === 'previous' && scenario !== 'accepted',
        'Defeito reproduzido no componente histórico; núcleo e store atuais mantidos',
      )
      const errors: string[] = [],
        cpu = Number(info.project.metadata.cpuSlowdown ?? 1)
      const cdp = await context.newCDPSession(page)
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu })
      page.on('pageerror', (error) => errors.push(error.message))
      await page.goto(`/${version}.html?mode=${scenario === 'accepted' ? 'normal' : scenario}`)
      await page.waitForFunction(() => !!window.tileRemapQa)
      const press = async (name: string) => {
        const button = page.getByRole('button', { name, exact: true })
        if (isMobile) await button.tap()
        else await button.click()
      }
      const snapshot = () => page.evaluate(() => window.tileRemapQa.snapshot())
      const before = await snapshot()
      try {
        await press(scenario === 'overflow' ? 'Nova peça' : 'Apagar peça')
        const first = await snapshot()
        if (scenario === 'normal') await press('Nova peça')
        const after = await snapshot()
        await info.attach('revisoes', {
          body: JSON.stringify({ version, scenario, cpu, before, first, after }),
          contentType: 'application/json',
        })
        if (scenario === 'overflow') {
          expect(after.asset).toEqual(before.asset)
          expect(after.frame).toBe(1)
          expect(after.canUndo).toBe(false)
          expect(after.dirty).toBe(false)
          await expect(
            page.getByText('Não consegui atualizar as peças de "qa-limite". Nada foi alterado.', {
              exact: true,
            }),
          ).toBeVisible()
        } else if (scenario === 'supersede') {
          expect(pintaAssetFromWire(after.asset)?.name).toBe('qa-adotado')
          expect(after.frame).toBe(1)
          expect(after.canUndo).toBe(false)
        } else {
          expect(artwork(first)).toBeUndefined()
          expect(artwork(after)).toBeUndefined()
          await press('Desfazer QA')
          if (scenario === 'normal') {
            expect(artwork(await snapshot())).toBeUndefined()
            await press('Desfazer QA')
          }
          const restored = await snapshot()
          expect(restored.asset).toEqual(before.asset)
          expect(artwork(restored)?.tile).toBe(1)
          expect(restored.canUndo).toBe(false)
          if (scenario === 'normal') {
            await press('Refazer QA')
            await press('Refazer QA')
            expect(artwork(await snapshot())).toBeUndefined()
            await page.evaluate(() => window.tileRemapQa.flush())
            const namespace = await page.evaluate(() => window.tileRemapQa.namespace)
            const reopened = await context.newPage()
            await reopened.goto(`/current.html?read=${encodeURIComponent(namespace)}`)
            await reopened.waitForFunction(() => !!window.tileRemapStored)
            const stored = await reopened.evaluate(() => window.tileRemapStored)
            const assets = stored.map((wire) => pintaAssetFromWire(wire))
            expect(assets.every(Boolean)).toBe(true)
            const map = assets.find((a) => a?.name === 'qa-objeto')
            if (map?.kind !== 'tilemap') throw Error('Mapa salvo ausente')
            expect(map.layers.find(isObjectLayer)?.objects[0]?.art).toBeUndefined()
            const set = assets.find((a) => a?.name === 'qa-conjunto')
            const terrain = assets.find((a) => a?.name === 'qa-terreno')
            if (set?.kind !== 'map-set' || terrain?.kind !== 'tilemap')
              throw Error('Dependências ausentes')
            expect(Array.from(set.map.layers[0]!.cells!)).toEqual(
              Array.from(terrain.layers[0]!.cells!),
            )
            expect(terrain.layers[0]!.cells![0]).toBe(-1)
            expect(terrain.layers[0]!.cells![1]).toBe(2)
            const sheet = assets.find((a) => a?.name === 'qa-pecas')
            if (sheet?.kind !== 'tileset') throw Error('Peças salvas ausentes')
            expect(sheet.tiles.map((tile) => tile.data[0])).toEqual([1, 0, 3])
            expect(terrain.tilesetId).toBe(sheet.id)
            expect(set.map.tilesetId).toBe(sheet.id)
            await info.attach('reabertura', {
              body: JSON.stringify(stored),
              contentType: 'application/json',
            })
            await reopened.close()
          }
        }
        expect(errors).toEqual([])
      } finally {
        await page.evaluate(() => window.tileRemapQa.flush())
        await cdp.detach()
      }
    })
  }
}

test('regiões: renumeração limitada aos buffers armazenados', async ({ page, context }, info) => {
  const cdp = await context.newCDPSession(page),
    cpu = Number(info.project.metadata.cpuSlowdown ?? 1)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu })
  await page.goto('/current.html')
  await page.waitForFunction(() => !!window.runRemapRegionsProbe)
  const result = await page.evaluate(() => window.runRemapRegionsProbe())
  await info.attach('regioes', {
    body: JSON.stringify({ cpu, result, public8: false }),
    contentType: 'application/json',
  })
  expect(result).toEqual({
    logicalCells: 100000000,
    sparseBytes: 4096,
    values: [4096, 24578],
    sharedFirstChunk: true,
    afterRemovalChunks: 1,
    roundTrip: true,
    fullBytes: 4194304,
    fullLastCell: 1,
    originalLastCell: 0,
  })
  await cdp.detach()
})
