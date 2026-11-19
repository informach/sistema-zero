import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, type Page, test } from '@playwright/test'
import { sceneObjects, sceneSpawn } from '../../core/src/studio/pinta-scene-runtime'
import { COPY } from '../../pinta/src/core/copy'
import { effectiveLayer, isObjectLayer, type PintaAsset } from '../../pinta/src/core/project'
import { exportPintaScene } from '../../pinta/src/export/scene'
import { objectBounds } from '../../pinta/src/tiles/objectGeometry'

const root = resolve(import.meta.dirname, '../../..'),
  directory = resolve(root, '.tmp/pinta-level-design-e2e')
test.beforeAll(() => {
  execFileSync('bun', [resolve(root, 'packages/pinta/scripts/homologacao/library.ts'), directory], {
    cwd: root,
  })
})
test.beforeEach(({ page }) => page.setDefaultTimeout(15_000))
async function backup(page: Page): Promise<PintaAsset[]> {
  await page.getByRole('button', { name: 'Baixar', exact: true }).click()
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Desenho editável (.pinta.json)', exact: true }).click()
  const file = await (await pending).path()
  if (!file) throw new Error('Backup esperado')
  const assets = JSON.parse(await readFile(file, 'utf8')).assets
  await page.getByRole('dialog').getByRole('button', { name: 'Fechar', exact: true }).last().click()
  return assets
}
test('modelo girado: guardar pela oficina, reutilizar vinculado, desfazer e reabrir', async ({
  page,
  isMobile,
}, info) => {
  test.setTimeout(150_000)
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', {
    rate: Number(info.project.metadata.cpuSlowdown ?? 1),
  })
  await page.goto(`/?namespace=level-design-${info.project.name}-${Date.now()}`)
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles(resolve(directory, 'biblioteca.pinta.json'))
  const open = page.getByRole('button', { name: 'Abrir vila-da-biblioteca (Mapa)', exact: true })
  await open.click()
  const tip = page.getByRole('button', { name: 'Entendi!', exact: true })
  if (await tip.isVisible()) await tip.click()
  if (isMobile) await page.getByText('Peças, camadas e detalhes', { exact: true }).click()
  await page.getByLabel('Nível das ferramentas', { exact: true }).selectOption('create')
  await page.getByRole('button', { name: 'Objetos', exact: true }).click()
  const art = page.getByRole('button', { name: 'Pôr personagem-da-vila no mapa', exact: true })
  await art.focus()
  await art.press('Enter')
  await page
    .getByRole('button', { name: 'Escolher o objeto personagem-da-vila', exact: true })
    .click()
  async function field(label: string, value: string) {
    await page.getByLabel(label, { exact: true }).fill(value)
    await page.getByLabel(label, { exact: true }).press('Tab')
  }
  for (const [label, value] of [
    ['X', '48'],
    ['Y', '32'],
    ['Largura', '32'],
    ['Altura', '16'],
    ['Giro', '90'],
  ])
    await field(label!, value!)
  await page.getByLabel('Virar de lado', { exact: true }).check()
  await page.getByRole('button', { name: 'Nova propriedade', exact: true }).click()
  await field('Nome da propriedade: propriedade', 'moradores')
  await page.getByLabel('Tipo do valor: moradores', { exact: true }).selectOption('int')
  await field('Valor: moradores', '3')
  await page.getByRole('button', { name: 'Guardar modelo do objeto', exact: true }).click()
  await expect(
    page.getByText('Guardei modelo-personagem-da-vila na biblioteca.', { exact: true }),
  ).toBeVisible()
  const assets = await backup(page)
  const card = page.getByRole('button', {
    name: 'Pôr modelo-personagem-da-vila no mapa',
    exact: true,
  })
  await card.focus()
  await card.press('Enter')
  // O backup de um mapa fecha somente os recursos usados; colocar a instância
  // torna o novo modelo parte desse fechamento, sem exigir exportar a galeria.
  const placedAssets = await backup(page)
  const template = placedAssets.find(
    (a) => a.kind === 'map-set' && a.name === 'modelo-personagem-da-vila',
  )
  if (template?.kind !== 'map-set') throw new Error('Modelo esperado')
  const layer = template.map.layers.find(isObjectLayer)!,
    object = layer.objects[0]!
  const box = objectBounds(object),
    offset = effectiveLayer(template.map, layer)
  expect(box.x + offset.offsetX).toBeGreaterThanOrEqual(-1e-7)
  expect(box.y + offset.offsetY).toBeGreaterThanOrEqual(-1e-7)
  expect(box.x + box.width + offset.offsetX).toBeLessThanOrEqual(template.map.cols * 16 + 1e-7)
  expect(box.y + box.height + offset.offsetY).toBeLessThanOrEqual(template.map.rows * 16 + 1e-7)
  expect(object).toMatchObject({
    rotation: 90,
    flipX: true,
    properties: { moradores: { type: 'int', value: 3 } },
  })
  const mapOf = (list: PintaAsset[]) => {
    const map = list.find((a) => a.kind === 'tilemap')
    if (map?.kind !== 'tilemap') throw new Error('Mapa esperado')
    return map
  }
  const final = mapOf(placedAssets)
  expect(
    final.layers
      .flatMap((l) => (isObjectLayer(l) ? l.objects : []))
      .some((o) => o.setId === template.id),
  ).toBe(true)
  await info.attach('modelo-reutilizado', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click()
  expect(mapOf(await backup(page)).layers).toEqual(mapOf(assets).layers)
  await page.getByRole('button', { name: 'Refazer', exact: true }).click()
  expect(mapOf(await backup(page)).layers).toEqual(final.layers)
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Criar novo', exact: true })).toBeVisible()
  await page.reload()
  await open.click()
  expect(mapOf(await backup(page)).layers).toEqual(final.layers)
  await cdp.detach()
})

test('autoria profissional: caminhos, áreas, porta, propriedades e grupo sobrevivem ao save e à cena', async ({
  page,
  isMobile,
}, info) => {
  test.setTimeout(150_000)
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', {
    rate: Number(info.project.metadata.cpuSlowdown ?? 1),
  })
  await page.goto(`/?namespace=professional-${info.project.name}-${Date.now()}`)
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles(resolve(directory, 'biblioteca.pinta.json'))
  const open = page.getByRole('button', { name: 'Abrir vila-da-biblioteca (Mapa)', exact: true })
  await open.click()
  const tip = page.getByRole('button', { name: 'Entendi!', exact: true })
  if (await tip.isVisible()) await tip.click()
  if (isMobile) await page.getByText('Peças, camadas e detalhes', { exact: true }).click()
  await page.getByLabel(COPY.scene.nivelDasFerramentas, { exact: true }).selectOption('advanced')
  await page.getByRole('button', { name: 'Objetos', exact: true }).click()
  async function field(label: string, value: string) {
    await page.getByLabel(label, { exact: true }).fill(value)
    await page.getByLabel(label, { exact: true }).press('Tab')
  }
  async function tap(x: number, y: number) {
    const paper = await page.locator('.pin-paper').boundingBox()
    if (!paper) throw new Error('Papel esperado')
    const at = { x: paper.x + (paper.width * x) / 128, y: paper.y + (paper.height * y) / 96 }
    const viewport = page.viewportSize()!
    expect(at.x >= 0 && at.x < viewport.width && at.y >= 0 && at.y < viewport.height).toBe(true)
    if (isMobile) await page.touchscreen.tap(at.x, at.y)
    else await page.mouse.click(at.x, at.y)
  }
  async function role(name: string, value: string) {
    await field(COPY.tiles.objectName, name)
    await page.getByLabel(COPY.tiles.objectRole, { exact: true }).selectOption(value)
  }
  await page.getByRole('button', { name: COPY.tiles.objectShapes.polyline, exact: true }).click()
  for (const [x, y] of [
    [16, 16],
    [64, 16],
    [96, 32],
  ])
    await tap(x!, y!)
  await page.keyboard.press('Enter')
  await role('Patrulha', 'path')
  await page.getByRole('button', { name: COPY.tiles.objectShapes.polygon, exact: true }).click()
  for (const [x, y] of [
    [16, 48],
    [48, 48],
    [48, 80],
  ])
    await tap(x!, y!)
  await page.keyboard.press('Enter')
  await role('Gatilho', 'trigger')
  await page.getByLabel(COPY.tiles.objectCollision, { exact: true }).check()
  await page.getByRole('button', { name: COPY.tiles.objectPoint, exact: true }).click()
  await tap(96, 64)
  await role('Chegada', 'start')
  await page.getByRole('button', { name: COPY.tiles.objectPoint, exact: true }).click()
  await tap(16, 88)
  await role('Entrada', 'door')
  await page.getByRole('button', { name: COPY.tiles.addProperty, exact: true }).click()
  await field(`${COPY.tiles.propertyKey}: propriedade`, 'destino')
  await field(`${COPY.tiles.propertyValue}: destino`, 'floresta')
  await page.getByRole('button', { name: COPY.tiles.addGroup, exact: true }).click()
  await page.getByRole('button', { name: COPY.tiles.group, exact: true }).click()
  await field(`${COPY.tiles.layerName}: ${COPY.tiles.group}`, 'Região da vila')
  await page.getByRole('button', { name: 'Objetos', exact: true }).click()
  await page
    .getByRole('combobox', { name: COPY.tiles.layerParent, exact: true })
    .selectOption({ label: 'Região da vila' })
  await page.getByText(COPY.scene.deslocamentoEDistancia, { exact: true }).click()
  await field(COPY.scene.deslocarX, '2.5')
  await field(COPY.scene.distanciaX, '0.5')
  const opacity = page.getByRole('slider', { name: /^Opacidade/ })
  await opacity.focus()
  await opacity.press('End')
  for (let i = 0; i < 5; i++) await opacity.press('PageDown')
  await expect(opacity).toHaveValue('50')
  await page.getByText(COPY.scene.propriedades, { exact: true }).click()
  await page.getByRole('button', { name: COPY.scene.adicionarPropriedade, exact: true }).click()
  await field(`${COPY.tiles.propertyKey}: ${COPY.scene.nomeDaPropriedade(1)}`, 'bioma')
  await field(`${COPY.tiles.propertyValue}: bioma`, 'vila')
  const final = await backup(page)
  const map = final.find((a) => a.kind === 'tilemap')
  if (map?.kind !== 'tilemap') throw new Error('Mapa esperado')
  const layer = map.layers.find(isObjectLayer)!,
    objects = layer.objects
  expect(objects).toHaveLength(4)
  expect(objects.find((o) => o.name === 'Patrulha')).toMatchObject({
    role: 'path',
    shape: 'polyline',
    points: [
      { x: 0, y: 0 },
      { x: 48, y: 0 },
      { x: 80, y: 16 },
    ],
  })
  expect(objects.find((o) => o.name === 'Gatilho')).toMatchObject({
    role: 'trigger',
    shape: 'polygon',
    collision: true,
  })
  expect(layer).toMatchObject({
    offsetX: 2.5,
    parallaxX: 0.5,
    opacity: 0.5,
    properties: { bioma: 'vila' },
  })
  expect(map.layers.find((l) => l.id === layer.parentId)?.name).toBe('Região da vila')
  // Executa o adaptador e as consultas comuns sobre o documento realmente criado na UI.
  const scene = await exportPintaScene(
    map,
    (id) => final.find((a) => a.id === id) ?? null,
    async () => 'data:image/png;base64,fixture',
  )
  expect(sceneObjects(scene).find((o) => o.name === 'Patrulha')?.points).toHaveLength(3)
  const door = sceneObjects(scene).find((o) => o.role === 'door')!
  expect(door.properties.destino).toBe('floresta')
  const start = objects.find((o) => o.role === 'start')!
  expect(sceneSpawn(scene)).toMatchObject({ x: start.x + 2.5, y: start.y })
  await info.attach('autoria-profissional', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Criar novo', exact: true })).toBeVisible()
  await page.reload()
  await open.click()
  const reopened = (await backup(page)).find((a) => a.kind === 'tilemap')
  if (reopened?.kind !== 'tilemap') throw new Error('Mapa esperado')
  expect(reopened.layers).toEqual(map.layers)
  await cdp.detach()
})
