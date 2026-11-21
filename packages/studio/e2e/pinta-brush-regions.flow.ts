import { expect, test } from '@playwright/test'
import { COPY } from '../../pinta/src/core/copy'

for (const scenario of ['cancel', 'move', 'release', 'stamp', 'host', 'undo'] as const)
  test(`controlador real: ${scenario}, com armazenamento local`, async ({ page }, info) => {
    const cdp = await page.context().newCDPSession(page),
      rate = Number(info.project.metadata.cpuSlowdown ?? 1),
      touch = info.project.name === 'touch'
    await cdp.send('Emulation.setCPUThrottlingRate', { rate })
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('/')
    const canvas = page.getByLabel('Palco de QA'),
      current = page.locator('[data-current]')
    await expect(canvas).toBeVisible()
    if (scenario === 'stamp' || scenario === 'host')
      await page.getByLabel('Modo da prova').selectOption(scenario)
    const box = await canvas.boundingBox()
    if (!box) throw Error('Canvas ausente')
    const point = (col: number) => ({ x: box.x + col * 16 + 8, y: box.y + 24 })
    const pointer = async (kind: 'down' | 'move' | 'up', col = 1) => {
      const p = point(col)
      if (touch)
        await cdp.send('Input.dispatchTouchEvent', {
          type: kind === 'down' ? 'touchStart' : kind === 'move' ? 'touchMove' : 'touchEnd',
          touchPoints: kind === 'up' ? [] : [{ ...p, id: 0, radiusX: 3, radiusY: 3, force: 1 }],
        })
      else if (kind === 'down') {
        await page.mouse.move(p.x, p.y)
        await page.mouse.down()
      } else if (kind === 'move') await page.mouse.move(p.x, p.y)
      else await page.mouse.up()
    }
    await pointer('down')
    await expect.poll(async () => JSON.parse((await current.textContent())!).matches).toBe(false)
    if (scenario === 'cancel' || scenario === 'move' || scenario === 'release') {
      await page.keyboard.press('r')
      await expect
        .poll(async () => JSON.parse((await current.textContent())!).name)
        .toBe('revisao-externa')
      if (scenario === 'cancel') await page.keyboard.press('Escape')
      if (scenario === 'move') await pointer('move', 2)
    } else await pointer('move', scenario === 'stamp' ? 0 : 2)
    await pointer('up')
    if (scenario === 'undo') {
      await expect.poll(async () => JSON.parse((await current.textContent())!).canUndo).toBe(true)
      await page.getByRole('button', { name: 'Desfazer', exact: true }).click()
    }
    await expect.poll(async () => JSON.parse((await current.textContent())!).matches).toBe(true)
    await expect.poll(async () => JSON.parse((await current.textContent())!).canUndo).toBe(false)
    if (scenario === 'stamp')
      await expect(page.locator('[data-messages]')).toHaveText(
        JSON.stringify([COPY.scene.brushWorkLimit]),
      )
    await page.getByRole('button', { name: 'Conferir salvamento', exact: true }).click()
    await expect
      .poll(async () => JSON.parse((await page.locator('[data-saved]').textContent())!)?.ok)
      .toBe(true)
    const saved = JSON.parse((await page.locator('[data-saved]').textContent())!) as {
      ok: boolean
      current: string
      expected: string
      persisted: string
    }
    await info.attach('salvamento-diagnostico', {
      body: JSON.stringify(saved),
      contentType: 'application/json',
    })
    expect(saved.current).toBe(saved.expected)
    expect(saved.persisted).toBe(saved.expected)
    expect(errors).toEqual([])
    await info.attach('gesto', {
      body: JSON.stringify({
        scenario,
        cpuSlowdown: rate,
        touch,
        saved,
        messages: JSON.parse((await page.locator('[data-messages]').textContent())!),
      }),
      contentType: 'application/json',
    })
    await info.attach('controlador', { body: await page.screenshot(), contentType: 'image/png' })
    await cdp.detach()
  })
