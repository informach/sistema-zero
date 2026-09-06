import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'

const MODEL = {
  kind: 'model' as const,
  id: 'e2e-model',
  name: 'e2e-model',
  createdAt: 1,
  updatedAt: 1,
  paletteId: 'arcade' as const,
  texelsPerUnit: 4 as const,
  snap: 1 as const,
  mirrorX: false,
  parts: [
    {
      id: 'body',
      name: 'corpo',
      shape: 'box' as const,
      from: [-2, 0, -2] as [number, number, number],
      to: [2, 4, 2] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
      color: 8,
      faces: {},
    },
  ],
}

test('viewport real posiciona, pinta, recupera contexto e exporta GLB aceito pelo loader', async ({
  page,
}) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.goto('/')
  await page.evaluate(async (asset) => {
    await window.__molda?.persistence.save(asset)
  }, MODEL)
  await page.goto('/?criacao=e2e-model')

  const canvas = page.locator('canvas[aria-label="Palco 3D"]')
  await expect(canvas).toBeVisible()
  const box = await canvas.boundingBox()
  if (!box) throw new Error('palco sem tamanho')
  expect(box.width).toBeGreaterThan(100)
  expect(box.height).toBeGreaterThan(100)
  const cdp = await page.context().newCDPSession(page)

  await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } })
  await expect(page.getByRole('textbox', { name: 'Posição X' })).toBeVisible()
  const beforeDragX = await page.evaluate(
    () =>
      (
        window.__molda?.viewport as unknown as {
          model?: { parts: Array<{ id: string; from: [number, number, number] }> }
        }
      )?.model?.parts.find((part) => part.id === 'body')?.from[0],
  )
  const axis = await canvas.evaluate((element) => {
    const viewport = window.__molda?.viewport as unknown as {
      camera: unknown
      gizmo: {
        worldPosition: {
          clone(): { x: number; project(camera: unknown): { x: number; y: number } }
        }
      }
    }
    const rect = element.getBoundingClientRect()
    const centerWorld = viewport.gizmo.worldPosition.clone()
    const xWorld = viewport.gizmo.worldPosition.clone()
    xWorld.x += 1
    const center = centerWorld.project(viewport.camera)
    const x = xWorld.project(viewport.camera)
    const screen = (point: { x: number; y: number }) => ({
      x: rect.left + ((point.x + 1) * rect.width) / 2,
      y: rect.top + ((1 - point.y) * rect.height) / 2,
    })
    const a = screen(center)
    const b = screen(x)
    const length = Math.hypot(b.x - a.x, b.y - a.y)
    return { center: a, direction: { x: (b.x - a.x) / length, y: (b.y - a.y) / length } }
  })
  const handle = {
    x: axis.center.x + axis.direction.x * 32,
    y: axis.center.y + axis.direction.y * 32,
  }
  await page.mouse.move(handle.x, handle.y)
  await page.mouse.down()
  await page.mouse.move(handle.x + axis.direction.x * 70, handle.y + axis.direction.y * 70, {
    steps: 10,
  })
  await page.mouse.up()
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window.__molda?.viewport as unknown as {
              model?: { parts: Array<{ id: string; from: [number, number, number] }> }
            }
          )?.model?.parts.find((part) => part.id === 'body')?.from[0],
      ),
    )
    .not.toBe(beforeDragX)

  await page.getByRole('button', { name: 'Girar' }).click()
  const rotationStart = await canvas.evaluate((element) => {
    const viewport = window.__molda?.viewport as unknown as {
      camera: unknown
      gizmo: {
        worldPosition: {
          clone(): {
            fromBufferAttribute(attribute: unknown, index: number): unknown
            applyMatrix4(matrix: unknown): unknown
            project(camera: unknown): { x: number; y: number }
          }
        }
        _gizmo: {
          gizmo: { rotate: { children: Array<Record<string, unknown>> } }
        }
      }
    }
    const rect = element.getBoundingClientRect()
    const handle = viewport.gizmo._gizmo.gizmo.rotate.children.find(
      (child) => child.name === 'Y' && child.visible,
    ) as {
      geometry: { getAttribute(name: string): unknown }
      matrixWorld: unknown
    }
    const world = viewport.gizmo.worldPosition.clone()
    world.fromBufferAttribute(handle.geometry.getAttribute('position'), 0)
    world.applyMatrix4(handle.matrixWorld)
    const point = world.project(viewport.camera)
    return {
      center: {
        x:
          rect.left +
          ((viewport.gizmo.worldPosition.clone().project(viewport.camera).x + 1) * rect.width) / 2,
        y:
          rect.top +
          ((1 - viewport.gizmo.worldPosition.clone().project(viewport.camera).y) * rect.height) / 2,
      },
      point: {
        x: rect.left + ((point.x + 1) * rect.width) / 2,
        y: rect.top + ((1 - point.y) * rect.height) / 2,
      },
    }
  })
  const rotateX = rotationStart.point.x - rotationStart.center.x
  const rotateY = rotationStart.point.y - rotationStart.center.y
  const angle = Math.PI / 5
  const rotationEnd = {
    x: rotationStart.center.x + rotateX * Math.cos(angle) - rotateY * Math.sin(angle),
    y: rotationStart.center.y + rotateX * Math.sin(angle) + rotateY * Math.cos(angle),
  }
  await page.mouse.move(rotationStart.point.x, rotationStart.point.y)
  await page.mouse.down()
  await page.mouse.move(rotationEnd.x, rotationEnd.y, { steps: 10 })
  await page.mouse.up()
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window.__molda?.viewport as unknown as {
              model?: { parts: Array<{ id: string; rotation: [number, number, number] }> }
            }
          )?.model?.parts.find((part) => part.id === 'body')?.rotation,
      ),
    )
    .not.toEqual([0, 0, 0])
  const snappedRotation = await page.evaluate(
    () =>
      (
        window.__molda?.viewport as unknown as {
          model?: { parts: Array<{ id: string; rotation: [number, number, number] }> }
        }
      )?.model?.parts.find((part) => part.id === 'body')?.rotation,
  )
  expect(snappedRotation?.every((value) => value % 15 === 0)).toBe(true)

  const beforeOneFinger = await canvas.screenshot()
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: box.x + box.width * 0.15, y: box.y + box.height * 0.2 }],
  })
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: box.x + box.width * 0.3, y: box.y + box.height * 0.25 }],
  })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await page.waitForTimeout(350)
  expect((await canvas.screenshot()).equals(beforeOneFinger)).toBe(false)

  const beforeTwoFingers = await canvas.screenshot()
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: box.x + box.width * 0.35, y: box.y + box.height * 0.7, id: 51 },
      { x: box.x + box.width * 0.65, y: box.y + box.height * 0.7, id: 52 },
    ],
  })
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [
      { x: box.x + box.width * 0.25, y: box.y + box.height * 0.7, id: 51 },
      { x: box.x + box.width * 0.75, y: box.y + box.height * 0.7, id: 52 },
    ],
  })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await page.waitForTimeout(350)
  expect((await canvas.screenshot()).equals(beforeTwoFingers)).toBe(false)

  await page.getByRole('button', { name: 'Adicionar caixa' }).click()
  await expect(page.getByRole('button', { name: 'Adicionar caixa' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } })
  await expect(page.getByText('2/128 peças · 24 triângulos')).toBeVisible()

  await page.getByRole('button', { name: 'Pintar', exact: true }).click()
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }],
  })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const assets = await window.__molda?.persistence.loadAll()
        const model = assets?.find((asset) => asset.id === 'e2e-model')
        return model?.kind === 'model'
          ? model.parts.some((part) =>
              Object.values(part.faces).some((skin) => skin?.data.some((value) => value > 0)),
            )
          : false
      }),
    )
    .toBe(true)

  // A ferramenta de perto abre somente a face tocada; o gesto inteiro continua
  // sendo um passo de desfazer/refazer, igual à pintura direta no palco.
  await page
    .getByRole('button', { name: /^Cor 2 / })
    .first()
    .click()
  const countRedTexels = () =>
    page.evaluate(() => {
      const viewport = window.__molda?.viewport as unknown as {
        model?: { parts: Array<{ faces: Record<string, { data: Uint8Array }> }> }
      }
      return (viewport.model?.parts ?? []).reduce(
        (total, part) =>
          total +
          Object.values(part.faces).reduce(
            (partTotal, skin) =>
              partTotal + Array.from(skin.data).filter((value) => value === 2).length,
            0,
          ),
        0,
      )
    })
  const redBeforeClosePaint = await countRedTexels()
  await page.getByRole('button', { name: 'Pintar de perto' }).click()
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
  const closeStage = page.getByRole('img', { name: 'Face ampliada para pintar' })
  await expect(closeStage).toBeVisible()
  await closeStage.click({ position: { x: 100, y: 100 } })
  await page.getByRole('button', { name: 'Pronto' }).click()
  await expect.poll(countRedTexels).toBeGreaterThan(redBeforeClosePaint)
  const redAfterClosePaint = await countRedTexels()
  await page.getByRole('button', { name: 'Desfazer' }).click()
  await expect.poll(countRedTexels).toBe(redBeforeClosePaint)
  await page.getByRole('button', { name: 'Refazer' }).click()
  await expect.poll(countRedTexels).toBe(redAfterClosePaint)

  const restored = await canvas.evaluate((element) => {
    const gl = (element as HTMLCanvasElement).getContext('webgl2')
    const extension = gl?.getExtension('WEBGL_lose_context')
    if (!extension) return false
    extension.loseContext()
    extension.restoreContext()
    return true
  })
  expect(restored).toBe(true)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Baixar .glb' }).click()
  const download = await downloadPromise
  const path = await download.path()
  if (!path) throw new Error('download sem arquivo temporário')
  const bytes = await readFile(path)
  const parsed = await page.evaluate(
    (values) => window.__molda?.inspectGlb(values),
    Array.from(bytes),
  )
  expect(parsed).toEqual({ meshes: 1, materials: 1, mapped: 1 })
  expect(pageErrors).toEqual([])
})

test('grupo com principal trancada mantém a alça para as peças livres', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(
    async (asset) =>
      window.__molda?.persistence.save({
        ...asset,
        id: 'locked-group',
        name: 'locked-group',
        parts: [
          { ...asset.parts[0], locked: true },
          {
            ...asset.parts[0],
            id: 'wing',
            name: 'asa',
            shape: 'wedge',
            from: [3, 0, 0],
            to: [6, 1, 2],
          },
        ],
      }),
    MODEL,
  )
  await page.goto('/?criacao=locked-group')

  await page.getByRole('button', { name: 'corpo, caixa' }).click()
  await page.getByRole('button', { name: 'Somar à seleção' }).click()
  await page.getByRole('button', { name: 'asa, rampa' }).click()

  await expect
    .poll(() =>
      page.evaluate(() => {
        const viewport = window.__molda?.viewport
        if (!viewport) return false
        return Reflect.get(viewport, 'gizmo').object === Reflect.get(viewport, 'groupAnchor')
      }),
    )
    .toBe(true)
})

test('Arrumar põe no chão e ajusta uma repetição como um único passo persistido', async ({
  page,
}) => {
  await page.goto('/')
  await page.evaluate(
    async (asset) =>
      window.__molda?.persistence.save({
        ...asset,
        id: 'e2e-arrange',
        name: 'e2e-arrange',
        parts: [{ ...asset.parts[0], from: [1, 3, 0], to: [3, 5, 2] }],
      }),
    MODEL,
  )
  await page.goto('/?criacao=e2e-arrange')
  await page.getByRole('button', { name: 'corpo, caixa' }).click()

  const partSummary = () =>
    page.evaluate(() => {
      const viewport = window.__molda?.viewport as unknown as {
        model?: { parts: Array<{ from: [number, number, number] }> }
      }
      return {
        count: viewport.model?.parts.length ?? 0,
        firstY: viewport.model?.parts[0]?.from[1],
      }
    })

  await page.getByRole('button', { name: 'Pôr no chão' }).click()
  await expect.poll(partSummary).toEqual({ count: 1, firstY: 0 })
  await page.getByRole('button', { name: 'Repetir em linha: Para a direita' }).click()
  await expect.poll(partSummary).toEqual({ count: 2, firstY: 0 })
  await page.getByRole('textbox', { name: 'Quantidade de cópias' }).fill('3')
  await page.getByRole('textbox', { name: 'Quantidade de cópias' }).press('Enter')
  await expect.poll(partSummary).toEqual({ count: 4, firstY: 0 })

  await page.getByRole('button', { name: 'Desfazer' }).click()
  await expect.poll(partSummary).toEqual({ count: 1, firstY: 0 })
  await page.getByRole('button', { name: 'Refazer' }).click()
  await expect.poll(partSummary).toEqual({ count: 4, firstY: 0 })
  await expect
    .poll(async () => {
      const assets = await page.evaluate(() => window.__molda?.persistence.loadAll())
      const saved = assets?.find((asset) => asset.id === 'e2e-arrange')
      return saved?.kind === 'model' ? saved.parts.length : 0
    })
    .toBe(4)

  await page.reload()
  await expect(page.locator('canvas[aria-label="Palco 3D"]')).toBeVisible()
  await expect.poll(partSummary).toEqual({ count: 4, firstY: 0 })
})

test('Grudar une dois pontos do palco com dois toques e um único desfazer', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(async (asset) => {
    await window.__molda?.persistence.save({
      ...asset,
      id: 'e2e-snap',
      name: 'e2e-snap',
      parts: [
        ...asset.parts,
        {
          id: 'target',
          name: 'alvo',
          shape: 'box',
          from: [5, 0, -1],
          to: [7, 4, 1],
          rotation: [0, 0, 0],
          color: 4,
          faces: {},
          locked: true,
        },
      ],
    })
  }, MODEL)
  await page.goto('/?criacao=e2e-snap')

  const canvas = page.locator('canvas[aria-label="Palco 3D"]')
  await expect(canvas).toBeVisible()
  await page.getByRole('button', { name: 'corpo, caixa' }).click()
  await page.getByRole('button', { name: 'Grudar' }).click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Toque no ponto da peça que vai grudar.' }),
  ).toBeVisible()

  type SnapProjector = {
    camera: unknown
    gizmo: {
      worldPosition: {
        clone(): {
          set(
            x: number,
            y: number,
            z: number,
          ): { project(camera: unknown): { x: number; y: number } }
        }
      }
    }
    model?: { parts: Array<{ id: string; from: [number, number, number] }> }
  }
  const screenOf = (x: number, y: number, z: number) =>
    canvas.evaluate(
      (element, point) => {
        const viewport = window.__molda?.viewport as unknown as SnapProjector
        const rect = element.getBoundingClientRect()
        const projected = viewport.gizmo.worldPosition
          .clone()
          .set(point[0], point[1], point[2])
          .project(viewport.camera)
        return {
          x: rect.left + ((projected.x + 1) * rect.width) / 2,
          y: rect.top + ((1 - projected.y) * rect.height) / 2,
        }
      },
      [x, y, z] as [number, number, number],
    )
  const bodyFromX = () =>
    page.evaluate(
      () =>
        (window.__molda?.viewport as unknown as SnapProjector).model?.parts.find(
          (part) => part.id === 'body',
        )?.from[0],
    )

  const source = await screenOf(0, 2, 0)
  await page.touchscreen.tap(source.x, source.y)
  await expect(
    page.getByRole('status').filter({ hasText: 'Agora toque no ponto de outra peça.' }),
  ).toBeVisible()

  const target = await screenOf(6, 2, 0)
  await page.touchscreen.tap(target.x, target.y)
  await expect.poll(bodyFromX).toBe(4)
  await expect(page.getByRole('button', { name: 'Mover' })).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('button', { name: 'Desfazer' }).click()
  await expect.poll(bodyFromX).toBe(-2)
  await expect(page.getByRole('button', { name: 'Desfazer' })).toBeDisabled()
})

test('atlas cheio mantém as 128 peças visíveis pelas cores-base', async ({ page }) => {
  const skin = { width: 32, height: 32, data: Array.from({ length: 32 * 32 }, () => 2) }
  const parts = Array.from({ length: 128 }, (_, index) => ({
    id: `full-${index}`,
    name: `full ${index}`,
    shape: 'box' as const,
    from: [-16, 0, -16] as [number, number, number],
    to: [16, 32, 16] as [number, number, number],
    rotation: [0, 0, 0] as [number, number, number],
    color: 2,
    faces: { px: skin, nx: skin, py: skin, ny: skin, pz: skin, nz: skin },
  }))
  await page.goto('/')
  await page.evaluate(
    async (model) =>
      window.__molda?.persistence.save({
        ...model,
        id: 'atlas-full',
        name: 'atlas-full',
        texelsPerUnit: 8,
      }),
    { ...MODEL, parts },
  )
  await page.goto('/?criacao=atlas-full')
  const canvas = page.locator('canvas[aria-label="Palco 3D"]')
  await expect(canvas).toBeVisible()
  await expect(page.getByText(/128\/128 peças/)).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(() => {
        const viewport = window.__molda?.viewport as unknown as {
          atlasFull?: boolean
          entries?: { size: number }
          layout?: { faces: { size: number }; swatches: unknown[] }
        }
        return {
          full: viewport.atlasFull,
          entries: viewport.entries?.size,
          faces: viewport.layout?.faces.size,
          swatches: viewport.layout?.swatches.length,
        }
      }),
    )
    .toEqual({ full: true, entries: 128, faces: 0, swatches: 16 })
})

test('Enquadrar mantém um modelo largo inteiro num palco em retrato', async ({ page }) => {
  await page.setViewportSize({ width: 500, height: 700 })
  await page.goto('/')
  await page.evaluate(
    async (model) =>
      window.__molda?.persistence.save({
        ...model,
        id: 'modelo-largo',
        name: 'modelo-largo',
        parts: [
          {
            ...model.parts[0],
            from: [-16, 0, -1],
            to: [16, 1, 1],
          },
        ],
      }),
    MODEL,
  )
  await page.goto('/?criacao=modelo-largo')

  const canvas = page.locator('canvas[aria-label="Palco 3D"]')
  await expect(canvas).toBeVisible()
  await page.getByRole('button', { name: 'Enquadrar' }).click()

  await expect
    .poll(() =>
      canvas.evaluate(() => {
        const viewport = window.__molda?.viewport
        if (!viewport) throw new Error('palco indisponível')
        const camera = Reflect.get(viewport, 'camera')
        const entries = Reflect.get(viewport, 'entries')
        if (!(entries instanceof Map)) throw new Error('peças indisponíveis')
        let maxAbsX = 0
        let maxAbsY = 0
        for (const entry of entries.values()) {
          const mesh = Reflect.get(entry, 'mesh')
          const geometry = Reflect.get(mesh, 'geometry')
          const position = geometry.getAttribute('position')
          mesh.updateMatrixWorld(true)
          const point = mesh.position.clone()
          for (let index = 0; index < position.count; index += 1) {
            point
              .fromBufferAttribute(position, index)
              .applyMatrix4(mesh.matrixWorld)
              .project(camera)
            maxAbsX = Math.max(maxAbsX, Math.abs(point.x))
            maxAbsY = Math.max(maxAbsY, Math.abs(point.y))
          }
        }
        return { fitsX: maxAbsX <= 1, fitsY: maxAbsY <= 1, maxAbsX, maxAbsY }
      }),
    )
    .toMatchObject({ fitsX: true, fitsY: true })
})

test('a barra do editor mantém todas as ações dentro da tela de celular', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 })
  await page.goto('/')
  await page.evaluate(async (asset) => window.__molda?.persistence.save(asset), MODEL)
  await page.goto('/?criacao=e2e-model')

  const header = page.locator('header').first()
  await expect(header).toBeVisible()
  await expect
    .poll(() =>
      header.evaluate((element) => ({
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      })),
    )
    .toEqual({ clientWidth: 375, scrollWidth: 375 })

  for (const name of [
    'Voltar para a galeria',
    'Ajuda desta tela',
    'Desfazer',
    'Refazer',
    'Baixar .glb',
  ]) {
    const button = page.getByRole('button', { name })
    const box = await button.boundingBox()
    expect(box, `${name} precisa estar visível`).not.toBeNull()
    expect((box?.x ?? -1) + (box?.width ?? 0), `${name} ultrapassou a tela`).toBeLessThanOrEqual(
      375,
    )
  }
})

/**
 * Malha no palco REAL: converter, escolher uma face pelo TOQUE (14 px de folga),
 * Encolher dentro, Puxar, pintar a face nova e girar a pele dela. O ponto do toque é
 * projetado pela câmera do palco (o mesmo caminho da alça acima).
 */
test('malha: toque escolhe, Encolher e Puxar formam relevo, e a pintura gira', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.goto('/')
  await page.evaluate(async (asset) => {
    await window.__molda?.persistence.save({ ...asset, id: 'e2e-mesh', name: 'e2e-mesh' })
  }, MODEL)
  await page.goto('/?criacao=e2e-mesh')
  const canvas = page.locator('canvas[aria-label="Palco 3D"]')
  await expect(canvas).toBeVisible()

  await page.getByRole('button', { name: 'corpo, caixa' }).click()
  await page.getByRole('button', { name: 'Transformar em malha' }).click()
  await expect(page.getByRole('complementary', { name: 'Editar malha' })).toBeVisible()

  type Projector = {
    camera: unknown
    gizmo: {
      worldPosition: {
        clone(): {
          set(
            x: number,
            y: number,
            z: number,
          ): { project(camera: unknown): { x: number; y: number } }
        }
      }
    }
    model?: {
      parts: Array<{
        id: string
        to: [number, number, number]
        faces: Record<string, { width: number; height: number; data: Uint8Array }>
        mesh?: { faces: Record<string, { v: string[] }> }
      }>
    }
  }
  const screenOf = (x: number, y: number, z: number) =>
    canvas.evaluate(
      (element, point) => {
        const viewport = window.__molda?.viewport as unknown as Projector
        const rect = element.getBoundingClientRect()
        const projected = viewport.gizmo.worldPosition
          .clone()
          .set(point[0], point[1], point[2])
          .project(viewport.camera)
        return {
          x: rect.left + ((projected.x + 1) * rect.width) / 2,
          y: rect.top + ((1 - projected.y) * rect.height) / 2,
        }
      },
      [x, y, z] as [number, number, number],
    )
  const partOf = () =>
    page.evaluate(() =>
      (window.__molda?.viewport as unknown as Projector).model?.parts.find((p) => p.id === 'body'),
    )

  // A seleção agora é explícita por modo: em Faces, o toque escolhe só a face sob ele.
  await page.getByRole('button', { name: 'Faces', exact: true }).click()
  const top = await screenOf(0, 4, 0)
  await page.touchscreen.tap(top.x + 6, top.y + 8)
  await expect(page.getByText('1 face', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Encolher dentro', exact: true }).click()
  await expect.poll(async () => Object.keys((await partOf())?.mesh?.faces ?? {})).toHaveLength(10)
  await page.getByRole('button', { name: 'Puxar', exact: true }).click()
  await expect.poll(async () => (await partOf())?.to[1]).toBe(5)
  await expect(page.getByRole('region', { name: 'Ajustar' })).toBeVisible()

  // Pintar a tampa nova e girar a pele dela.
  await page.getByRole('button', { name: 'Pronto', exact: true }).click()
  await page.getByRole('button', { name: 'Pintar', exact: true }).click()
  await page.getByRole('button', { name: 'Lápis', exact: true }).click()
  const cap = await screenOf(0.6, 5, 0.4)
  await page.touchscreen.tap(cap.x, cap.y)
  await expect.poll(async () => Boolean((await partOf())?.faces.f_py)).toBe(true)
  const before = await page.evaluate(() => {
    const part = (window.__molda?.viewport as unknown as Projector).model?.parts[0]
    const skin = part?.faces.f_py
    return skin ? Array.from(skin.data).findIndex((value) => value > 0) : -1
  })
  await page.getByRole('button', { name: 'Girar a pele' }).click()
  await page.touchscreen.tap(cap.x, cap.y)
  await expect
    .poll(() =>
      page.evaluate(() => {
        const part = (window.__molda?.viewport as unknown as Projector).model?.parts[0]
        const skin = part?.faces.f_py
        return skin ? Array.from(skin.data).findIndex((value) => value > 0) : -1
      }),
    )
    .not.toBe(before)
  expect(pageErrors).toEqual([])
})
