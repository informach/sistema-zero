import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import type { MoldaSceneJson } from '../src/scene/documentJson'

test('criação rápida, montagem, pose de várias peças e telas menores', async ({
  browser,
}, info) => {
  test.setTimeout(120_000)
  const context = await browser.newContext({ baseURL: String(info.project.use.baseURL) })
  context.setDefaultTimeout(15000)
  const out = info.outputPath('evidence')
  fs.mkdirSync(out, { recursive: true })
  try {
    const page = await context.newPage()
    await page.setViewportSize({ width: 1366, height: 768 })
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('/?nivel=explorer')
    await page.getByRole('button', { name: 'Criar novo' }).click()
    await page.getByRole('button', { name: 'Criar modelo' }).click()
    await page.getByRole('button', { name: 'Caixa', exact: true }).waitFor()
    await expect(page.getByRole('button', { name: 'Aproximar', exact: true })).toBeEnabled()
    await expect(page.getByRole('button', { name: 'Mover', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await page.screenshot({ path: path.join(out, 'modelar-1366.png'), animations: 'disabled' })
    const metrics: Record<string, unknown> = {
      modelar: await page.locator('canvas').first().boundingBox(),
    }
    await page.getByRole('button', { name: 'Bola', exact: true }).click()
    await page.locator('summary').filter({ hasText: 'Ajustar por cliques' }).click()
    await page.getByRole('button', { name: 'Colocar em cima', exact: true }).click()
    await page.getByRole('button', { name: /^Escolher caixa$/i }).click()
    await page.getByRole('button', { name: 'Pintar', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Pincel', exact: true })).toBeVisible()
    await page.screenshot({ path: path.join(out, 'pintar-1366.png'), animations: 'disabled' })
    await page.getByRole('button', { name: 'Animar', exact: true }).click()
    await page.getByRole('button', { name: 'Criar movimento', exact: true }).click()
    await page.getByRole('button', { name: /^Escolher caixa$/i }).click()
    await page.getByRole('button', { name: /^Escolher bola$/i }).click({ modifiers: ['Shift'] })
    await expect(page.getByRole('button', { name: /^Escolher caixa$/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(page.getByRole('button', { name: /^Escolher bola$/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await page.getByRole('button', { name: 'Mover', exact: true }).click()
    await page.locator('summary').filter({ hasText: 'Valores e organização do movimento' }).click()
    await page.getByRole('spinbutton', { name: 'Ir para o tempo (segundos)' }).fill('0.5')
    await page.getByRole('spinbutton', { name: 'Ir para o tempo (segundos)' }).blur()
    await page.getByRole('button', { name: 'Mover Altura · Y mais', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Marcar pose', exact: true })).toBeEnabled()
    await page.getByRole('button', { name: /^Escolher caixa$/i }).click()
    await page.getByRole('button', { name: 'Mover Lado · X mais', exact: true }).click()
    await page.getByRole('button', { name: 'Modelar', exact: true }).click()
    await expect(
      page.getByRole('dialog', { name: 'Esta pose ainda não foi marcada' }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Continuar ajustando', exact: true }).click()
    await page.getByRole('button', { name: 'Marcar pose', exact: true }).click()
    await page.getByRole('button', { name: 'Mais tempo · +2 s', exact: true }).click()
    await page.screenshot({ path: path.join(out, 'animar-1366.png'), animations: 'disabled' })
    metrics.animar = await page.locator('canvas').first().boundingBox()
    for (const [width, height] of [
      [1440, 900],
      [1024, 600],
    ] as const) {
      await page.setViewportSize({ width, height })
      if (width === 1024) await page.getByRole('tab', { name: 'Pose', exact: true }).click()
      await page.screenshot({ path: path.join(out, `animar-${width}.png`), animations: 'disabled' })
      metrics[`animar-${width}`] = await page.locator('canvas').first().boundingBox()
    }
    expect(errors).toEqual([])
    fs.writeFileSync(path.join(out, 'smoke.json'), JSON.stringify({ errors, metrics }, null, 2))
    console.log(JSON.stringify({ errors, metrics }))
  } finally {
    await context.close()
  }
})

test('pintura real, cor composta, movimento e recuperação da pose após recarregar', async ({
  browser,
}, info) => {
  test.setTimeout(120_000)
  const context = await browser.newContext({ baseURL: String(info.project.use.baseURL) })
  context.setDefaultTimeout(15000)
  const out = info.outputPath('evidence')
  fs.mkdirSync(out, { recursive: true })
  const page = await context.newPage()
  await page.setViewportSize({ width: 1366, height: 768 })
  const errors: string[] = [],
    checks = []
  page.on('pageerror', (error) => errors.push(error.message))
  async function shot(name: string) {
    await page.screenshot({ path: path.join(out, `${name}.png`), animations: 'disabled' })
  }
  async function snapshot() {
    const menu = page.locator('summary').filter({ hasText: 'Salvar e exportar' })
    if (!(await menu.evaluate((el) => el.closest('details')?.open))) await menu.click()
    const pending = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Baixar projeto', exact: true }).click()
    const download = await pending
    const data = JSON.parse(fs.readFileSync(await download.path(), 'utf8')) as MoldaSceneJson
    if (await menu.evaluate((el) => el.closest('details')?.open)) await menu.click()
    return data
  }
  async function center() {
    const box = await page.locator('canvas').first().boundingBox()
    if (!box) throw new Error('Palco sem área visível')
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  }
  async function stroke(point: { x: number; y: number }, length = 24) {
    await page.mouse.move(point.x - length / 2, point.y)
    await page.mouse.down()
    await page.mouse.move(point.x + length / 2, point.y, { steps: 8 })
    await page.mouse.up()
  }
  try {
    await page.goto('/?nivel=explorer')
    await page.getByRole('button', { name: 'Criar novo', exact: true }).click()
    await page.getByRole('button', { name: 'Criar modelo', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Aproximar', exact: true })).toBeEnabled()
    await shot('modelar-ready')
    const initial = await snapshot()
    await page.locator('summary').filter({ hasText: 'Vista: Livre' }).click()
    await page.getByRole('button', { name: 'Frente', exact: true }).click()
    const viewMenu = page.locator('summary').filter({ hasText: 'Vista: Frente' })
    if (await viewMenu.evaluate((el) => el.closest('details')?.open)) await viewMenu.click()
    await page.getByRole('button', { name: 'Enquadrar', exact: true }).click()
    await page.getByRole('button', { name: 'Pintar', exact: true }).click()
    await expect(page.getByRole('button', { name: '1 px', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await page.getByRole('button', { name: /^Cor 2 / }).click()
    await page.getByRole('button', { name: 'Balde', exact: true }).click()
    await page.getByRole('radio', { name: 'Cor de fundo da peça' }).check()
    const point = await center()
    await page.mouse.click(point.x, point.y)
    const redBase = await snapshot()
    const baseColor = redBase.materials[0]!.baseColor
    expect(baseColor.kind).toBe('rgba')
    if (baseColor.kind !== 'rgba') throw new Error('Cor de fundo ausente')
    expect(baseColor.value[0]).toBe(1)
    checks.push('base fill changes only the piece background')
    await page.getByRole('button', { name: 'Pincel', exact: true }).click()
    await page.getByRole('button', { name: /^Cor 15 / }).click()
    await stroke(point)
    const painted = await snapshot()
    const paintedPixels = painted.images.map((image) => image.layers.map((layer) => layer.pixels))
    expect(paintedPixels).not.toEqual(
      redBase.images.map((image) => image.layers.map((layer) => layer.pixels)),
    )
    await shot('pintar-traco-real')
    await page.getByRole('button', { name: 'Borracha', exact: true }).click()
    await stroke(point)
    const erased = await snapshot()
    expect(erased.images.map((image) => image.layers.map((layer) => layer.pixels))).not.toEqual(
      paintedPixels,
    )
    expect(erased.materials[0]!.baseColor).toEqual(redBase.materials[0]!.baseColor)
    await page.getByRole('button', { name: 'Desfazer', exact: true }).click()
    const undone = await snapshot()
    expect(undone.images.map((image) => image.layers.map((layer) => layer.pixels))).toEqual(
      paintedPixels,
    )
    await page.getByRole('button', { name: 'Pegar cor', exact: true }).click()
    await page.mouse.click(point.x, point.y + 35)
    await expect(page.getByRole('button', { name: 'Pincel', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    checks.push('real brush, eraser, undo and composite picker')
    await page.getByRole('button', { name: 'Modelar', exact: true }).click()
    await page.getByRole('button', { name: 'Bola', exact: true }).click()
    await page.locator('summary').filter({ hasText: 'Ajustar por cliques' }).click()
    await page.getByRole('button', { name: 'Colocar em cima', exact: true }).click()
    await page.getByRole('button', { name: /^Escolher caixa/ }).click()
    await page.getByRole('button', { name: 'Animar', exact: true }).click()
    await page
      .getByRole('button', { name: 'Experimentar um movimento pronto', exact: true })
      .click()
    await page.getByRole('button', { name: 'Modelo inteiro', exact: true }).click()
    const previewSource = await snapshot()
    expect(previewSource.nodes.filter((node) => node.kind === 'group')).toHaveLength(0)
    await page.getByRole('button', { name: 'Pular', exact: true }).click()
    await expect(
      page.getByRole('button', { name: 'Guardar este movimento', exact: true }),
    ).toBeEnabled()
    await shot('animar-previa-pulo')
    await page.getByRole('button', { name: 'Guardar este movimento', exact: true }).click()
    const animated = await snapshot()
    expect(animated.nodes.filter((node) => node.kind === 'group')).toHaveLength(1)
    expect(animated.animations).toHaveLength(1)
    checks.push('whole-model preset commits group plus clip together')
    await page.getByRole('spinbutton', { name: 'Ir para o tempo (segundos)' }).fill('0.5')
    await page.getByRole('spinbutton', { name: 'Ir para o tempo (segundos)' }).blur()
    await page.getByRole('button', { name: 'Mover', exact: true }).click()
    await page.locator('summary').filter({ hasText: 'Valores e organização do movimento' }).click()
    await page.getByRole('button', { name: 'Mover Altura · Y mais', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Marcar pose', exact: true })).toBeEnabled()
    await expect
      .poll(() =>
        page.evaluate(() =>
          Object.keys(localStorage).some((key) => key.startsWith('molda:pose-draft:')),
        ),
      )
      .toBe(true)
    await page.goto(`/?nivel=explorer&criacao=${initial.id}`)
    await page.getByRole('button', { name: 'Continuar a pose', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Marcar pose', exact: true })).toBeEnabled()
    await page.getByRole('button', { name: 'Marcar pose', exact: true }).click()
    checks.push('reload recovers a revision-owned pose without changing the saved model')
    await page.getByRole('button', { name: 'Meus projetos', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Criar novo', exact: true })).toBeVisible()
    checks.push('saved exit returns directly to gallery')
    expect(errors).toEqual([])
    fs.writeFileSync(path.join(out, 'deep.json'), JSON.stringify({ checks, errors }, null, 2))
    console.log(JSON.stringify({ checks, errors }))
  } catch (error) {
    await shot('deep-failure')
    fs.writeFileSync(
      path.join(out, 'deep-failure.json'),
      JSON.stringify({ checks, errors, error: String(error) }, null, 2),
    )
    throw error
  } finally {
    await context.close()
  }
})

test('câmera, pivô, divisão e decisões antes de abandonar prévias', async ({ browser }, info) => {
  test.setTimeout(120_000)
  const context = await browser.newContext({ baseURL: String(info.project.use.baseURL) })
  context.setDefaultTimeout(15000)
  const out = info.outputPath('evidence')
  fs.mkdirSync(out, { recursive: true })
  const page = await context.newPage()
  await page.setViewportSize({ width: 1440, height: 900 })
  const errors: string[] = [],
    checks = []
  page.on('pageerror', (error) => errors.push(error.message))
  async function shot(name: string) {
    await page.screenshot({ path: path.join(out, `${name}.png`), animations: 'disabled' })
  }
  async function snapshot() {
    const menu = page.locator('summary').filter({ hasText: 'Salvar e exportar' })
    if (!(await menu.evaluate((el) => el.closest('details')?.open))) await menu.click()
    const pending = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Baixar projeto', exact: true }).click()
    const download = await pending
    const data = JSON.parse(fs.readFileSync(await download.path(), 'utf8')) as MoldaSceneJson
    if (await menu.evaluate((el) => el.closest('details')?.open)) await menu.click()
    delete data.thumb
    data.updatedAt = 0
    return data
  }
  try {
    await page.goto('/?nivel=god')
    await page.getByRole('button', { name: 'Criar novo', exact: true }).click()
    await page.getByRole('button', { name: 'Criar modelo', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Aproximar', exact: true })).toBeEnabled()
    const initial = await snapshot()
    await page.getByRole('button', { name: 'Olhar', exact: true }).click()
    const lookCanvas = await page.locator('canvas').first().boundingBox()
    if (!lookCanvas) throw new Error('Palco sem área visível')
    await page.mouse.move(lookCanvas.x + lookCanvas.width / 2, lookCanvas.y + lookCanvas.height / 2)
    await page.mouse.down()
    await page.mouse.move(
      lookCanvas.x + lookCanvas.width / 2 + 80,
      lookCanvas.y + lookCanvas.height / 2 + 25,
      { steps: 8 },
    )
    await page.mouse.up()
    await page.mouse.wheel(0, 90)
    await page.getByRole('button', { name: 'Mover', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Mover', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(await snapshot()).toEqual(initial)
    checks.push(
      'visible camera drag and wheel navigation preserve authoring and return to the selected tool',
    )
    await page.getByRole('button', { name: 'Pivô', exact: true }).click()
    const handle = page
      .getByRole('button', { name: 'Pivô no eixo X', exact: true })
      .locator('.mld-axis-tip')
    const point = (await handle.boundingBox())!
    await page.mouse.move(point.x + point.width / 2, point.y + point.height / 2)
    await page.mouse.down()
    await page.mouse.move(point.x + 40, point.y + 20, { steps: 5 })
    await page.keyboard.press('Escape')
    await page.mouse.up()
    expect(await snapshot()).toEqual(initial)
    await page.getByRole('button', { name: 'Na base', exact: true }).click()
    await shot('pivo-canto')
    await page.getByRole('button', { name: 'Pintar', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Pintar', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await page.getByRole('button', { name: 'Modelar', exact: true }).click()
    const pivoted = await snapshot()
    expect(pivoted.nodes[0]!.transform).toEqual(initial.nodes[0]!.transform)
    expect(pivoted.nodes[0]!.pivot).not.toEqual(initial.nodes[0]!.pivot)
    expect(pivoted.geometries).toEqual(initial.geometries)
    await page.getByRole('button', { name: 'Desfazer', exact: true }).click()
    expect(await snapshot()).toEqual(initial)
    checks.push('pivot drag cancels, presets commit once and preserve geometry and transforms')
    await page.locator('summary').filter({ hasText: 'Seleção e organização' }).click()
    await page.getByRole('button', { name: 'Transformar em malha', exact: true }).click()
    await page.getByRole('button', { name: 'Editar malha', exact: true }).click()
    const mesh = await snapshot()
    await page.getByRole('button', { name: 'Mais ferramentas', exact: true }).click()
    await page.getByRole('button', { name: 'Mais ajustes da malha', exact: true }).click()
    await page.getByRole('button', { name: 'Dividir pela vista frontal', exact: true }).click()
    const cutCanvas = await page.locator('canvas').first().boundingBox()
    if (!cutCanvas) throw new Error('Palco sem área visível')
    await page.mouse.click(
      cutCanvas.x + cutCanvas.width / 2,
      cutCanvas.y + cutCanvas.height / 2 - 65,
    )
    await page.mouse.click(
      cutCanvas.x + cutCanvas.width / 2,
      cutCanvas.y + cutCanvas.height / 2 + 65,
    )
    await expect(page.getByRole('button', { name: 'Aplicar', exact: true })).toBeEnabled()
    await shot('divisao-previa')
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
    expect(await snapshot()).toEqual(mesh)
    await page.getByRole('button', { name: 'Dividir pela vista frontal', exact: true }).click()
    await page.getByRole('button', { name: 'Dividir no meio', exact: true }).click()
    await page.getByRole('button', { name: 'Aplicar', exact: true }).click()
    const divided = await snapshot()
    const dividedGeometry = divided.geometries[0]!,
      originalGeometry = mesh.geometries[0]!
    if (dividedGeometry.kind !== 'mesh' || originalGeometry.kind !== 'mesh')
      throw new Error('Malha ausente')
    expect(Object.keys(dividedGeometry.faces).length).toBeGreaterThan(
      Object.keys(originalGeometry.faces).length,
    )
    await page.getByRole('button', { name: 'Desfazer', exact: true }).click()
    expect(await snapshot()).toEqual(mesh)
    checks.push('division preview, cancellation and undo preserve source and keep both sides')
    await page
      .locator('.mld-component-root')
      .getByRole('button', { name: 'Faces', exact: true })
      .click()
    await page.getByRole('button', { name: 'Concluir edição', exact: true }).click()
    await page.getByRole('button', { name: 'Animar', exact: true }).click()
    await page
      .getByRole('button', { name: 'Experimentar um movimento pronto', exact: true })
      .click()
    await page.getByRole('button', { name: 'Modelo inteiro', exact: true }).click()
    await page.getByRole('button', { name: 'Pular', exact: true }).click()
    await page.getByRole('button', { name: 'Mais devagar', exact: true }).click()
    await page.getByRole('button', { name: 'Mais intenso', exact: true }).click()
    await page.getByRole('button', { name: 'Modelar', exact: true }).click()
    await expect(
      page.getByRole('dialog', { name: 'Este movimento ainda está em prévia' }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Continuar ajustando', exact: true }).click()
    await page.getByRole('button', { name: 'Cancelar prévia', exact: true }).click()
    expect(await snapshot()).toEqual(mesh)
    checks.push('preset speed and intensity preview cancel without adding a group or animation')
    await page.getByRole('button', { name: 'Pular', exact: true }).click()
    await page.getByRole('button', { name: 'Modelar', exact: true }).click()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Guardar este movimento', exact: true })
      .click()
    await expect(page.getByRole('button', { name: 'Modelar', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await page.getByRole('button', { name: 'Animar', exact: true }).click()
    checks.push(
      'leaving a movement preset preview asks once, preserves Continue and resumes after Apply',
    )
    const animated = await snapshot()
    await page.getByRole('button', { name: 'Pivô', exact: true }).click()
    await page.getByRole('button', { name: 'Na base', exact: true }).click()
    const changedPivot = await snapshot()
    expect(changedPivot.animations).toEqual(animated.animations)
    expect(changedPivot.geometries).toEqual(animated.geometries)
    expect(changedPivot.nodes.map((node) => node.transform)).toEqual(
      animated.nodes.map((node) => node.transform),
    )
    await page.getByRole('button', { name: 'Mover', exact: true }).click()
    checks.push('pivot authoring in animation preserves existing clips and base geometry')
    await page.setViewportSize({ width: 1024, height: 600 })
    await expect(page.getByRole('tab', { name: 'Movimentos', exact: true })).toBeVisible()
    await page.getByRole('tab', { name: 'Movimentos', exact: true }).focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('tab', { name: 'Pose', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('tab', { name: 'Peças', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await page.getByRole('tab', { name: 'Pose', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Mais tempo · +2 s', exact: true })).toBeVisible()
    await shot('animar-compacto-pose')
    checks.push('compact animation keeps movements, pieces and pose separately reachable')
    for (const [width, height] of [
      [683, 384],
      [512, 300],
    ] as const) {
      await page.setViewportSize({ width, height })
      await page.getByRole('tab', { name: 'Pose', exact: true }).click()
      await expect(
        page.getByRole('button', { name: 'Mais tempo · +2 s', exact: true }),
      ).toBeVisible()
      const canvas = await page.locator('canvas').first().boundingBox()
      if (!canvas) throw new Error('Palco sem área visível')
      expect(canvas.width).toBeGreaterThan(300)
      expect(canvas.height).toBeGreaterThan(200)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
      await shot(`zoom-equivalente-${width}`)
    }
    checks.push(
      'reflow at 683x384 and 512x300 keeps stage and inspector reachable without page overflow',
    )
    expect(errors).toEqual([])
    fs.writeFileSync(path.join(out, 'advanced.json'), JSON.stringify({ checks, errors }, null, 2))
    console.log(JSON.stringify({ checks, errors }))
  } catch (error) {
    await shot('advanced-failure')
    fs.writeFileSync(
      path.join(out, 'advanced-failure.json'),
      JSON.stringify({ checks, errors, error: String(error) }, null, 2),
    )
    throw error
  } finally {
    await context.close()
  }
})

test('textura e céu preservam pintura, ajustes e desfazer', async ({ browser }, info) => {
  test.setTimeout(120_000)
  const context = await browser.newContext({ baseURL: String(info.project.use.baseURL) })
  context.setDefaultTimeout(15000)
  const out = info.outputPath('evidence')
  fs.mkdirSync(out, { recursive: true })
  const page = await context.newPage()
  await page.setViewportSize({ width: 1366, height: 768 })
  const errors: string[] = [],
    checks = []
  page.on('pageerror', (error) => errors.push(error.message))
  async function create(kind: string, name: string) {
    await page.getByRole('button', { name: 'Criar novo', exact: true }).click()
    await page.getByRole('dialog').getByRole('button').filter({ hasText: kind }).click()
    await page.getByRole('button', { name: 'Continuar', exact: true }).click()
    await page.getByRole('textbox', { name: 'Nome', exact: true }).fill(name)
    await page.getByRole('button', { name: 'Criar', exact: true }).click()
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
  }
  try {
    await page.goto('/?nivel=explorer')
    await create('Textura', 'textura-teste')
    await expect(page.getByRole('button', { name: /: Médio$/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await page.getByRole('button', { name: /^Cor 2 / }).click()
    const rect = await page.getByRole('img', { name: 'Folha de pixels', exact: true }).boundingBox()
    if (!rect) throw new Error('Palco sem área visível')
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2)
    await page.mouse.down()
    await page.mouse.move(rect.x + rect.width / 2 + 40, rect.y + rect.height / 2, { steps: 8 })
    await page.mouse.up()
    await expect(page.getByRole('button', { name: 'Desfazer', exact: true })).toBeEnabled()
    await page.screenshot({ path: path.join(out, 'textura.png') })
    await page.getByRole('button', { name: 'Desfazer', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Refazer', exact: true })).toBeEnabled()
    await page.getByRole('button', { name: 'Voltar para a galeria', exact: true }).click()
    checks.push('texture uses named tools and medium brush; real stroke supports undo and return')
    await create('Céu', 'ceu-teste')
    await page.getByRole('slider', { name: 'Altura do sol', exact: true }).focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('button', { name: 'Desfazer', exact: true })).toBeEnabled()
    await expect(page.getByText('Do seu jeito', { exact: true })).toBeVisible()
    await page.screenshot({ path: path.join(out, 'ceu.png') })
    await page.getByRole('button', { name: 'Desfazer', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Refazer', exact: true })).toBeEnabled()
    await page.getByRole('button', { name: 'Voltar para a galeria', exact: true }).click()
    checks.push(
      'sky slider works by keyboard and supports undo without changing editor conventions',
    )
    expect(errors).toEqual([])
    fs.writeFileSync(
      path.join(out, 'other-editors.json'),
      JSON.stringify({ checks, errors }, null, 2),
    )
    console.log(JSON.stringify({ checks, errors }))
  } catch (error) {
    await page.screenshot({ path: path.join(out, 'other-editors-failure.png') })
    throw error
  } finally {
    await context.close()
  }
})
