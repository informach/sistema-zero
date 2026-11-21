import { expect, test } from '@playwright/test'

for (const operation of ['library', 'scatter'])
  for (const set of [false, true])
    for (const ending of ['undo', 'host', 'subscriber', 'cancel', 'zoom'])
      test(`prévia ${operation}: ${ending}, conjunto=${set}`, async ({ page }, info) => {
        const cdp = await page.context().newCDPSession(page),
          rate = Number(info.project.metadata.cpuSlowdown ?? 1),
          touch = info.project.name === 'touch'
        await cdp.send('Emulation.setCPUThrottlingRate', { rate })
        await page.goto(`/?operation=${operation}&set=${set ? 1 : 0}&ending=${ending}`)
        const target =
            operation === 'library'
              ? page.getByRole('button', { name: 'Arrastar árvore' })
              : page.locator('[data-stroke]'),
          box = await target.boundingBox()
        if (!box) throw Error('Controle sem layout')
        const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 },
          paper = page.locator('[data-stroke]'),
          dest = await paper.boundingBox()
        if (!dest) throw Error('Papel sem layout')
        const to = { x: dest.x + 96, y: dest.y + 64 }
        if (touch) {
          await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchStart',
            touchPoints: [{ ...from, id: 1 }],
          })
          await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ ...to, id: 1 }],
          })
        } else {
          await page.mouse.move(from.x, from.y)
          await page.mouse.down()
          await page.mouse.move(to.x, to.y, { steps: 3 })
        }
        if (operation === 'library')
          await expect(page.locator('[data-pin-library-preview]')).toBeVisible()
        else await expect(page.locator('[data-preview]')).toHaveText('yes')
        if (ending === 'cancel') {
          if (touch)
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] })
          else await page.keyboard.press('Escape')
        }
        if (ending === 'zoom') await page.keyboard.press('z')
        if (touch && ending !== 'cancel')
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
        else if (!touch) await page.mouse.up()
        const state = page.locator('[data-state]')
        if (ending === 'undo') {
          await expect.poll(async () => JSON.parse((await state.textContent())!).canUndo).toBe(true)
          await page.getByRole('button', { name: 'Desfazer', exact: true }).click()
        }
        await expect.poll(async () => JSON.parse((await state.textContent())!).canUndo).toBe(false)
        if (ending === 'host' || ending === 'subscriber') {
          await expect
            .poll(async () => JSON.parse((await state.textContent())!).name)
            .toBe('revisao-externa')
          expect(JSON.parse((await state.textContent())!).selected).toBe(0)
        }
        await page.getByRole('button', { name: 'Conferir salvamento' }).click()
        const saved = page.locator('[data-saved]')
        await expect.poll(async () => JSON.parse((await saved.textContent())!)?.ok).toBe(true)
        const data = JSON.parse((await saved.textContent())!)
        expect(data.current).toBe(data.expected)
        expect(data.persisted).toBe(data.expected)
        await info.attach('pre-confirmacao', {
          body: JSON.stringify({ operation, set, ending, cpuSlowdown: rate, touch, saved: data }),
          contentType: 'application/json',
        })
        await info.attach('controle', { body: await page.screenshot(), contentType: 'image/png' })
        await cdp.detach()
      })

test('a prévia regional aparece na coordenada negativa sem editar o store público', async ({
  page,
}, info) => {
  const cdp = await page.context().newCDPSession(page),
    rate = Number(info.project.metadata.cpuSlowdown ?? 1)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate })
  await page.goto('/?operation=region')
  const svg = page.locator('[data-pin-library-preview]'),
    rect = svg.locator('rect').last()
  await expect(svg).toHaveAttribute('viewBox', '-64 -64 192 160')
  const box = await svg.boundingBox(),
    shape = await rect.boundingBox()
  if (!box || !shape) throw Error('Prévia sem layout')
  expect(shape.x + shape.width / 2 - box.x).toBeCloseTo(79.5, 2)
  expect(shape.y + shape.height / 2 - box.y).toBeCloseTo(111, 2)
  await page.getByRole('button', { name: 'Conferir salvamento' }).click()
  const saved = page.locator('[data-saved]')
  await expect.poll(async () => JSON.parse((await saved.textContent())!)?.ok).toBe(true)
  const data = JSON.parse((await saved.textContent())!)
  expect(data.current).toBe(data.expected)
  expect(data.persisted).toBe(data.expected)
  await info.attach('pre-confirmacao', {
    body: JSON.stringify({
      operation: 'region-readonly',
      cpuSlowdown: rate,
      saved: data,
      box,
      shape,
    }),
    contentType: 'application/json',
  })
  await info.attach('controle', { body: await svg.screenshot(), contentType: 'image/png' })
  await cdp.detach()
})
