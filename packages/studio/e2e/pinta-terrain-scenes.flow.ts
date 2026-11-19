import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, type Page, test } from '@playwright/test'

const root = resolve(import.meta.dirname, '../../..')
const directory = resolve(root, '.tmp/pinta-terrain-e2e')
type Layer = { name: string; cells: number[]; tilesetId?: string }
type Asset = {
  id: string
  name: string
  kind: string
  cols: number
  layers: Layer[]
  tilesetId: string
  terrains?: { tiles: Record<string, number[]> }[]
}
test.beforeAll(() => {
  execFileSync(
    'bun',
    [resolve(root, 'packages/pinta/scripts/homologacao/terrains.ts'), directory],
    {
      cwd: root,
    },
  )
})
async function backup(page: Page): Promise<Asset[]> {
  await page.getByRole('button', { name: 'Baixar', exact: true }).click()
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Desenho editável (.pinta.json)', exact: true }).click()
  const file = await (await pending).path()
  if (!file) throw new Error('Backup esperado')
  const content = JSON.parse(await readFile(file, 'utf8'))
  await page.getByRole('dialog').getByRole('button', { name: 'Fechar', exact: true }).last().click()
  return content.assets
}
function map(assets: Asset[], name = 'terrenos-em-duas-folhas'): Asset {
  const found = assets.find((a) => a.name === name && a.kind === 'tilemap')
  if (!found) throw new Error('Mapa esperado')
  return found
}
/** Invariante visual de encaixe, sem chamar o algoritmo de pintura para produzir o esperado. */
function assertSeams(assets: Asset[], layerIndex: number): void {
  const document = map(assets),
    layer = document.layers[layerIndex]!
  const sheet = assets.find((a) => a.id === (layer.tilesetId ?? document.tilesetId))!
  expect(sheet.terrains).toHaveLength(1)
  const pattern = (index: number) => {
    const cell = layer.cells[index]!
    if (cell === -1) return Array<number>(8).fill(0)
    const value = sheet.terrains![0]!.tiles[String(cell)]
    expect(value).toBeDefined()
    return value!
  }
  for (let index = 0; index < layer.cells.length; index++) {
    const current = pattern(index)
    if (index % document.cols < document.cols - 1) {
      const right = pattern(index + 1)
      expect([current[1], current[3]]).toEqual([right[7], right[5]])
    }
    if (index + document.cols < layer.cells.length) {
      const below = pattern(index + document.cols)
      expect([current[5], current[3]]).toEqual([below[7], below[1]])
    }
  }
}

test('terrenos: duas folhas, materiais, gestos, prévia, cancelamento, histórico e reabertura', async ({
  page,
  isMobile,
}, info) => {
  test.setTimeout(180_000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const cdp = await page.context().newCDPSession(page)
  const cpuSlowdown = Number(info.project.metadata.cpuSlowdown ?? 1)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuSlowdown })
  await page.goto(`/?namespace=terrain-${info.project.name}-${Date.now()}`)
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles(resolve(directory, 'terrenos.pinta.json'))
  const open = page.getByRole('button', {
    name: 'Abrir terrenos-em-duas-folhas (Mapa)',
    exact: true,
  })
  await open.click()
  const tip = page.getByRole('button', { name: 'Entendi!', exact: true })
  if (await tip.isVisible()) await tip.click()
  if (isMobile) await page.getByText('Peças, camadas e detalhes', { exact: true }).click()
  await page.getByLabel('Nível das ferramentas', { exact: true }).selectOption('create')
  await page.getByLabel('Terreno', { exact: true }).selectOption({ label: 'Terra e grama' })
  const canvas = page.getByRole('img', { name: 'Grade do mapa', exact: true })
  const tool = (name: string) => page.getByRole('button', { name, exact: true }).click()
  const chooseColor = async (color: string) => {
    const input = page.getByLabel('Cor para pintar o terreno', { exact: true })
    if (!(await input.isVisible()))
      await page.getByText('Preparar as peças do terreno', { exact: true }).click()
    await input.selectOption(color)
  }
  const point = async (col: number, row: number) => {
    await canvas.scrollIntoViewIfNeeded()
    const bounds = await canvas.boundingBox()
    if (!bounds) throw new Error('Grade visível esperada')
    expect(col * 32 + 16).toBeLessThan(bounds.width)
    expect(row * 32 + 16).toBeLessThan(bounds.height)
    return { x: bounds.x + col * 32 + 16, y: bounds.y + row * 32 + 16 }
  }
  const drag = async (from: [number, number], to: [number, number], cancel = false) => {
    const start = await point(...from),
      end = await point(...to)
    if (isMobile) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] })
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [end] })
      await cdp.send('Input.dispatchTouchEvent', {
        type: cancel ? 'touchCancel' : 'touchEnd',
        touchPoints: [],
      })
    } else {
      await page.mouse.move(start.x, start.y)
      await page.mouse.down()
      await page.mouse.move(end.x, end.y, { steps: 5 })
      if (cancel) await page.keyboard.press('Escape')
      await page.mouse.up()
    }
  }
  const initial = map(await backup(page)).layers
  if (!isMobile) {
    await page.mouse.move(1, 1)
    const before = await canvas.screenshot()
    const hover = await point(3, 2)
    await page.mouse.move(hover.x, hover.y)
    const preview = await canvas.screenshot()
    expect(createHash('sha256').update(preview).digest('hex')).not.toBe(
      createHash('sha256').update(before).digest('hex'),
    )
    expect(map(await backup(page)).layers).toEqual(initial)
  }
  await tool('Linha')
  await drag([2, 2], [5, 2])
  const line = await backup(page)
  expect(map(line).layers).not.toEqual(initial)
  assertSeams(line, 0)
  await tool('Desfazer')
  expect(map(await backup(page)).layers).toEqual(initial)
  await tool('Refazer')
  expect(map(await backup(page)).layers).toEqual(map(line).layers)
  await tool('Desfazer')
  await page.getByLabel('Variação', { exact: true }).fill('37')
  await tool('Retângulo')
  await drag([1, 1], [6, 5])
  const rectangle = await backup(page)
  assertSeams(rectangle, 0)
  await tool('Desfazer')
  await page.getByLabel('Variação', { exact: true }).fill('38')
  await drag([1, 1], [6, 5])
  expect(map(await backup(page)).layers).not.toEqual(map(rectangle).layers)
  await tool('Desfazer')
  await page.getByLabel('Variação', { exact: true }).fill('37')
  await drag([1, 1], [6, 5])
  expect(map(await backup(page)).layers).toEqual(map(rectangle).layers)
  await chooseColor('2')
  await tool('Lápis')
  await drag([3, 3], [3, 3])
  const transition = await backup(page)
  assertSeams(transition, 0)
  const terrain = transition.find((a) => a.id === map(transition).tilesetId)!.terrains![0]!.tiles
  expect(
    map(transition).layers[0]!.cells.some((cell) => {
      const p = terrain[String(cell)]
      return p?.includes(1) && p.includes(2)
    }),
  ).toBe(true)
  await tool('Borracha')
  await drag([3, 3], [3, 3])
  const erased = await backup(page)
  expect(map(erased).layers[0]!.cells[3 * 12 + 3]).toBe(-1)
  assertSeams(erased, 0)
  await tool('Desfazer')
  expect(map(await backup(page)).layers).toEqual(map(transition).layers)
  await tool('Retângulo')
  await drag([0, 0], [5, 4], true)
  expect(map(await backup(page)).layers).toEqual(map(transition).layers)
  await tool('Balde de tinta')
  // Fora da faixa de bordas já construída pelo retângulo: região vazia conectada.
  await drag([8, 0], [8, 0])
  const filled = await backup(page)
  assertSeams(filled, 0)
  expect(map(filled).layers[0]!.cells.every((cell) => cell >= 0)).toBe(true)
  const land = map(filled).layers[0]
  await tool('Lago')
  await page.getByLabel('Terreno', { exact: true }).selectOption({ label: 'Areia e água' })
  await chooseColor('2')
  await tool('Retângulo')
  await drag([1, 1], [5, 5])
  const lake = await backup(page)
  expect(map(lake).layers[0]).toEqual(land)
  expect(map(lake).layers[1]!.cells.some((cell) => cell >= 0)).toBe(true)
  assertSeams(lake, 1)
  await tool('Voltar')
  await expect(page.getByRole('button', { name: 'Criar novo', exact: true })).toBeVisible()
  await page.reload()
  await open.click()
  expect(map(await backup(page)).layers).toEqual(map(lake).layers)
  expect(errors).toEqual([])
  await info.attach('terrenos-reabertos', {
    body: await canvas.screenshot(),
    contentType: 'image/png',
  })
  await info.attach('ambiente', {
    body: JSON.stringify({ cpuSlowdown, isMobile, simulated: isMobile || cpuSlowdown > 1 }),
    contentType: 'application/json',
  })
  await cdp.detach()
})

test('Começar: criar o bosque pronto e pintar materiais sem preparar regras', async ({
  page,
  isMobile,
}, info) => {
  test.setTimeout(120_000)
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', {
    rate: Number(info.project.metadata.cpuSlowdown ?? 1),
  })
  await page.goto(`/?namespace=prepared-terrain-${info.project.name}-${Date.now()}`)
  await page.getByRole('button', { name: 'Criar novo', exact: true }).click()
  await page.getByRole('button', { name: /Modelos prontos/ }).click()
  await page.getByRole('button', { name: /Bosque com terrenos/ }).click()
  await page.getByRole('textbox', { name: 'Qual o nome?', exact: true }).fill('bosque-iniciante')
  await page.getByRole('button', { name: 'Começar a desenhar', exact: true }).click()
  const canvas = page.getByRole('img', { name: 'Grade do mapa', exact: true })
  await expect(canvas).toBeVisible()
  const tip = page.getByRole('button', { name: 'Entendi!', exact: true })
  if (await tip.isVisible()) await tip.click()
  if (isMobile) await page.getByText('Peças, camadas e detalhes', { exact: true }).click()
  await expect(page.getByLabel('Nível das ferramentas', { exact: true })).toHaveValue('start')
  const initial = map(await backup(page), 'bosque-iniciante')
  const land = initial.layers[0]!
  const prepared = page.getByText('Preparar as peças do terreno', { exact: true })
  const paint = async () => {
    await canvas.scrollIntoViewIfNeeded()
    if (isMobile) await canvas.tap({ position: { x: 48, y: 48 } })
    else await canvas.click({ position: { x: 48, y: 48 } })
  }
  await page.getByLabel('Terreno', { exact: true }).selectOption({ label: 'Grama e terra' })
  expect(await prepared.evaluate((el) => el.closest('details')!.open)).toBe(false)
  const grass = page.getByRole('button', { name: 'Pintar Grama e terra, cor 1', exact: true })
  await grass.focus()
  await expect(grass).toBeFocused()
  await grass.press('Enter')
  await expect(grass).toHaveAttribute('aria-pressed', 'true')
  await paint()
  const painted = map(await backup(page), 'bosque-iniciante')
  expect(painted.layers[0]).not.toEqual(land)
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click()
  expect(map(await backup(page), 'bosque-iniciante').layers).toEqual(initial.layers)
  await page.getByRole('button', { name: 'Refazer', exact: true }).click()
  await page.getByRole('button', { name: 'Borracha', exact: true }).click()
  await page.getByRole('button', { name: 'Pintar Grama e terra, cor 2', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Lápis', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await paint()
  const ground = map(await backup(page), 'bosque-iniciante').layers[0]
  for (const [layer, terrain, material] of [
    ['Água', 'Água e areia', 1],
    ['Pedras', 'Pedra e terra', 1],
  ] as const) {
    await page.getByRole('button', { name: layer, exact: true }).click()
    await page.getByLabel('Terreno', { exact: true }).selectOption({ label: terrain })
    await page
      .getByRole('button', { name: `Pintar ${terrain}, cor ${material}`, exact: true })
      .click()
    expect(await prepared.evaluate((el) => el.closest('details')!.open)).toBe(false)
    await paint()
  }
  const final = await backup(page)
  const document = map(final, 'bosque-iniciante')
  await info.attach('antes-de-fechar', {
    body: JSON.stringify(final),
    contentType: 'application/json',
  })
  expect(document.layers[0]).toEqual(ground)
  const sheets = final.filter((a) => a.kind === 'tileset')
  expect(sheets).toHaveLength(3)
  expect(sheets.every((s) => s.terrains?.length === 1)).toBe(true)
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  const gallery = page.getByRole('button', { name: 'Criar novo', exact: true })
  const closeConfirmedImmediately = await gallery.isVisible()
  // Voltar só fecha depois do flush; aguardar essa confirmação antes de recarregar.
  await expect(gallery).toBeVisible()
  await info.attach('confirmacao-de-salvamento', {
    body: JSON.stringify({ closeConfirmedImmediately }),
    contentType: 'application/json',
  })
  await info.attach('galeria-apos-flush', {
    body: JSON.stringify(await page.getByRole('status').allTextContents()),
    contentType: 'application/json',
  })
  await page.reload()
  await page.getByRole('button', { name: 'Abrir bosque-iniciante (Mapa)', exact: true }).click()
  const reopened = await backup(page)
  await info.attach('apos-reabrir', {
    body: JSON.stringify(reopened),
    contentType: 'application/json',
  })
  expect(map(reopened, 'bosque-iniciante').layers).toEqual(document.layers)
  await info.attach('modelo-bosque-ui', { body: await page.screenshot(), contentType: 'image/png' })
  await cdp.detach()
})
