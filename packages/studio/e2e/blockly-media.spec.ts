import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { expect, type Page, test } from '@playwright/test'

/**
 * A lixeira e o zoom do Blockly no Estúdio (`src/blockly/workspaceControls.ts`).
 *
 * - O desenho vem do próprio host, sem o servidor de demonstração (que tirou o `sprites.png` com
 *   o Blockly 13, e os ícones sumiam), e em vetor: o `sprites.svg` do SDK instalado.
 * - A lixeira fica por cima dos blocos, na camada do zoom (pedido dela, 20/11/2026: os blocos
 *   cobriam a lixeira e a tampa abrindo).
 * - A tampa abre quando um bloco passa por cima e fecha quando ele sai.
 */

async function openCoinGame(page: Page) {
  await page.goto('/')
  await page
    .locator('button')
    .filter({ has: page.getByText('Pegue a moeda', { exact: true }) })
    .first()
    .click()
  await expect(page).toHaveURL(/\/editor\//)
  // Os controles só aparecem depois de irem para o lugar (sem pular).
  await expect(page.locator('.injectionDiv[data-sz-controls="ready"]')).toBeAttached({
    timeout: 20_000,
  })
}

test('zoom e lixeira usam o desenho em vetor do SDK, servido pelo host', async ({
  page,
  baseURL,
}) => {
  await openCoinGame(page)
  const urls = await page
    .locator('.blocklyTrash image, .blocklyZoom image')
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('href') ?? node.getAttribute('xlink:href')),
    )
  // Corpo e tampa da lixeira; centralizar, aproximar e afastar.
  expect(urls).toHaveLength(5)
  expect(new Set(urls).size).toBe(1)
  const absolute = new URL(urls[0] ?? '', page.url())
  expect(absolute.origin).toBe(new URL(baseURL ?? page.url()).origin)
  expect(absolute.pathname).toBe('/studio-blockly/sprites.svg')
  const response = await page.request.get(absolute.href)
  expect(response.ok()).toBe(true)
  expect(response.headers()['content-type']).toContain('image/svg+xml')
  const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
  expect(sha(await response.body())).toBe(
    sha(readFileSync(new URL('../playground/public/studio-blockly/sprites.svg', import.meta.url))),
  )
  await expect(page.locator('.blocklyTrash')).toBeVisible()
  await expect(page.locator('.blocklyZoom').first()).toBeVisible()
})

test('a lixeira fica por cima dos blocos e a tampa abre e fecha com o bloco', async ({ page }) => {
  await openCoinGame(page)
  const camadas = await page.evaluate(() => {
    const trash = document.querySelector('.blocklyTrash')
    const canvas = document.querySelector('.blocklyBlockCanvas')
    const zoom = document.querySelector('.blocklyZoom')
    const depois = (a: Element | null, b: Element | null) =>
      a && b ? Boolean(b.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING) : null
    return {
      lixeiraDepoisDosBlocos: depois(trash, canvas),
      zoomDepoisDosBlocos: depois(zoom, canvas),
    }
  })
  expect(camadas).toEqual({ lixeiraDepoisDosBlocos: true, zoomDepoisDosBlocos: true })

  const lid = page.locator('.blocklyTrash image').nth(1)
  const angle = async () => {
    const transform = (await lid.getAttribute('transform')) ?? ''
    const match = /rotate\(\s*(-?[\d.]+)/.exec(transform)
    return match ? Math.abs(Number(match[1])) : 0
  }
  expect(await angle()).toBe(0)
  const trash = await page.locator('.blocklyTrash').boundingBox()
  const block = await page.locator('.blocklyBlockCanvas > .blocklyDraggable').first().boundingBox()
  if (!trash || !block) throw new Error('sem lixeira ou sem bloco na tela')
  const from = { x: block.x + 12, y: block.y + 8 }
  const to = { x: trash.x + trash.width / 2, y: trash.y + trash.height / 2 }
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  for (let i = 1; i <= 20; i += 1)
    await page.mouse.move(from.x + ((to.x - from.x) * i) / 20, from.y + ((to.y - from.y) * i) / 20)
  // Em cima da lixeira: a tampa abre.
  await expect.poll(angle, { timeout: 5_000 }).toBeGreaterThan(30)
  // Sai de cima sem soltar: a tampa fecha.
  for (let i = 1; i <= 10; i += 1) await page.mouse.move(to.x - 30 * i, to.y - 30 * i)
  await expect.poll(angle, { timeout: 5_000 }).toBe(0)
  await page.mouse.move(to.x - 300, to.y - 300)
  await page.mouse.up()
})
