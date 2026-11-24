import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, type Page, test } from '@playwright/test'

const root = resolve(import.meta.dirname, '../../..')
const directory = resolve(root, '.tmp/pinta-library-e2e')
test.beforeAll(() =>
  execFileSync('bun', [resolve(root, 'packages/pinta/scripts/homologacao/library.ts'), directory], {
    cwd: root,
  }),
)
type ObjectData = {
  id: string
  name: string
  setId?: string
  art?: { assetId: string }
  x: number
  y: number
}
type Asset = { id: string; name: string; kind: string; layers?: { objects?: ObjectData[] }[] }
async function backup(page: Page): Promise<Asset[]> {
  await page.getByRole('button', { name: 'Baixar', exact: true }).click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Desenho editável (.pinta.json)', exact: true }).click()
  const file = await (await download).path()
  if (!file) throw new Error('Backup esperado')
  const assets = JSON.parse(await readFile(file, 'utf8')).assets
  await page.getByRole('dialog').getByRole('button', { name: 'Fechar', exact: true }).last().click()
  return assets
}
function objects(assets: Asset[]) {
  const map = assets.find((a) => a.kind === 'tilemap' && a.name === 'vila-da-biblioteca')
  if (!map) throw new Error('Mapa esperado')
  return map.layers!.flatMap((l) => l.objects ?? [])
}

test('biblioteca: arrastar arte real e conjunto, cancelar, desfazer e reabrir', async ({
  page,
  isMobile,
}, info) => {
  test.setTimeout(150_000)
  const cdp = await page.context().newCDPSession(page)
  const cpuSlowdown = Number(info.project.metadata.cpuSlowdown ?? 1)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuSlowdown })
  await page.goto(`/?namespace=library-${info.project.name}-${Date.now()}`)
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
  const preview = page.getByRole('img', { name: 'Prévia do desenho no cenário', exact: true })
  async function start(name: string) {
    const card = page.getByRole('button', { name: `Pôr ${name} no mapa`, exact: true })
    await card.scrollIntoViewIfNeeded()
    const source = await card.boundingBox()
    const paper = await page.locator('.pin-paper').boundingBox()
    if (!source || !paper) throw new Error('Biblioteca e palco medidos são obrigatórios')
    const from = { x: source.x + source.width / 2, y: source.y + source.height / 2 }
    const to = { x: paper.x + paper.width / 2, y: paper.y + paper.height / 2 }
    await info.attach('geometria-antes-do-arrasto', {
      body: JSON.stringify({
        from,
        to,
        viewport: page.viewportSize(),
        layout: await page.evaluate(() => ({
          scrollX,
          scrollY,
          innerWidth,
          innerHeight,
          bodyHeight: document.body.scrollHeight,
          panels: [...document.querySelectorAll('.pin-work,.pin-stage,.pin-col--end')].map(
            (el) => ({
              tag: el.tagName,
              rect: el.getBoundingClientRect().toJSON(),
              scrollHeight: el.scrollHeight,
              clientHeight: el.clientHeight,
              overflow: getComputedStyle(el).overflowY,
            }),
          ),
        })),
      }),
      contentType: 'application/json',
    })
    const viewport = page.viewportSize()!
    for (const point of [from, to]) {
      expect(point.x).toBeGreaterThanOrEqual(0)
      expect(point.y).toBeGreaterThanOrEqual(0)
      expect(point.x).toBeLessThan(viewport.width)
      expect(point.y).toBeLessThan(viewport.height)
    }
    if (isMobile) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] })
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [to] })
    } else {
      await page.mouse.move(from.x, from.y)
      await page.mouse.down()
      await page.mouse.move(to.x, to.y, { steps: 6 })
    }
    await expect(preview).toBeVisible()
    await expect(preview.locator('image')).toHaveAttribute('href', /^data:image\//)
    return to
  }
  async function finish() {
    if (isMobile) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    else await page.mouse.up()
  }
  await start('personagem-da-vila')
  await info.attach('previa-real', { body: await page.screenshot(), contentType: 'image/png' })
  // O cancelamento nativo do toque não pode virar clique de inserção.
  if (isMobile) await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] })
  else {
    await page.keyboard.press('Escape')
    await page.mouse.up()
  }
  await expect(preview).toHaveCount(0)
  expect(objects(await backup(page))).toHaveLength(0)
  await start('personagem-da-vila')
  await finish()
  await expect(preview).toHaveCount(0)
  const placed = objects(await backup(page))
  expect(placed).toHaveLength(1)
  expect(placed[0]!.art).toBeDefined()
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click()
  expect(objects(await backup(page))).toHaveLength(0)
  await page.getByRole('button', { name: 'Refazer', exact: true }).click()
  expect(objects(await backup(page))).toEqual(placed)
  await start('jardim-vinculado')
  const expectedPlacement = await preview
    .locator('rect')
    .last()
    .evaluate((outline) => ({
      x: Number(outline.getAttribute('x')),
      y: Number(outline.getAttribute('y')),
    }))
  const paperTransform = await page.locator('.pin-paper').evaluate((paper) => {
    if (!(paper instanceof HTMLElement)) throw new Error('Papel esperado')
    const previous = paper.style.transform
    paper.style.transform = 'translateY(32px)'
    return previous
  })
  await finish()
  await page.locator('.pin-paper').evaluate((paper, transform) => {
    if (!(paper instanceof HTMLElement)) throw new Error('Papel esperado')
    paper.style.transform = transform
  }, paperTransform)
  const withSet = await backup(page)
  const garden = withSet.find((a) => a.kind === 'map-set')!
  expect(objects(withSet)).toHaveLength(2)
  expect(objects(withSet)[1]!.setId).toBe(garden.id)
  const setObject = objects(withSet)[1]!
  expect({ x: setObject.x, y: setObject.y }).toEqual(expectedPlacement)
  await start('fantasma-da-vila')
  await info.attach('previa-vetorial', { body: await page.screenshot(), contentType: 'image/png' })
  await finish()
  const final = await backup(page)
  expect(objects(final)).toHaveLength(3)
  expect(objects(final)[2]!.art?.assetId).toBe(final.find((a) => a.name === 'fantasma-da-vila')!.id)
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
