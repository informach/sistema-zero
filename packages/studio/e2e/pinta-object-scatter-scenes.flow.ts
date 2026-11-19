import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, type Page, test } from '@playwright/test'

const root = resolve(import.meta.dirname, '../../..'),
  directory = resolve(root, '.tmp/pinta-scatter-e2e')
test.beforeAll(() => {
  execFileSync('bun', [resolve(root, 'packages/pinta/scripts/homologacao/library.ts'), directory], {
    cwd: root,
  })
})
type ObjectData = {
  id: string
  name: string
  setId?: string
  art?: { assetId: string }
  [key: string]: unknown
}
type Asset = { id: string; name: string; kind: string; layers?: { objects?: ObjectData[] }[] }
async function backup(page: Page): Promise<Asset[]> {
  await page.getByRole('button', { name: 'Baixar', exact: true }).click()
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Desenho editável (.pinta.json)', exact: true }).click()
  const file = await (await pending).path()
  if (!file) throw new Error('Backup esperado')
  const assets = JSON.parse(await readFile(file, 'utf8')).assets
  await page.getByRole('dialog').getByRole('button', { name: 'Fechar', exact: true }).last().click()
  return assets
}
function objects(assets: Asset[]): ObjectData[] {
  const map = assets.find((a) => a.kind === 'tilemap' && a.name === 'vila-da-biblioteca')
  if (!map) throw new Error('Mapa esperado')
  return map.layers!.flatMap((l) => l.objects ?? [])
}
function withoutIds(list: ObjectData[]) {
  return list.map(({ id, ...object }) => object)
}

test('espalhar pixel, vetor e conjunto: prévia determinística, cancelamento, histórico e reabertura', async ({
  page,
  isMobile,
}, info) => {
  test.setTimeout(180_000)
  const cdp = await page.context().newCDPSession(page),
    cpuSlowdown = Number(info.project.metadata.cpuSlowdown ?? 1)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuSlowdown })
  await page.goto(`/?namespace=scatter-${info.project.name}-${Date.now()}`)
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles(resolve(directory, 'biblioteca.pinta.json'))
  await page.getByRole('button', { name: 'Abrir vila-da-biblioteca (Mapa)', exact: true }).click()
  const tip = page.getByRole('button', { name: 'Entendi!', exact: true })
  if (await tip.isVisible()) await tip.click()
  if (isMobile) await page.getByText('Peças, camadas e detalhes', { exact: true }).click()
  await page.getByLabel('Nível das ferramentas', { exact: true }).selectOption('create')
  await page.getByRole('button', { name: 'Objetos', exact: true }).click()
  async function source(name: string) {
    const card = page.getByRole('button', { name: `Pôr ${name} no mapa`, exact: true })
    await card.focus()
    await card.press('Enter')
    await page
      .getByRole('button', { name: `Escolher o objeto ${name}`, exact: true })
      .first()
      .click()
    await page.getByRole('button', { name: 'Espalhar desenhos', exact: true }).click()
    const density = page.getByRole('slider', { name: /^Densidade/ })
    await density.focus()
    await density.press('End')
    const spacing = page.getByRole('slider', { name: /^Distância entre centros:/ })
    await spacing.focus()
    await spacing.press('Home')
    await page.getByLabel('Número da variação', { exact: true }).fill('37')
    await page.getByLabel('Número da variação', { exact: true }).press('Tab')
  }
  async function begin(row: number) {
    const paper = await page.locator('.pin-paper').boundingBox()
    if (!paper) throw new Error('Papel esperado')
    const from = {
        x: paper.x + (paper.width * 1.5) / 8,
        y: paper.y + (paper.height * (row + 0.5)) / 6,
      },
      to = { x: paper.x + (paper.width * 6.5) / 8, y: from.y }
    const viewport = page.viewportSize()!
    for (const p of [from, to]) {
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.x).toBeLessThan(viewport.width)
      expect(p.y).toBeLessThan(viewport.height)
    }
    if (isMobile) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] })
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [to] })
    } else {
      await page.mouse.move(from.x, from.y)
      await page.mouse.down()
      await page.mouse.move(to.x, to.y, { steps: 5 })
    }
    const preview = page.locator('[data-pin-scatter-preview]')
    await expect(preview.first()).toBeVisible()
    await expect(preview.locator('text')).toHaveCount(0)
    await expect(preview.first().locator('image')).toHaveAttribute('href', /^data:image\//)
    return preview.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('data-pin-scatter-preview')),
    )
  }
  async function finish() {
    if (isMobile) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    else await page.mouse.up()
    await expect(page.locator('[data-pin-scatter-preview]')).toHaveCount(0)
  }
  await source('personagem-da-vila')
  await page.getByRole('checkbox', { name: 'Variar o giro', exact: true }).check()
  await page.getByRole('checkbox', { name: 'Variar o lado', exact: true }).check()
  const baseline = objects(await backup(page))
  await begin(2)
  await info.attach('previa-do-pincel', { body: await page.screenshot(), contentType: 'image/png' })
  if (isMobile) await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] })
  else {
    await page.keyboard.press('Escape')
    await page.mouse.up()
  }
  await expect(page.locator('[data-pin-scatter-preview]')).toHaveCount(0)
  expect(objects(await backup(page))).toEqual(baseline)
  const firstIds = await begin(2)
  await finish()
  const first = objects(await backup(page))
  expect(first.slice(baseline.length).map((o) => o.id)).toEqual(firstIds)
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click()
  expect(objects(await backup(page))).toEqual(baseline)
  const secondIds = await begin(2)
  await finish()
  const second = objects(await backup(page))
  expect(second.slice(baseline.length).map((o) => o.id)).toEqual(secondIds)
  expect(firstIds).not.toEqual(secondIds)
  expect(withoutIds(second)).toEqual(withoutIds(first))
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click()
  expect(objects(await backup(page))).toEqual(baseline)
  await page.getByRole('button', { name: 'Refazer', exact: true }).click()
  expect(objects(await backup(page))).toEqual(second)
  await source('jardim-vinculado')
  await page.getByLabel('Tamanho do pincel (casas)', { exact: true }).selectOption('1')
  const beforeSet = objects(await backup(page)),
    setIds = await begin(4)
  await finish()
  const setAssets = await backup(page),
    set = setAssets.find((a) => a.kind === 'map-set')!
  const newSets = objects(setAssets).slice(beforeSet.length)
  expect(newSets.map((o) => o.id)).toEqual(setIds)
  expect(newSets.every((o) => o.setId === set.id)).toBe(true)
  await source('fantasma-da-vila')
  const beforeVector = objects(await backup(page)),
    vectorIds = await begin(2)
  await finish()
  const final = await backup(page),
    vector = final.find((a) => a.name === 'fantasma-da-vila')!
  const newVectors = objects(final).slice(beforeVector.length)
  expect(newVectors.map((o) => o.id)).toEqual(vectorIds)
  expect(newVectors.every((o) => o.art?.assetId === vector.id)).toBe(true)
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Criar novo', exact: true })).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: 'Abrir vila-da-biblioteca (Mapa)', exact: true }).click()
  expect(objects(await backup(page))).toEqual(objects(final))
  await info.attach('ambiente', {
    body: JSON.stringify({ isMobile, cpuSlowdown, physicalPhones: false }),
    contentType: 'application/json',
  })
  await cdp.detach()
})
