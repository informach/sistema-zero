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

  await page.getByRole('button', { name: 'Pintar' }).click()
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

  for (const name of ['Voltar para a galeria', 'Desfazer', 'Refazer', 'Baixar .glb']) {
    const button = page.getByRole('button', { name })
    const box = await button.boundingBox()
    expect(box, `${name} precisa estar visível`).not.toBeNull()
    expect((box?.x ?? -1) + (box?.width ?? 0), `${name} ultrapassou a tela`).toBeLessThanOrEqual(
      375,
    )
  }
})
