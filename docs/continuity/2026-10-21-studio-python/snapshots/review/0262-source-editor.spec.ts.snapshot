import { expect, test } from '@playwright/test'
import type {} from './fixtures/main'

for (const kind of ['classic', 'pro'] as const) {
  test(`${kind}: Undo cannot restore source that now exceeds the project quota`, async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('/')
    await page.waitForFunction(() => typeof pythonEditorProbe !== 'undefined')
    await page.evaluate((kind) => pythonEditorProbe.create(kind), kind)
    await expect(page.locator('.monaco-editor')).toBeVisible()
    await page.evaluate(() => pythonEditorProbe.replace('#'.repeat(180)))
    await page.evaluate(() => pythonEditorProbe.replace('print(1)'))
    await page.evaluate(() => pythonEditorProbe.otherFile('#'.repeat(180)))
    await page.evaluate(() => pythonEditorProbe.undo())
    await expect(
      page.getByRole('alert').filter({ hasText: 'A alteração foi recusada' }),
    ).toBeVisible()
    const history = await page.evaluate(() => {
      const seen = []
      for (let i = 0; i < 4; i++) {
        if (i % 2) pythonEditorProbe.undo()
        else pythonEditorProbe.redo()
        seen.push({ model: pythonEditorProbe.model().value, source: pythonEditorProbe.source() })
      }
      return seen
    })
    for (const item of history) {
      expect(item.model).toBe(item.source)
      expect(item.model.length).toBeLessThanOrEqual(120)
    }
    await page.evaluate(() => pythonEditorProbe.replace('print(2)'))
    expect(await page.evaluate(() => pythonEditorProbe.source())).toBe('print(2)')
    expect(errors).toEqual([])
  })
  test(`${kind}: rejected source stays consistent and Undo/Redo retains accepted edits`, async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('/')
    await page.waitForFunction(() => typeof pythonEditorProbe !== 'undefined')
    await page.evaluate((kind) => pythonEditorProbe.create(kind), kind)
    await expect(page.locator('.monaco-editor')).toBeVisible()
    await expect.poll(() => page.evaluate(() => pythonEditorProbe.model().language)).toBe('python')
    const original = await page.evaluate(() => pythonEditorProbe.source())
    await page.evaluate(() => pythonEditorProbe.replace('print(1)'))
    await expect.poll(() => page.evaluate(() => pythonEditorProbe.source())).toBe('print(1)')
    await page.evaluate(() => pythonEditorProbe.replace('x'.repeat(256_001)))
    await expect(
      page.getByRole('alert').filter({ hasText: 'A alteração foi recusada' }),
    ).toBeVisible()
    expect(
      await page.evaluate(() => ({
        model: pythonEditorProbe.model().value,
        source: pythonEditorProbe.source(),
      })),
    ).toEqual({ model: 'print(1)', source: 'print(1)' })
    // The no-op rejected gesture may occupy an undo step; neither direction may expose it.
    const history = await page.evaluate(() => {
      const seen = []
      for (let i = 0; i < 3; i++) {
        pythonEditorProbe.undo()
        seen.push({ model: pythonEditorProbe.model().value, source: pythonEditorProbe.source() })
      }
      for (let i = 0; i < 3; i++) {
        pythonEditorProbe.redo()
        seen.push({ model: pythonEditorProbe.model().value, source: pythonEditorProbe.source() })
      }
      return seen
    })
    expect(history.some((item) => item.source === original)).toBe(true)
    expect(history.at(-1)?.source).toBe('print(1)')
    for (const item of history) {
      expect(item.model).toBe(item.source)
      expect(item.model.length).toBeLessThan(256_001)
    }
    await page.evaluate(() => pythonEditorProbe.replace('print(2)', false))
    await page.evaluate(() => pythonEditorProbe.replace('x'.repeat(256_001), false))
    expect(await page.evaluate(() => pythonEditorProbe.model().value)).toBe('print(2)')
    expect(await page.evaluate(() => pythonEditorProbe.source())).toBe('print(2)')
    expect(errors).toEqual([])
  })
}
