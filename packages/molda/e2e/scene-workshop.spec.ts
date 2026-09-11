/**
 * A oficina da geração seguinte DENTRO do app, em navegador real: criar pelo fluxo de
 * sempre, promover ao abrir, modelar, voltar com miniatura e sobreviver ao recarregar.
 *
 * O playground liga a capacidade com `?oficina=app`; ligá-la de verdade para a criança é
 * decisão de rollout, não deste teste.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { expect, type Page, test } from '@playwright/test'
import { unzipSync } from 'fflate'
import sharp from 'sharp'
import { COPY } from '../src/core/copy'
import { resolvePaletteColors } from '../src/core/sanitize'
import { SCENE_PAINT_COPY } from '../src/core/scenePaintCopy'
import type { MoldaSceneDocument } from '../src/scene/document'
import { sceneToJson } from '../src/scene/documentJson'
import { animatedScene } from '../src/testing/sceneAnimation'
import { makeSceneSkinFixture } from '../src/testing/sceneSkin'

/** Chaves do IndexedDB do playground: é assim que se prova a promoção, não pela tela. */
async function storageKeys(page: Page): Promise<string[]> {
  return page.evaluate(
    () =>
      new Promise<string[]>((resolve, reject) => {
        const request = indexedDB.open('sistema-zero-molda-playground')
        request.onsuccess = () => {
          const db = request.result
          const tx = db.transaction('assets', 'readonly')
          const keys = tx.objectStore('assets').getAllKeys()
          tx.oncomplete = () => {
            db.close()
            resolve(keys.result.map(String))
          }
          tx.onerror = () => reject(tx.error)
        }
        request.onerror = () => reject(request.error)
      }),
  )
}

/** A foto é derivada e sai depois que o desenho assenta: esperar por ela é esperar o disco. */
async function waitForThumb(page: Page, id: string): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(
          (key) =>
            new Promise<boolean>((resolve, reject) => {
              const request = indexedDB.open('sistema-zero-molda-playground')
              request.onsuccess = () => {
                const db = request.result
                const tx = db.transaction('assets', 'readonly')
                const row = tx.objectStore('assets').get(key)
                tx.oncomplete = () => {
                  db.close()
                  resolve(
                    typeof (row.result as { thumbDataUrl?: unknown })?.thumbDataUrl === 'string',
                  )
                }
                tx.onerror = () => reject(tx.error)
              }
              request.onerror = () => reject(request.error)
            }),
          `molda:scene-summary:${id}`,
        ),
      { timeout: 15_000 },
    )
    .toBe(true)
}

async function createModel(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name: 'Criar novo' }).click()
  await page.getByRole('button', { name: 'Criar modelo' }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()
  // Pelo RÓTULO: se o campo perder a associação, este teste reprova junto.
  await page.getByLabel('Nome', { exact: true }).fill(name)
  await page.getByRole('button', { name: 'Criar', exact: true }).click()
}

/** Sai da oficina guardando: a volta é para a galeria do APP, não para a lista da oficina. */
async function backToGallery(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Meus projetos' }).click()
  const save = page.getByRole('button', { name: 'Guardar e voltar' })
  if (await save.isVisible().catch(() => false)) await save.click()
  await expect(page.getByRole('heading', { name: 'Minhas criações 3D' })).toBeVisible()
}

test('criar pelo fluxo de sempre abre a oficina nova já promovida, e voltar traz a miniatura', async ({
  page,
}) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.goto('/?oficina=app')
  await expect(page.getByRole('heading', { name: 'Minhas criações 3D' })).toBeVisible()

  await createModel(page, 'robo-e2e')
  // A oficina montou: estes controles não existem no editor antigo.
  await expect(page.getByRole('button', { name: 'Editar malha' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Baixar projeto' })).toBeVisible()
  await expect(page.locator('canvas').first()).toBeVisible()

  const keys = await storageKeys(page)
  const scene = keys.filter((key) => key.startsWith('molda:scene:'))
  expect(scene.length).toBe(1)
  const id = scene[0]?.slice('molda:scene:'.length) ?? ''
  // Promover preserva o original e deixa as lápides: uma aba antiga não ressuscita o v1.
  expect(keys).toContain(`molda:scene-summary:${id}`)
  expect(keys).toContain(`molda:scene-originals:${id}`)
  expect(keys).toContain(`molda:record-deleted:${id}`)
  expect(keys.some((key) => key.startsWith(`molda:record:${id}`))).toBe(false)

  await waitForThumb(page, id)
  await backToGallery(page)
  await expect(page.getByRole('button', { name: 'Modelo robo-e2e' })).toBeVisible()
  // A foto do palco chega à galeria como imagem de verdade, não como o cubo de reserva.
  const photo = page.getByRole('img', { name: /robo-e2e/ })
  await expect(photo).toBeVisible({ timeout: 10_000 })
  expect(await photo.getAttribute('src')).toMatch(/^data:image\//)

  // Recarregar mantém a criação na geração seguinte, sem voltar para o editor antigo.
  await page.reload()
  await expect(page.getByRole('button', { name: 'Modelo robo-e2e' })).toBeVisible()
  await page.getByRole('button', { name: 'Modelo robo-e2e' }).click()
  await expect(page.getByRole('button', { name: 'Editar malha' })).toBeVisible()
  expect(pageErrors).toEqual([])
})

test('modelar e desfazer valem um passo cada, com o palco 3D vivo', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.goto('/?oficina=app')
  await createModel(page, 'peca-e2e')
  const undo = page.getByRole('button', { name: 'Desfazer' })
  await expect(undo).toBeDisabled()
  // O painel de formas nasce recolhido: abrir faz parte do caminho da criança.
  await page.getByText('Adicionar forma ou ponto').click()
  await page.getByRole('button', { name: 'Caixa', exact: true }).click()
  await expect(undo).toBeEnabled()
  await undo.click()
  await expect(undo).toBeDisabled()
  expect(pageErrors).toEqual([])
})

test('a oficina cabe em tablet e em celular sem esconder as ferramentas', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.goto('/?oficina=app')
  await createModel(page, 'toque-e2e')
  await expect(page.getByRole('button', { name: 'Editar malha' })).toBeVisible()

  for (const size of [
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size)
    // O palco continua com área de desenho e a saída continua alcançável em qualquer tamanho.
    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible()
    const rect = await canvas.boundingBox()
    expect(rect?.width ?? 0).toBeGreaterThan(200)
    expect(rect?.height ?? 0).toBeGreaterThan(150)
    await expect(page.getByRole('button', { name: 'Meus projetos' })).toBeVisible()
    // Nada pode empurrar a página para uma barra horizontal num celular.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
  }
  expect(pageErrors).toEqual([])
})

async function downloaded(page: Page, button: string) {
  const [file] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: button, exact: true }).click(),
  ])
  const path = await file.path()
  if (!path) throw new Error('Download missing')
  return { name: file.suggestedFilename(), bytes: await readFile(path) }
}

test('exporta glTF, OBJ com materiais, PNG limpo e apresentação que gira sem internet', async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/?oficina=app')
  await createModel(page, 'exportacoes-e2e')
  await expect(page.getByRole('button', { name: 'Imagem de apoio', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Exportar GLB', exact: true }).click()
  const format = page.getByLabel('Formato da cópia')
  await format.selectOption('gltf')
  await page.getByRole('button', { name: 'Preparar cópia', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Baixar cópia', exact: true })).toBeEnabled()
  const gltf = await downloaded(page, 'Baixar cópia')
  expect(gltf.name).toBe('exportacoes-e2e.gltf')
  expect(JSON.parse(gltf.bytes.toString()).asset.version).toBe('2.0')
  await format.selectOption('obj')
  await page.getByRole('button', { name: 'Preparar cópia', exact: true }).click()
  await expect(page.getByText('O que muda nesta cópia', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Baixar cópia', exact: true })).toBeDisabled()
  await page.getByLabel('Li as mudanças e quero baixar esta cópia.').check()
  const obj = await downloaded(page, 'Baixar cópia')
  expect(Object.keys(unzipSync(obj.bytes))).toContain('modelo.mtl')
  await format.selectOption('png')
  await page.getByRole('button', { name: 'Preparar cópia', exact: true }).click()
  await expect(page.getByAltText('Prévia da foto para exportar')).toBeVisible()
  const png = await downloaded(page, 'Baixar cópia')
  expect(png.name).toBe('exportacoes-e2e.png')
  const metadata = await sharp(png.bytes).metadata(),
    stats = await sharp(png.bytes).stats()
  expect([metadata.width, metadata.height]).toEqual([1024, 1024])
  expect(stats.channels[0]!.stdev).toBeGreaterThan(5)
  await format.selectOption('presentation')
  await page.getByRole('button', { name: 'Preparar cópia', exact: true }).click()
  await expect(page.getByAltText('Prévia da foto para exportar')).toBeVisible({ timeout: 30_000 })
  const presentation = await downloaded(page, 'Baixar cópia')
  await page.getByRole('button', { name: 'Voltar à oficina', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Desfazer', exact: true })).toBeDisabled()
  const offline = await browser.newContext({ offline: true })
  try {
    const viewer = await offline.newPage()
    await viewer.setContent(presentation.bytes.toString())
    await expect(viewer.getByRole('heading', { name: 'exportacoes-e2e' })).toBeVisible()
    const image = viewer.locator('#model'),
      first = await image.getAttribute('src')
    await viewer.getByRole('button', { name: 'Girar para a direita' }).click()
    expect(await image.getAttribute('src')).not.toBe(first)
    await expect
      .poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth))
      .toBe(384)
  } finally {
    await offline.close()
  }
  expect(errors).toEqual([])
})

test('grade, passo e imagem de apoio são da sessão; o ZIP restaura a oficina nova na galeria', async ({
  page,
}) => {
  await page.goto('/?oficina=app')
  await createModel(page, 'backup-e2e')
  const reference = await sharp({
    create: { width: 20, height: 20, channels: 4, background: '#ef2244' },
  })
    .png()
    .toBuffer()
  await page.getByRole('button', { name: 'Imagem de apoio', exact: true }).click()
  await page
    .locator('input[name="molda-reference-file"]')
    .setInputFiles({ name: 'apoio.png', mimeType: 'image/png', buffer: reference })
  await expect(page.getByText('apoio.png', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Voltar ao modelo', exact: true }).click()
  await page.getByRole('button', { name: 'Mostrar grade', exact: true }).click()
  // O passo mora recolhido em "Mais ajustes do palco" desde o lote 7a: abrir faz parte do caminho.
  await page.getByText('Mais ajustes do palco', { exact: true }).click()
  await page.getByRole('combobox', { name: 'Passo do movimento', exact: true }).selectOption('0.5')
  await expect(page.getByRole('button', { name: 'Desfazer', exact: true })).toBeDisabled()
  await backToGallery(page)
  const backup = await downloaded(page, 'Baixar tudo')
  await page
    .locator('input[name="molda-backup"]')
    .setInputFiles({ name: backup.name, mimeType: 'application/zip', buffer: backup.bytes })
  await expect(page.getByRole('button', { name: 'Modelo backup-e2e-2', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Modelo backup-e2e-2', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Editar malha' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mostrar grade', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  // A oficina reaberta nasce com "Mais ajustes do palco" recolhido de novo.
  await page.getByText('Mais ajustes do palco', { exact: true }).click()
  await expect(page.getByRole('combobox', { name: 'Passo do movimento', exact: true })).toHaveValue(
    'free',
  )
  await page.getByRole('button', { name: 'Imagem de apoio', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Escolher imagem', exact: true })).toBeVisible()
  await expect(page.getByText('apoio.png', { exact: true })).toHaveCount(0)
})

test('falha ao carregar a oficina preserva a criação e oferece recuperação por recarregamento', async ({
  page,
}) => {
  let failed = false
  await page.route(/\/SceneWorkshopHost(?:\.tsx|-[\w-]+\.js)(?:\?.*)?$/, async (route) => {
    if (!failed) {
      failed = true
      await route.abort()
    } else await route.continue()
  })
  await page.goto('/?oficina=app')
  await createModel(page, 'recuperar-e2e')
  await expect(page.getByRole('button', { name: 'Recarregar página', exact: true })).toBeVisible()
  expect(failed).toBe(true)
  await page.getByRole('button', { name: 'Recarregar página', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Modelo recuperar-e2e', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Modelo recuperar-e2e', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Editar malha' })).toBeVisible()
})

async function restoreProject(page: Page, source: MoldaSceneDocument) {
  await page.goto('/?oficina=app')
  await expect(page.getByRole('heading', { name: 'Minhas criações 3D' })).toBeVisible()
  await page.locator('input[name="molda-backup"]').setInputFiles({
    name: 'projeto.molda.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(sceneToJson(source))),
  })
  await page.getByRole('button', { name: `Modelo ${source.name}`, exact: true }).click()
  await expect(page.getByRole('button', { name: 'Imagem de apoio', exact: true })).toBeEnabled()
}

async function nativeProject(page: Page) {
  const file = await downloaded(page, 'Baixar projeto')
  return JSON.parse(file.bytes.toString())
}

/** A tinta da peça no documento: a imagem de cor do material dela, ou nada. */
function colorImageOf(project: MoldaSceneDocument, nodeId: string) {
  const node = project.nodes.find((entry) => entry.id === nodeId)
  if (node?.kind !== 'mesh') throw new Error('Peça ausente.')
  const imageId = project.materials.find((entry) => entry.id === node.materialId)?.colorImageId
  return imageId ? project.images.find((entry) => entry.id === imageId) : undefined
}

test('pintar do jeito da criança: caixa, Pintar, uma cor, arrastar na peça; fora dela a câmera gira', async ({
  page,
  browserName,
}) => {
  // Arrastar no 3D por mouse sintético é instável no Firefox e no WebKit (o plano registra).
  test.skip(browserName !== 'chromium', 'o traço 3D do e2e roda no Chromium')
  test.setTimeout(60_000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/?oficina=app')
  // O modelo novo já nasce com uma caixa: é nela que a criança pinta primeiro.
  await createModel(page, 'pinta-e2e')
  await page.getByRole('button', { name: COPY.scene.select('caixa'), exact: true }).click()
  await page.getByRole('button', { name: COPY.editor.model.views.selection, exact: true }).click()
  const box = (await nativeProject(page)).nodes.find(
    (node: { name: string }) => node.name === 'caixa',
  )!.id as string
  await page.getByRole('button', { name: SCENE_PAINT_COPY.tab, exact: true }).click()
  // A peça escolhida já está pronta para a tinta, sem mudar de cor: nenhum painel aberto.
  const prepared = await nativeProject(page)
  const sheet = colorImageOf(prepared, box)
  expect(sheet).toBeDefined()
  // No JSON do projeto a camada vai em base64; zero em tudo = a cor da peça aparece igual.
  const pixels = Buffer.from(sheet!.layers[0]!.pixels as unknown as string, 'base64')
  expect(pixels.length).toBeGreaterThan(0)
  expect(pixels.every((value) => value === 0)).toBe(true)
  await expect(page.getByText(SCENE_PAINT_COPY.modelHint)).toBeVisible()
  const hex = resolvePaletteColors(prepared)[5]!
  await page.getByRole('button', { name: COPY.a11y.colorSwatch(5, hex), exact: true }).click()
  const stage = page.locator(`canvas[aria-label="${COPY.scene.viewport}"]`)
  const area = (await stage.boundingBox())!
  const center = { x: area.x + area.width / 2, y: area.y + area.height / 2 }
  await page.mouse.move(center.x - 6, center.y)
  await page.mouse.down()
  await page.mouse.move(center.x + 6, center.y + 4, { steps: 6 })
  await page.mouse.up()
  const painted = await nativeProject(page)
  expect(colorImageOf(painted, box)!.layers).not.toEqual(sheet!.layers)
  // Arrastar a partir do canto é o vazio: a câmera gira e a tinta fica como estava.
  await page.mouse.move(area.x + 12, area.y + 12)
  await page.mouse.down()
  await page.mouse.move(area.x + 80, area.y + 40, { steps: 6 })
  await page.mouse.up()
  expect(colorImageOf(await nativeProject(page), box)!.layers).toEqual(
    colorImageOf(painted, box)!.layers,
  )
  // Dois desfazer: o traço, e depois o lugar da tinta. Sem alerta.
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  expect(colorImageOf(await nativeProject(page), box)).toBeUndefined()
  await expect(page.getByText(SCENE_PAINT_COPY.choosePiece)).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('pintura 2D e prévia 3D compartilham pixels, desfazer e reabertura; movimento pronto vira clipe editável', async ({
  page,
}) => {
  test.setTimeout(60_000)
  const source = { ...animatedScene(), name: 'pintura-e2e', animations: [] }
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await restoreProject(page, source)
  await page.getByRole('button', { name: COPY.scene.select('corpo'), exact: true }).click()
  // O caminho avançado mora na aba Pintar, em "Mais jeitos de pintar".
  await page.getByRole('button', { name: SCENE_PAINT_COPY.tab, exact: true }).click()
  await page.getByText(SCENE_PAINT_COPY.more, { exact: true }).click()
  await page.getByText(COPY.scene.appearanceTitle, { exact: true }).click()
  const material = source.materials.find((entry) => entry.colorImageId === source.images[0]!.id)!
  await page.getByRole('combobox', { name: COPY.scene.materialChoose }).selectOption(material.id)
  await page.getByRole('button', { name: COPY.scene.paintLayer, exact: true }).click()
  const before = await nativeProject(page)
  const hex = resolvePaletteColors(source)[2]!
  await page.getByRole('button', { name: COPY.a11y.colorSwatch(2, hex), exact: true }).click()
  const canvas = page.getByRole('button', { name: COPY.scene.paintCanvas, exact: true })
  await canvas.scrollIntoViewIfNeeded()
  const box = (await canvas.boundingBox())!
  await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.25)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.7, { steps: 5 })
  await page.mouse.up()
  const painted = await nativeProject(page)
  expect(painted.images).not.toEqual(before.images)
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  expect((await nativeProject(page)).images).toEqual(before.images)
  await page.getByRole('button', { name: COPY.editor.redo, exact: true }).click()
  expect((await nativeProject(page)).images).toEqual(painted.images)
  await page.getByRole('button', { name: COPY.scene.animationMode, exact: true }).click()
  await page.getByText(COPY.scene.animationPresetTitle, { exact: true }).click()
  await page.getByRole('button', { name: COPY.scene.animationPresetPrepare, exact: true }).click()
  await page.getByRole('button', { name: COPY.scene.animationPresetConfirm, exact: true }).click()
  const animated = await nativeProject(page)
  expect(animated.animations).toHaveLength(1)
  expect(animated.animations[0].tracks.length).toBeGreaterThan(0)
  await page.getByRole('button', { name: COPY.scene.animationPlay, exact: true }).click()
  await expect(
    page.getByRole('button', { name: COPY.scene.animationPause, exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: COPY.scene.animationPause, exact: true }).click()
  await backToGallery(page)
  await page.getByRole('button', { name: 'Modelo pintura-e2e', exact: true }).click()
  const reopened = await nativeProject(page)
  expect(reopened.images).toEqual(painted.images)
  expect(reopened.animations).toEqual(animated.animations)
  expect(errors).toEqual([])
})

test('vincular uma malha aos apoios e desfazer usa a oficina pública e exporta ossos portáteis', async ({
  page,
}) => {
  test.setTimeout(60_000)
  const source = { ...makeSceneSkinFixture().document, name: 'ossos-e2e' }
  await restoreProject(page, source)
  await page
    .getByRole('button', { name: COPY.scene.select(source.nodes[0]!.name), exact: true })
    .click()
  await page.getByRole('button', { name: COPY.scene.skinBinding.open, exact: true }).click()
  const modal = page.getByRole('dialog', { name: COPY.scene.skinBinding.title })
  await modal.getByRole('checkbox', { name: `Braço ${COPY.scene.skinBinding.group}` }).check()
  await modal.getByRole('checkbox', { name: `Antebraço ${COPY.scene.skinBinding.locator}` }).check()
  await modal.getByRole('button', { name: COPY.scene.skinBinding.prepare, exact: true }).click()
  await modal.getByRole('button', { name: COPY.scene.skinBinding.apply, exact: true }).click()
  const bound = await nativeProject(page)
  expect(bound.skins).toHaveLength(1)
  expect(Object.keys(bound.skins[0].weights).length).toBeGreaterThan(0)
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  expect((await nativeProject(page)).skins).toBeUndefined()
  await page.getByRole('button', { name: COPY.editor.redo, exact: true }).click()
  expect((await nativeProject(page)).skins).toEqual(bound.skins)
  await page.getByRole('button', { name: COPY.scene.glbExport.open, exact: true }).click()
  await page.getByRole('button', { name: COPY.scene.glbExport.prepare, exact: true }).click()
  await page.getByLabel(COPY.scene.glbExport.accept).check()
  const file = await downloaded(page, COPY.scene.glbExport.download)
  const jsonLength = file.bytes.readUInt32LE(12)
  expect(JSON.parse(file.bytes.subarray(20, 20 + jsonLength).toString()).skins).toHaveLength(1)
})

test('duas abas detectam revisão externa e preservam a cópia local para recuperação', async ({
  page,
  context,
}) => {
  await page.goto('/?oficina=app')
  await createModel(page, 'abas-e2e')
  const original = await nativeProject(page)
  const second = await context.newPage()
  await second.goto('/?oficina=app')
  await second.getByRole('button', { name: 'Modelo abas-e2e', exact: true }).click()
  await expect(second.getByRole('button', { name: 'Imagem de apoio', exact: true })).toBeEnabled()
  await page.bringToFront()
  await page.getByText('Adicionar forma ou ponto', { exact: true }).click()
  await page.getByRole('button', { name: 'Caixa', exact: true }).click()
  await page.getByRole('button', { name: COPY.scene.save, exact: true }).click()
  await second.bringToFront()
  await expect(second.getByText(COPY.scene.conflict, { exact: true })).toBeVisible({
    timeout: 15_000,
  })
  expect((await nativeProject(second)).nodes).toEqual(original.nodes)
  expect((await nativeProject(page)).nodes.length).toBe(original.nodes.length + 1)
  await second.close()
})

test('vinte aberturas liberam o contexto gráfico e mantêm a memória limitada', async ({
  page,
  context,
  browserName,
}, info) => {
  test.skip(browserName !== 'chromium', 'Heap medido pelo protocolo do Chromium.')
  test.setTimeout(180_000)
  await page.addInitScript(() => {
    const contexts: WeakRef<WebGLRenderingContext | WebGL2RenderingContext>[] = []
    const original = HTMLCanvasElement.prototype.getContext
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value: function (this: HTMLCanvasElement, ...args: unknown[]) {
        const result = Reflect.apply(original, this, args)
        if (
          (args[0] === 'webgl' || args[0] === 'webgl2') &&
          result &&
          !contexts.some((ref) => ref.deref() === result)
        )
          contexts.push(new WeakRef(result))
        return result
      },
    })
    Object.defineProperty(window, 'activeMoldaContexts', {
      value: () =>
        contexts.filter((ref) => {
          const gl = ref.deref()
          return gl && !gl.isContextLost()
        }).length,
    })
  })
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.text().includes('Too many active WebGL')) errors.push(message.text())
  })
  const cdp = await context.newCDPSession(page)
  const samples: Array<{ cycle: number; heap: number; nodes: number }> = []
  await page.goto('/?oficina=app')
  await createModel(page, 'memoria-e2e')
  for (let cycle = 1; cycle <= 20; cycle++) {
    if (cycle > 1)
      await page.getByRole('button', { name: 'Modelo memoria-e2e', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Imagem de apoio', exact: true })).toBeEnabled()
    await expect
      .poll(() =>
        page.evaluate(() =>
          (window as unknown as { activeMoldaContexts(): number }).activeMoldaContexts(),
        ),
      )
      .toBeGreaterThan(0)
    await backToGallery(page)
    await expect
      .poll(() =>
        page.evaluate(() =>
          (window as unknown as { activeMoldaContexts(): number }).activeMoldaContexts(),
        ),
      )
      .toBe(0)
    if ([5, 10, 15, 20].includes(cycle)) {
      await cdp.send('HeapProfiler.collectGarbage')
      const heap = await cdp.send('Runtime.getHeapUsage'),
        dom = await cdp.send('Memory.getDOMCounters')
      samples.push({ cycle, heap: heap.usedSize, nodes: dom.nodes })
    }
  }
  await info.attach('memoria-20-aberturas.json', {
    body: JSON.stringify(samples, null, 2),
    contentType: 'application/json',
  })
  await writeFile(info.outputPath('memoria-20-aberturas.json'), JSON.stringify(samples, null, 2))
  expect(samples.at(-1)!.heap - samples[0]!.heap).toBeLessThan(12 * 1024 * 1024)
  expect(samples.at(-1)!.nodes - samples[0]!.nodes).toBeLessThan(100)
  expect(errors).toEqual([])
})
