import { writeFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import type {} from './fixtures/authoring'

for (const kind of ['classic', 'pro'] as const)
  for (const purpose of ['authoring', 'rehearsal'] as const)
    test(`admin ${kind} ${purpose} executes real Turtle and preserves edits after permission loss`, async ({
      page,
      request,
    }, testInfo) => {
      const timing: Record<string, number> = {}
      const started = Date.now()
      await page.goto('/')
      await page.waitForFunction(() => !!globalThis.studioAuthoringProbe)
      await page.evaluate(({ kind, purpose }) => studioAuthoringProbe.create(kind, purpose), {
        kind,
        purpose,
      })
      await expect(page.locator('.monaco-editor').first()).toBeVisible()
      const drawing = page.frameLocator('iframe[title="Pré-visualização Python"]').locator('canvas')
      await expect(drawing).toBeVisible()
      timing.firstDrawingMs = Date.now() - started
      if (kind === 'classic') {
        await page.getByRole('button', { name: 'Mais opções', exact: true }).click()
        await page.getByRole('menuitem', { name: 'Console', exact: true }).click()
      } else await page.getByRole('button', { name: 'Console', exact: true }).click()
      await expect(page.getByText(/^drawing-ready \(/)).toBeVisible()
      const source =
        'import turtle\nturtle.forward(50)\nprint("author-edit-ready")\nturtle.done()\n'
      await page.evaluate((value) => studioAuthoringProbe.source(value), source)
      const restart = Date.now()
      await page.getByRole('button', { name: 'Reiniciar', exact: true }).click()
      try {
        await expect(page.getByText('author-edit-ready', { exact: true })).toBeVisible()
      } finally {
        timing.restartUntilOutputOrTimeoutMs = Date.now() - restart
        const timingPath = testInfo.outputPath('runtime-timing.json')
        await writeFile(
          timingPath,
          JSON.stringify({ kind, purpose, browser: testInfo.project.name, ...timing }),
        )
        await testInfo.attach('runtime-timing', {
          path: timingPath,
          contentType: 'application/json',
        })
      }
      const before = await page.evaluate(() => studioAuthoringProbe.read())
      const calls = await (await request.get('/authoring-probe/requests')).json()
      expect(calls.some((item: { operation: string }) => item.operation === 'execute')).toBe(true)
      expect(calls.every((item: { bytes: number }) => item.bytes < 3000)).toBe(true)
      await request.post('/authoring-probe/revoke')
      await page.getByRole('button', { name: 'Reiniciar', exact: true }).click()
      await expect(page.getByRole('alert').filter({ hasText: 'rascunho mudou' })).toBeVisible()
      await expect(page.locator('iframe')).toHaveCount(0)
      expect(await page.evaluate(() => studioAuthoringProbe.read())).toEqual(before)
      await page.evaluate(() => studioAuthoringProbe.close())
    })
