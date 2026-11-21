import { expect, test } from '@playwright/test'
import { COPY } from '../../pinta/src/core/copy'

const points = {
  move: [32, 32, 48, 32],
  resize: [48, 48, 64, 64],
  vertex: [16, 16, 24, 8],
  insert: [32, 16, 32, 8],
  create: [80, 16, 112, 48],
  point: [80, 16, 96, 32],
} as const
const cases = [
  ...Object.keys(points).map((operation) => ({ operation, set: false })),
  { operation: 'move', set: true },
  { operation: 'opacity', set: false },
  { operation: 'opacity', set: true },
]
for (const { operation, set } of cases)
  for (const ending of operation === 'move'
    ? ['cancel', 'external', 'undo', 'host', 'unmount']
    : operation === 'opacity'
      ? ['cancel', 'external', 'undo', 'unmount']
      : ['cancel', 'external', 'undo'])
    test(`gesto real ${operation}: ${ending}, conjunto=${set}`, async ({ page }, info) => {
      const cdp = await page.context().newCDPSession(page),
        rate = Number(info.project.metadata.cpuSlowdown ?? 1),
        touch = info.project.name === 'touch'
      await cdp.send('Emulation.setCPUThrottlingRate', { rate })
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.goto(
        `/?operation=${operation}&set=${set ? 1 : 0}&host=${ending === 'host' ? 1 : 0}`,
      )
      const current = page.locator('[data-current]'),
        target =
          operation === 'opacity'
            ? page.getByRole('slider')
            : page.getByLabel(COPY.tiles.objectsOverlay)
      await expect(target).toBeVisible()
      const box = await target.boundingBox()
      if (!box) throw Error('Controle ausente')
      const coords =
          operation === 'opacity'
            ? [box.width * 0.7, box.height / 2, box.width * 0.4, box.height / 2]
            : points[operation as keyof typeof points].map((n) => n * 2),
        start = { x: box.x + coords[0]!, y: box.y + coords[1]! },
        end = { x: box.x + coords[2]!, y: box.y + coords[3]! }
      const pointer = async (kind: 'down' | 'move' | 'up' | 'cancel', point = end) => {
        if (touch)
          await cdp.send('Input.dispatchTouchEvent', {
            type:
              kind === 'down'
                ? 'touchStart'
                : kind === 'move'
                  ? 'touchMove'
                  : kind === 'cancel'
                    ? 'touchCancel'
                    : 'touchEnd',
            touchPoints:
              kind === 'up' || kind === 'cancel'
                ? []
                : [{ ...point, id: 0, radiusX: 3, radiusY: 3, force: 1 }],
          })
        else if (kind === 'down') {
          await page.mouse.move(point.x, point.y)
          await page.mouse.down()
        } else if (kind === 'move') await page.mouse.move(point.x, point.y)
        else if (kind === 'cancel') await page.keyboard.press('Escape')
        else await page.mouse.up()
      }
      await pointer('down', start)
      await pointer('move')
      await expect.poll(async () => JSON.parse((await current.textContent())!).matches).toBe(false)
      if (ending === 'external') {
        await page.keyboard.press('r')
        await expect
          .poll(async () => JSON.parse((await current.textContent())!).name)
          .toBe('revisao-externa')
        await pointer('move', { x: end.x + 8, y: end.y })
      } else if (ending === 'cancel') await pointer('cancel')
      else if (ending === 'host') await pointer('move', { x: end.x + 32, y: end.y })
      else if (ending === 'unmount') await page.keyboard.press('u')
      // CDP ends the native contact on touchCancel; a second touchEnd is invalid.
      if (!(touch && ending === 'cancel')) await pointer('up')
      if (ending === 'undo') {
        await expect.poll(async () => JSON.parse((await current.textContent())!).canUndo).toBe(true)
        await page.getByRole('button', { name: 'Desfazer', exact: true }).click()
      }
      await expect.poll(async () => JSON.parse((await current.textContent())!).matches).toBe(true)
      await expect.poll(async () => JSON.parse((await current.textContent())!).canUndo).toBe(false)
      await page.getByRole('button', { name: 'Conferir salvamento', exact: true }).click()
      const saved = page.locator('[data-saved]')
      await expect.poll(async () => JSON.parse((await saved.textContent())!)?.ok).toBe(true)
      const data = JSON.parse((await saved.textContent())!)
      expect(data.current).toBe(data.expected)
      expect(data.persisted).toBe(data.expected)
      expect(errors).toEqual([])
      await info.attach('gesto', {
        body: JSON.stringify({ operation, set, ending, cpuSlowdown: rate, touch, saved: data }),
        contentType: 'application/json',
      })
      await info.attach('controle', { body: await page.screenshot(), contentType: 'image/png' })
      await cdp.detach()
    })

for (const set of [false, true])
  for (const ending of ['external', 'undo'])
    test(`rascunho real: ${ending}, conjunto=${set}`, async ({ page }, info) => {
      const cdp = await page.context().newCDPSession(page),
        rate = Number(info.project.metadata.cpuSlowdown ?? 1),
        touch = info.project.name === 'touch'
      await cdp.send('Emulation.setCPUThrottlingRate', { rate })
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.goto(`/?operation=draft&set=${set ? 1 : 0}`)
      const target = page.getByLabel(COPY.tiles.objectsOverlay),
        current = page.locator('[data-current]')
      await expect(target).toBeVisible()
      const box = await target.boundingBox()
      if (!box) throw Error('Palco ausente')
      for (const [x, y] of [
        [80, 16],
        [112, 16],
        [112, 48],
      ]) {
        const px = box.x + x! * 2,
          py = box.y + y! * 2
        if (touch) await page.touchscreen.tap(px, py)
        else await page.mouse.click(px, py)
      }
      await expect(page.locator('[data-shape-draft]')).toBeVisible()
      if (ending === 'external') await page.keyboard.press('r')
      await page.keyboard.press('Enter')
      await expect(page.locator('[data-shape-draft]')).toHaveCount(0)
      if (ending === 'undo') {
        await expect.poll(async () => JSON.parse((await current.textContent())!).canUndo).toBe(true)
        await page.getByRole('button', { name: 'Desfazer', exact: true }).click()
      }
      await expect.poll(async () => JSON.parse((await current.textContent())!).matches).toBe(true)
      await expect.poll(async () => JSON.parse((await current.textContent())!).canUndo).toBe(false)
      await page.getByRole('button', { name: 'Conferir salvamento', exact: true }).click()
      const saved = page.locator('[data-saved]')
      await expect.poll(async () => JSON.parse((await saved.textContent())!)?.ok).toBe(true)
      const data = JSON.parse((await saved.textContent())!)
      expect(data.current).toBe(data.expected)
      expect(data.persisted).toBe(data.expected)
      expect(errors).toEqual([])
      await info.attach('gesto', {
        body: JSON.stringify({
          operation: 'draft',
          set,
          ending,
          cpuSlowdown: rate,
          touch,
          saved: data,
        }),
        contentType: 'application/json',
      })
      await info.attach('controle', { body: await page.screenshot(), contentType: 'image/png' })
      await cdp.detach()
    })
