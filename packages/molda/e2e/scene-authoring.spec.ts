import { expect, test } from '@playwright/test'
import { Vector3 } from 'three'
import { COPY } from '../src/core/copy'
import { sceneBounds } from '../src/scene/bounds'
import { indexSceneDocument } from '../src/scene/documentIndex'
import { sceneToJson } from '../src/scene/documentJson'
import { transformPoint } from '../src/scene/matrix'
import { sceneLocalBounds } from '../src/scene/pivot'
import { animatedScene } from '../src/testing/sceneAnimation'
import { ViewportCamera } from '../src/viewport/viewportCamera'

test.use({ hasTouch: false })

test('timeline header changes repeat and duration with one undo each', async ({ page }, info) => {
  const source = { ...animatedScene(), name: 'Farol de teste' }
  await page.goto('/?nivel=god')
  await page.locator('input[name="molda-backup"]').setInputFiles({
    name: 'farol.molda.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(sceneToJson(source))),
  })
  await page.getByRole('button', { name: 'Modelo Farol de teste', exact: true }).click()
  await page.getByRole('button', { name: COPY.scene.animationMode, exact: true }).click()
  const timeline = page.getByRole('region', { name: COPY.scene.animationTimeline })
  await expect(timeline.getByRole('button', { name: COPY.scene.animationPoseRecord })).toBeVisible()
  const repeat = timeline.getByRole('checkbox', { name: COPY.scene.animationLoop })
  await expect(repeat).toBeChecked()
  await timeline.getByText('Repetir', { exact: true }).click()
  await expect(repeat).not.toBeChecked()
  const duration = timeline.getByRole('spinbutton', { name: 'Duração do movimento' })
  await duration.fill('4')
  await duration.press('Enter')
  await expect(duration).toHaveValue('4')
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  await expect(duration).toHaveValue('2')
  await expect(repeat).not.toBeChecked()
  await page.screenshot({ path: info.outputPath('timeline-header.png') })
})

test('basic rings and scale preserve undo, and visible edge points cut two closed native pieces', async ({
  page,
}, info) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.setViewportSize({ width: 1440, height: 900 })
  const source = { ...animatedScene(), name: 'Girar e cortar' }
  source.animations![0]!.tracks = []
  await page.goto('/?nivel=explorer')
  await page.locator('input[name="molda-backup"]').setInputFiles({
    name: 'cortar.molda.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(sceneToJson(source))),
  })
  await page.getByRole('button', { name: 'Modelo Girar e cortar', exact: true }).click()
  await page.getByRole('button', { name: 'Escolher corpo', exact: true }).click()
  await page.getByRole('button', { name: 'Girar', exact: true }).click()
  const ring = page
    .getByRole('button', { name: 'Girar no eixo Y', exact: true })
    .locator('path')
    .last()
  const ringPoints = await ring.evaluate((el) => {
    const path = el as SVGPathElement,
      matrix = path.getScreenCTM()!
    return [0.15, 0.3].map((t) => {
      const point = path.getPointAtLength(path.getTotalLength() * t).matrixTransform(matrix)
      return { x: point.x, y: point.y }
    })
  })
  await page.mouse.move(ringPoints[0]!.x, ringPoints[0]!.y)
  await page.mouse.down()
  await page.mouse.move(ringPoints[1]!.x, ringPoints[1]!.y, { steps: 6 })
  await page.mouse.up()
  await expect(page.getByLabel('Giro Y', { exact: true })).not.toHaveValue('0')
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  await expect(page.getByLabel('Giro Y', { exact: true })).toHaveValue('0')
  await page.getByRole('button', { name: 'Tamanho', exact: true }).click()
  const tip = page
    .getByRole('button', { name: 'Tamanho no eixo X', exact: true })
    .locator('.mld-axis-tip')
  const rect = (await tip.boundingBox())!
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2)
  await page.mouse.down()
  await page.mouse.move(rect.x + 60, rect.y + 30, { steps: 5 })
  await expect(page.getByLabel('Tamanho X', { exact: true })).not.toHaveValue('4.00')
  await page.keyboard.press('Escape')
  await page.mouse.up()
  await expect(page.getByLabel('Tamanho X', { exact: true })).toHaveValue('4.00')
  await page.getByRole('button', { name: 'Tamanho no eixo X', exact: true }).press('ArrowRight')
  expect(Number(await page.getByLabel('Tamanho X', { exact: true }).inputValue())).toBeGreaterThan(
    4,
  )
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  await page.locator('summary').filter({ hasText: 'Vista: Livre' }).click()
  await page.getByRole('button', { name: COPY.editor.model.views.top, exact: true }).click()
  await page
    .locator('summary')
    .filter({ hasText: `Vista: ${COPY.editor.model.views.top}` })
    .click()
  await page.getByRole('button', { name: 'Enquadrar', exact: true }).click()
  await page.locator('summary').filter({ hasText: 'Seleção e organização' }).click()
  await page.getByRole('button', { name: 'Separar peça', exact: true }).click()
  const canvas = page.locator('canvas').first(),
    box = (await canvas.boundingBox())!
  const index = indexSceneDocument(source),
    bounds = sceneBounds(index)!,
    local = sceneLocalBounds(source, 'body')!,
    world = index.scene.worldMatrices.get('body')!
  const rig = new ViewportCamera('orthographic')
  rig.aspect = box.width / box.height
  rig.setView('top', bounds)
  rig.frame(bounds)
  const points = [local.min[0], local.max[0]].map((x) => {
    const p = new Vector3(...transformPoint(world, [x, local.max[1], local.center[2]])).project(
      rig.camera,
    )
    return { x: box.x + ((p.x + 1) * box.width) / 2, y: box.y + ((1 - p.y) * box.height) / 2 }
  })
  await page.screenshot({ path: info.outputPath('cortar-antes-dos-pontos.png') })
  await info.attach('coordenadas-de-corte', {
    body: JSON.stringify({ box, points, bounds, local }),
    contentType: 'application/json',
  })
  await page.mouse.click(points[0]!.x, points[0]!.y)
  await expect(page.locator('.mld-cut-point-count')).toHaveText('1 ponto marcado')
  await page.mouse.click(points[1]!.x, points[1]!.y)
  await expect(page.locator('.mld-cut-point-count')).toHaveText('2 pontos marcados')
  await expect(
    page
      .getByRole('region', { name: 'Separar a peça' })
      .getByRole('button', { name: 'Separar', exact: true }),
  ).toBeEnabled()
  await page.screenshot({ path: info.outputPath('cortar-pontos-1440.png') })
  await canvas.focus()
  await page.keyboard.press('Backspace')
  await expect(page.locator('.mld-cut-point-count')).toHaveText('1 ponto marcado')
  await page.mouse.click(points[1]!.x, points[1]!.y)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Escolher corpo (1)', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Escolher corpo (2)', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Escolher corpo (1)', exact: true }).click()
  await expect(page.getByLabel('Tamanho Z', { exact: true })).toHaveValue('3.00')
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  await expect(page.getByRole('button', { name: 'Escolher corpo', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: COPY.editor.undo, exact: true })).toBeDisabled()
  expect(errors).toEqual([])
})

test('intermediate precision opens local axes, pivot Y, alignment and a worker-backed numeric cut', async ({
  page,
}, info) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/?nivel=architect')
  await page.locator('input[name="molda-backup"]').setInputFiles({
    name: 'precisao.molda.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(sceneToJson({ ...animatedScene(), name: 'Precisão' }))),
  })
  await page.getByRole('button', { name: 'Modelo Precisão', exact: true }).click()
  await page.getByRole('button', { name: 'Escolher asa', exact: true }).click()
  const originalX = await page.getByLabel('Posição X', { exact: true }).inputValue()
  await page
    .getByRole('button', { name: 'Escolher corpo', exact: true })
    .click({ modifiers: ['Shift'] })
  await page.locator('summary').filter({ hasText: 'Alinhar e distribuir' }).click()
  const alignment = page
    .locator('details')
    .filter({ has: page.locator('summary', { hasText: 'Alinhar e distribuir' }) })
    .last()
  await alignment.getByRole('button', { name: 'Início', exact: true }).click()
  await page.getByRole('button', { name: 'Escolher asa', exact: true }).click()
  await expect(page.getByLabel('Posição X', { exact: true })).not.toHaveValue(originalX)
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  await expect(page.getByLabel('Posição X', { exact: true })).toHaveValue(originalX)
  await page.locator('summary').filter({ hasText: 'Mais ajustes do palco' }).click()
  await page
    .getByRole('combobox', { name: 'Eixos de Mover e Girar', exact: true })
    .selectOption('local')
  await page.locator('summary').filter({ hasText: 'Mais ajustes do palco' }).click()
  await page.getByRole('button', { name: 'Pivô', exact: true }).click()
  await page.locator('summary').filter({ hasText: 'Ajuste fino' }).click()
  await page.getByRole('checkbox', { name: 'Mover para cima e para baixo' }).check()
  await expect(page.getByRole('button', { name: 'Pivô no eixo Y', exact: true })).toBeVisible()
  await page.locator('summary').filter({ hasText: 'Seleção e organização' }).click()
  await page.getByRole('button', { name: 'Separar peça', exact: true }).click()
  await page.locator('summary').filter({ hasText: 'Precisão do corte' }).click()
  const bar = page.getByRole('region', { name: 'Separar a peça' })
  await bar.getByRole('button', { name: 'Conferir plano', exact: true }).click()
  await page.locator('summary').filter({ hasText: 'Precisão do corte' }).click()
  await page.screenshot({ path: info.outputPath('intermediario-corte-numerico.png') })
  await bar.getByRole('button', { name: 'Separar', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Escolher asa (1)', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Escolher asa (2)', exact: true })).toBeVisible()
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  await expect(page.getByRole('button', { name: 'Escolher asa', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: COPY.editor.undo, exact: true })).toBeDisabled()
  expect(errors).toEqual([])
})

test('advanced curves and UV keep the live stage, exact times and reversible graph gestures', async ({
  page,
}, info) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/?nivel=god')
  await page.locator('input[name="molda-backup"]').setInputFiles({
    name: 'curvas.molda.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(sceneToJson({ ...animatedScene(), name: 'Curvas e UV' }))),
  })
  await page.getByRole('button', { name: 'Modelo Curvas e UV', exact: true }).click()
  await page.getByRole('button', { name: 'Escolher corpo', exact: true }).click()
  const stage = page.locator('canvas').first()
  const originalCanvas = await stage.elementHandle()
  await page
    .getByRole('navigation', { name: 'Áreas da oficina' })
    .getByRole('button', { name: 'Editar malha', exact: true })
    .click()
  await page
    .locator('.mld-component-root')
    .getByRole('button', { name: 'Pintura da face', exact: true })
    .click()
  const uv = page.getByRole('region', { name: 'Pintura da face', exact: true })
  await expect(uv.getByRole('img', { name: COPY.scene.uvCanvas, exact: true })).toBeVisible()
  await expect(uv.getByRole('spinbutton')).toHaveCount(0)
  const canvasBounds = await stage.boundingBox(),
    uvBounds = await uv.boundingBox()
  expect(canvasBounds!.x + canvasBounds!.width).toBeLessThanOrEqual(uvBounds!.x + 1)
  await expect(page.getByRole('button', { name: COPY.editor.undo, exact: true })).toBeDisabled()
  await uv.getByRole('button', { name: 'Faces', exact: true }).click()
  await page.getByRole('button', { name: 'Animar', exact: true }).click()
  await page.getByRole('button', { name: 'Curvas', exact: true }).click()
  const curves = page.getByRole('region', { name: 'Editor de curvas' })
  await curves.getByRole('button', { name: /Mover · corpo: 3 poses/ }).press('ArrowRight')
  await expect(curves.getByLabel('Tempo (s)', { exact: true })).toHaveValue('1.123456789123')
  const handle = curves.getByRole('button', { name: 'Arrastar valor da pose na curva' })
  let bounds = await handle.boundingBox()
  await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2)
  await page.mouse.down()
  await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2 + 30, {
    steps: 3,
  })
  await expect(curves.getByRole('button', { name: 'Aplicar curva' })).toBeVisible()
  await expect(page.getByRole('button', { name: COPY.editor.undo, exact: true })).toBeDisabled()
  await page.keyboard.press('Escape')
  await page.mouse.up()
  await expect(curves.getByRole('button', { name: 'Aplicar curva' })).toHaveCount(0)
  await expect(curves.getByLabel('Valor X', { exact: true })).toHaveValue('1.123456789')
  bounds = await handle.boundingBox()
  await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2)
  await page.mouse.down()
  await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2 + 30, {
    steps: 3,
  })
  await page.mouse.up()
  await expect(page.getByRole('button', { name: COPY.editor.undo, exact: true })).toBeEnabled()
  await expect(curves.getByLabel('Valor X', { exact: true })).not.toHaveValue('1.123456789')
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  await expect(curves.getByLabel('Valor X', { exact: true })).toHaveValue('1.123456789')
  await expect(curves.getByLabel('Tempo (s)', { exact: true })).toHaveValue('1.123456789123')
  expect(await stage.evaluate((canvas, original) => canvas === original, originalCanvas)).toBe(true)
  await page.screenshot({ path: info.outputPath('avancado-curvas-1440.png') })
  await page.setViewportSize({ width: 1024, height: 768 })
  await expect(curves.getByLabel('Valor X', { exact: true })).toBeVisible()
  expect(errors).toEqual([])
})

test('paint uses the real UV grid, saved palette, temporary picker and one undo per stroke', async ({
  page,
}, info) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/?nivel=explorer')
  await page.locator('input[name="molda-backup"]').setInputFiles({
    name: 'pintar.molda.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(sceneToJson({ ...animatedScene(), name: 'Pintura real' }))),
  })
  await page.getByRole('button', { name: 'Modelo Pintura real', exact: true }).click()
  await page.getByRole('button', { name: 'Escolher corpo', exact: true }).click()
  await page.getByRole('button', { name: 'Pintar', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Todas as peças', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.locator('summary').filter({ hasText: 'Criar outra cor' }).click()
  await page.getByLabel('Cor hexadecimal', { exact: true }).fill('#f0352b')
  await page.getByLabel('Cor hexadecimal', { exact: true }).press('Enter')
  await page.getByRole('button', { name: 'Guardar cor favorita', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Guardar cor favorita', exact: true }),
  ).toBeDisabled()
  await expect(
    page.getByRole('button', { name: 'Usadas agora: #f0352b', exact: true }),
  ).toHaveCount(0)
  const sv = (await page.getByRole('slider', { name: 'Saturação e luminosidade' }).boundingBox())!
  await page.mouse.move(sv.x + sv.width * 0.3, sv.y + sv.height * 0.6)
  await page.mouse.down()
  await page.mouse.move(sv.x + sv.width * 0.7, sv.y + sv.height * 0.2)
  await expect(page.getByLabel('Cor hexadecimal', { exact: true })).not.toHaveValue('#f0352b')
  await page.keyboard.press('Escape')
  await page.mouse.up()
  await expect(page.getByLabel('Cor hexadecimal', { exact: true })).toHaveValue('#f0352b')
  await expect(page.getByRole('button', { name: COPY.editor.undo, exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Quadradinhos', exact: true }).click()
  await page.getByRole('button', { name: 'Espelho de pintura', exact: true }).click()
  const canvas = page.locator('canvas').first()
  const bounds = (await canvas.boundingBox())!
  const x = bounds.x + bounds.width / 2,
    y = bounds.y + bounds.height / 2
  await canvas.focus()
  await page.keyboard.down('Alt')
  await expect(page.locator('[data-paint-tool="paint.picker"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.keyboard.up('Alt')
  await expect(page.locator('[data-paint-tool="paint.pencil"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + 35, y + 20, { steps: 6 })
  await page.mouse.up()
  await expect(
    page.getByRole('button', { name: 'Usadas agora: #f0352b', exact: true }),
  ).toBeVisible()
  const palette = page.locator('.mld-paint-swatches')
  const paletteBounds = (await palette.boundingBox())!
  const swatches = await palette.locator('button').all()
  let previous: { x: number; y: number; width: number; height: number } | null = null
  for (const swatch of swatches) {
    const bounds = (await swatch.boundingBox())!
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(paletteBounds.x + paletteBounds.width + 1)
    if (previous && Math.abs(previous.y - bounds.y) < 1)
      expect(bounds.x).toBeGreaterThanOrEqual(previous.x + previous.width + 4)
    previous = bounds
  }
  await expect(page.getByText(COPY.gallery.imported(1), { exact: true })).toHaveCount(0, {
    timeout: 15000,
  })
  await page.screenshot({ path: info.outputPath('pintar-1440.png') })
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  await expect(page.getByRole('button', { name: COPY.editor.undo, exact: true })).toBeDisabled()
  for (const width of [1024, 768, 390]) {
    await page.setViewportSize({ width, height: 900 })
    await expect(page.getByRole('button', { name: 'Todas as peças', exact: true })).toBeVisible()
    const stage = (await page.locator('.mld-workshop-stage').boundingBox())!
    for (const control of await page.locator('.mld-stage-toolbar button:visible').all()) {
      const bounds = (await control.boundingBox())!
      expect(
        bounds.x,
        (await control.getAttribute('aria-label')) ?? (await control.textContent()) ?? '',
      ).toBeGreaterThanOrEqual(stage.x)
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(stage.x + stage.width + 1)
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    ).toBeLessThanOrEqual(1)
    await page.getByLabel('Cor hexadecimal', { exact: true }).scrollIntoViewIfNeeded()
    await expect(page.getByLabel('Cor hexadecimal', { exact: true })).toBeVisible()
    await page.screenshot({ path: info.outputPath(`pintar-${width}.png`) })
  }
  // Changing theme by navigation must wait for the final Undo to reach storage.
  // Reload recovery has its own scenarios; this one verifies persisted paint controls.
  await expect(page.locator('.mld-save-status')).toHaveAttribute('data-state', 'saved')
  await page.goto('/?nivel=explorer&tema=escuro')
  await page.getByRole('button', { name: 'Modelo Pintura real', exact: true }).click()
  await page.getByRole('button', { name: 'Pintar', exact: true }).click()
  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(page.getByRole('button', { name: /Cor \d+ #f0352b/ })).toBeVisible()
  await page.screenshot({ path: info.outputPath('pintar-escuro.png') })
  expect(errors).toEqual([])
})

test('basic authoring keeps the reference layout and exact imported key times', async ({
  page,
}, info) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.setViewportSize({ width: 1440, height: 900 })
  const source = { ...animatedScene(), name: 'Fidelidade' }
  await page.goto('/?nivel=explorer')
  await page.locator('input[name="molda-backup"]').setInputFiles({
    name: 'referencia.molda.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(sceneToJson(source))),
  })
  await page.getByRole('button', { name: 'Modelo Fidelidade', exact: true }).click()
  await page.getByRole('button', { name: 'Escolher corpo', exact: true }).click()
  await expect(page.getByLabel('Posição X', { exact: true })).toBeVisible()
  await expect(page.locator('canvas').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mover', exact: true })).toBeEnabled()
  await expect(page.getByText(COPY.gallery.imported(1), { exact: true })).toHaveCount(0, {
    timeout: 15000,
  })
  await page.screenshot({ path: info.outputPath('modelar-1440.png') })
  await page.getByRole('button', { name: 'Animar', exact: true }).click()
  await page.getByRole('button', { name: 'Canais de corpo' }).click()
  await page.getByRole('button', { name: 'Mover: 3 poses', exact: true }).press('ArrowRight')
  await expect(page.getByLabel(COPY.scene.animationSeconds, { exact: true })).toHaveValue(
    '1.123456789123',
  )
  const poseTime = page.getByLabel('Tempo da pose escolhida', { exact: true })
  for (const effect of ['Suave', 'Ritmo constante', 'De uma vez'])
    await expect(page.getByRole('button', { name: effect, exact: true })).toBeVisible()
  await expect(poseTime).toBeHidden()
  await page.locator('summary').filter({ hasText: 'Mudar tempo da pose' }).click()
  await expect(poseTime).toBeVisible()
  await page.locator('summary').filter({ hasText: 'Mudar tempo da pose' }).click()
  await expect(page.getByRole('separator', { name: 'Altura da linha do tempo' })).toHaveAttribute(
    'aria-valuenow',
    '306',
  )
  await page.screenshot({ path: info.outputPath('animar-1440.png') })
  const timeline = await page.getByRole('region', { name: 'Linha do tempo' }).boundingBox()
  expect(timeline?.height).toBe(306)
  expect(timeline?.x).toBe(104)
  expect(timeline?.width).toBe(1016)
  const playhead = page.locator('.mld-timeline-playhead')
  const playheadBounds = (await playhead.boundingBox())!
  expect(playheadBounds.height).toBe(245)
  expect(playheadBounds.y).toBe(timeline!.y + 61)
  const ruler = (await page.locator('.mld-timeline-ruler').boundingBox())!
  const timeX = (time: number) => ruler.x + 14 + (time / 2) * (ruler.width - 28)
  const selectedStrip = (await page.getByRole('button', { name: /^Mover: 3 poses/ }).boundingBox())!
  const selectedPoseX = selectedStrip.x + 14 + (1.123456789123 / 2) * (selectedStrip.width - 28)
  expect(playheadBounds.x + playheadBounds.width / 2).toBeCloseTo(selectedPoseX, 0)
  await page.locator('.mld-timeline > .mld-scroll-y').evaluate((element) => {
    element.setAttribute('style', 'flex: none; height: 70px')
  })
  const scrolledStrip = (await page.getByRole('button', { name: /^Mover: 3 poses/ }).boundingBox())!
  const scrolledPlayhead = (await playhead.boundingBox())!
  const scrolledPoseX = scrolledStrip.x + 14 + (1.123456789123 / 2) * (scrolledStrip.width - 28)
  expect(scrolledPlayhead.x + scrolledPlayhead.width / 2).toBeCloseTo(scrolledPoseX, 0)
  await page.locator('.mld-timeline > .mld-scroll-y').evaluate((element) => {
    element.removeAttribute('style')
  })
  const seconds = page.getByLabel(COPY.scene.animationSeconds, { exact: true })
  await page.mouse.move(timeX(1.123456789123), ruler.y + 8)
  await page.mouse.down()
  await page.mouse.move(timeX(0.4), ruler.y + 8, { steps: 4 })
  await expect(seconds).toHaveValue('0.4')
  await page.mouse.move(timeX(0.75), ruler.y + 8, { steps: 4 })
  await expect(seconds).toHaveValue('0.75')
  await page.keyboard.press('Escape')
  await page.mouse.up()
  await expect(seconds).toHaveValue('1.123456789123')
  const emptyTrack = (await page
    .getByRole('button', { name: 'Girar: 0 poses', exact: true })
    .boundingBox())!
  const lineY = emptyTrack.y + emptyTrack.height / 2
  await page.mouse.move(timeX(1.123456789123), lineY)
  await page.mouse.down()
  await page.mouse.move(timeX(0.6), lineY, { steps: 4 })
  await expect(seconds).toHaveValue('0.6')
  await page.mouse.move(timeX(1.123456789123) + 3, lineY, { steps: 4 })
  await page.mouse.up()
  await expect(seconds).toHaveValue('1.123456789123')
  const track = page.getByRole('button', { name: /^Mover: 3 poses/ })
  const trackBounds = (await track.boundingBox())!
  const keyY = trackBounds.y + trackBounds.height / 2
  await page.mouse.move(timeX(1.123456789123), keyY)
  await page.mouse.down()
  await page.mouse.move(timeX(1.4), keyY, { steps: 5 })
  await page.mouse.up()
  await expect(page.getByLabel('Tempo da pose escolhida', { exact: true })).toHaveValue('1.4')
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  await expect(page.getByRole('button', { name: COPY.editor.undo, exact: true })).toBeDisabled()
  await page.mouse.move(timeX(1.123456789123), keyY)
  await page.mouse.down()
  await page.mouse.move(timeX(2), keyY, { steps: 5 })
  await page.mouse.up()
  await expect(page.getByLabel('Tempo da pose escolhida', { exact: true })).toHaveValue(
    '1.123456789123',
  )
  await expect(page.getByRole('button', { name: COPY.editor.undo, exact: true })).toBeDisabled()
  for (const width of [1024, 768, 390]) {
    await page.setViewportSize({ width, height: 900 })
    await expect(page.getByRole('region', { name: 'Linha do tempo' })).toBeVisible()
    const responsiveStrip = (await page
      .getByRole('button', { name: /^Mover: 3 poses/ })
      .boundingBox())!
    const responsivePlayhead = (await playhead.boundingBox())!
    const responsivePoseX =
      responsiveStrip.x + 14 + (1.123456789123 / 2) * (responsiveStrip.width - 28)
    expect(responsivePlayhead.x + responsivePlayhead.width / 2).toBeCloseTo(responsivePoseX, 0)
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    ).toBeLessThanOrEqual(1)
    await page.screenshot({ path: info.outputPath(`animar-${width}.png`) })
  }
  expect(errors).toEqual([])
})

test('move and pivot handles commit one drag, cancel interruptions and work while posing', async ({
  page,
}, info) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.setViewportSize({ width: 1440, height: 900 })
  const source = { ...animatedScene(), name: 'Pivô real' }
  source.animations![0]!.tracks = []
  await page.goto('/?nivel=explorer')
  await page.locator('input[name="molda-backup"]').setInputFiles({
    name: 'pivo.molda.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(sceneToJson(source))),
  })
  await page.getByRole('button', { name: 'Modelo Pivô real', exact: true }).click()
  await page.getByRole('button', { name: 'Escolher corpo', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Mover', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Mover', exact: true }).click()
  await page.getByRole('button', { name: 'Mover no eixo X', exact: true }).press('ArrowRight')
  await expect(page.getByLabel('Posição X', { exact: true })).toHaveValue('1.00')
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  await expect(page.getByLabel('Posição X', { exact: true })).toHaveValue('0.00')
  await page.getByRole('button', { name: 'Pivô', exact: true }).click()
  await page.getByRole('button', { name: 'Na base', exact: true }).click()
  await page.getByText('Ajuste fino', { exact: true }).click()
  const pivotX = page.getByLabel('Pivô · o ponto onde a peça gira X', { exact: true })
  await pivotX.fill('2')
  await pivotX.press('Enter')
  await expect(pivotX).toHaveValue('2')
  await expect(page.getByRole('button', { name: 'Na base', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
  await expect(page.getByRole('button', { name: 'No meio', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
  await page.screenshot({ path: info.outputPath('pivo-1440.png') })
  const drag = async (cancel: boolean) => {
    const circle = page
      .getByRole('button', { name: 'Pivô no eixo X', exact: true })
      .locator('circle')
    await circle.hover()
    const rect = (await circle.boundingBox())!
    const x = rect.x + rect.width / 2,
      y = rect.y + rect.height / 2
    await page.mouse.down()
    await page.mouse.move(x + 15, y + 8, { steps: 3 })
    const first = await pivotX.inputValue()
    await page.mouse.move(x + 30, y + 16, { steps: 3 })
    await expect.poll(() => pivotX.inputValue()).not.toBe(first)
    if (cancel) await page.keyboard.press('Escape')
    await page.mouse.up()
  }
  await drag(true)
  await expect(pivotX).toHaveValue('2')
  await drag(false)
  expect(await pivotX.inputValue()).not.toBe('2')
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  await expect(pivotX).toHaveValue('2')
  await page.getByRole('button', { name: 'Animar', exact: true }).click()
  await page.getByRole('button', { name: 'Pivô', exact: true }).click()
  await page.getByText('Ajuste fino', { exact: true }).click()
  await page.screenshot({ path: info.outputPath('pivo-animar-before.png') })
  await drag(false)
  expect(await pivotX.inputValue()).not.toBe('2')
  expect(errors).toEqual([])
})

test('intermediate batch edits preview, cancel, confirm and undo without changing the saved scene early', async ({
  page,
}, info) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/?nivel=architect')
  await page.locator('input[name="molda-backup"]').setInputFiles({
    name: 'conjunto.molda.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(sceneToJson({ ...animatedScene(), name: 'Conjuntos' }))),
  })
  await page.getByRole('button', { name: 'Modelo Conjuntos', exact: true }).click()
  await page.getByRole('button', { name: 'Escolher corpo', exact: true }).click()
  await page.getByRole('button', { name: 'Animar', exact: true }).click()
  const prepareCopy = async () => {
    const morePoses = page.locator('details').filter({
      has: page.locator('summary', { hasText: 'Mais ferramentas de pose' }),
    })
    if ((await morePoses.getAttribute('open')) === null)
      await morePoses.locator('summary').first().click()
    const details = page
      .locator('details')
      .filter({ has: page.locator('summary', { hasText: COPY.scene.animationKeyTools }) })
      .last()
    if ((await details.getAttribute('open')) === null) await details.locator('summary').click()
    await page.getByLabel(COPY.scene.animationRangeStart, { exact: true }).fill('0')
    await page.getByLabel(COPY.scene.animationRangeEnd, { exact: true }).fill('0')
    await page.getByLabel(COPY.scene.animationOffset, { exact: true }).fill('0.5')
    await page.getByRole('button', { name: COPY.scene.animationKeysCopy, exact: true }).click()
    await expect(page.getByText('Prévia do conjunto de poses', { exact: true })).toBeVisible()
  }
  await prepareCopy()
  await expect(page.getByRole('button', { name: COPY.editor.undo, exact: true })).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(page.getByText('Prévia do conjunto de poses', { exact: true })).toHaveCount(0)
  await prepareCopy()
  await page.getByRole('button', { name: 'Aplicar ajuste', exact: true }).click()
  await page.getByRole('button', { name: 'Canais de corpo', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Mover: 4 poses', exact: true })).toBeVisible()
  await page.getByRole('button', { name: COPY.editor.undo, exact: true }).click()
  await expect(page.getByRole('button', { name: 'Mover: 3 poses', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: COPY.editor.undo, exact: true })).toBeDisabled()
  await prepareCopy()
  await page.getByRole('button', { name: 'Modelar', exact: true }).click()
  const dialog = page.getByRole('dialog', {
    name: 'Este conjunto de poses está em prévia',
    exact: true,
  })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Descartar prévia', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Modelar', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.getByRole('button', { name: COPY.editor.undo, exact: true })).toBeDisabled()
  await page.screenshot({ path: info.outputPath('intermediario-modelar.png') })
  expect(errors).toEqual([])
})
