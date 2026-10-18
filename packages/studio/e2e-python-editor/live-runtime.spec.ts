import { writeFile } from 'node:fs/promises'
import { expect, type Page, test } from '@playwright/test'
import type {} from './fixtures/live'

test('live Classic continuation applies its allowed mode without creating a recovery draft', async ({
  page,
  request,
}) => {
  expect((await request.post('/live-probe/setup?kind=classic')).ok()).toBe(true)
  await page.goto('/')
  await page.waitForFunction(() => !!globalThis.studioLiveProbe)
  await page.evaluate(() => studioLiveProbe.create('child', 'library'))
  await expect(page.getByRole('button', { name: 'Guardar', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Blocos', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(
    page.getByRole('button', { name: 'Guardar na minha conta', exact: true }),
  ).toHaveCount(0)
  await expect(page.locator('.blocklySvg').first()).toBeVisible()
  await expect(page.locator('.monaco-editor')).toHaveCount(0)
  expect((await (await request.get('/live-probe/state')).json()).workspace.revision).toBe(0)
})

for (const kind of ['classic', 'pro'] as const) {
  test(`live ${kind} preserves Python through real student/teacher handoff and revocation`, async ({
    page,
    browser,
    request,
  }, testInfo) => {
    test.setTimeout(90_000)
    expect((await request.post(`/live-probe/setup?kind=${kind}`)).ok()).toBe(true)
    const teacherContext = await browser.newContext({
      baseURL: 'http://127.0.0.1:5298',
      viewport: { width: 1440, height: 1000 },
    })
    const teacher = await teacherContext.newPage()
    const timings: { stage: string; milliseconds: number; targetMs: number; reached: boolean }[] =
      []
    const drawing = async (target: Page, stage: string, targetMs: number) => {
      const started = Date.now()
      let reached = false
      try {
        // Functional readiness follows the interpreter's startup ceiling. The separate
        // timing record retains the stricter cold/cache performance targets and failures.
        await expect(
          target.frameLocator('iframe[title="Pré-visualização Python"]').locator('canvas'),
        ).toBeVisible({ timeout: 30_000 })
        reached = true
      } finally {
        timings.push({ stage, milliseconds: Date.now() - started, targetMs, reached })
      }
    }
    try {
      await page.addInitScript(() => {
        addEventListener('message', (event) => {
          if (event.data?.type === 'python-frame-init')
            (globalThis as unknown as { qualificationSnapshot: unknown }).qualificationSnapshot =
              event.data.snapshot
        })
      })
      await page.goto('/')
      await page.bringToFront()
      await page.waitForFunction(() => !!globalThis.studioLiveProbe)
      await page.evaluate(() => studioLiveProbe.create('child'))
      await expect(page.getByRole('button', { name: 'Guardar', exact: true })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Executar', exact: true })).toBeEnabled()
      await page.getByRole('button', { name: 'Executar', exact: true }).click()
      await drawing(page, 'learner-first-drawing', 12_000)
      const edited =
        'import turtle\nturtle.forward(60)\nprint("student-live-edit")\nturtle.done()\n'
      await page.evaluate((source) => studioLiveProbe.source(source), edited)
      await page.getByRole('button', { name: 'Guardar', exact: true }).click()
      await expect
        .poll(async () =>
          JSON.stringify((await (await request.get('/live-probe/state')).json()).workspace.project),
        )
        .toContain('student-live-edit')
      // Autosave does not dispose the running interpreter.
      await expect(
        page.frameLocator('iframe[title="Pré-visualização Python"]').locator('canvas'),
      ).toBeVisible()
      await teacher.goto('/')
      await teacher.bringToFront()
      await teacher.waitForFunction(() => !!globalThis.studioLiveProbe)
      await teacher.evaluate(() => studioLiveProbe.create('teacher'))
      await expect(teacher.locator('.monaco-editor').first()).toBeVisible({ timeout: 30_000 })
      await expect.poll(() => teacher.evaluate(() => studioLiveProbe.read())).toBe(edited)
      if (kind === 'classic')
        await expect(teacher.locator('.blocklyBlockCanvas > g').first()).toBeVisible({
          timeout: 30_000,
        })
      await expect(teacher.locator('iframe[title="Pré-visualização Python"]')).toHaveCount(0)
      await teacher.getByRole('button', { name: 'Pedir para ajudar', exact: true }).click()
      await page.bringToFront()
      await page.getByRole('button', { name: 'Sim, pode ajudar', exact: true }).click()
      await expect(teacher.getByRole('button', { name: 'Guardar', exact: true })).toBeVisible()
      await expect(page.locator('iframe[title="Pré-visualização Python"]')).toHaveCount(0)
      await teacher.bringToFront()
      await expect(teacher.getByRole('button', { name: 'Executar', exact: true })).toBeEnabled()
      await teacher.getByRole('button', { name: 'Executar', exact: true }).click()
      await drawing(teacher, 'teacher-first-drawing', 12_000)
      const helped = edited.replace('student-live-edit', 'teacher-live-edit')
      await teacher.evaluate((source) => studioLiveProbe.source(source), helped)
      await teacher.getByRole('button', { name: 'Devolver o projeto', exact: true }).click()
      await page.bringToFront()
      await expect(page.getByRole('button', { name: 'Guardar', exact: true })).toBeVisible()
      await expect(teacher.locator('iframe[title="Pré-visualização Python"]')).toHaveCount(0)
      await expect.poll(() => page.evaluate(() => studioLiveProbe.read())).toBe(helped)
      await expect
        .poll(async () =>
          JSON.stringify((await (await request.get('/live-probe/state')).json()).workspace.project),
        )
        .toContain('teacher-live-edit')
      await page.getByRole('button', { name: 'Executar', exact: true }).click()
      await drawing(page, 'learner-return-drawing', 3_000)
      const before = await page.evaluate(() => studioLiveProbe.read())
      await request.post('/live-probe/revoke')
      await page.getByRole('button', { name: 'Reiniciar', exact: true }).click()
      await expect(page.locator('iframe[title="Pré-visualização Python"]')).toHaveCount(0)
      await expect.poll(() => page.evaluate(() => studioLiveProbe.read())).toBe(before)
      const state = await (await request.get('/live-probe/state')).json()
      expect(
        new Set(
          state.requests
            .filter((entry: { operation: string }) => entry.operation === 'execute')
            .map((entry: { actorId: string }) => entry.actorId),
        ).size,
      ).toBe(2)
      expect(state.requests.every((entry: { bytes: number }) => entry.bytes < 3000)).toBe(true)
      await page.evaluate(() => studioLiveProbe.close())
    } finally {
      try {
        const drafts = await page.evaluate(async () => {
          const db = await new Promise<IDBDatabase>((resolve, reject) => {
            const open = indexedDB.open('sz-live-drafts', 1)
            open.onsuccess = () => resolve(open.result)
            open.onerror = () => reject(open.error)
          })
          try {
            return await new Promise<unknown[]>((resolve, reject) => {
              const read = db.transaction('drafts').objectStore('drafts').getAll()
              read.onsuccess = () => resolve(read.result)
              read.onerror = () => reject(read.error)
            })
          } finally {
            db.close()
          }
        })
        const statePath = testInfo.outputPath('live-workspace-state.json')
        await writeFile(
          statePath,
          JSON.stringify(
            {
              drafts,
              timings,
              canonical: await (await request.get('/live-probe/state')).json(),
              rendering: await Promise.all(
                page.frames().map(async (frame) => ({
                  url: frame.url(),
                  snapshot: await frame
                    .evaluate(
                      () =>
                        (globalThis as unknown as { qualificationSnapshot?: unknown })
                          .qualificationSnapshot,
                    )
                    .catch(() => undefined),
                  elements: await frame
                    .evaluate(() =>
                      [...document.querySelectorAll('canvas,iframe')].map((element) => ({
                        tag: element.tagName,
                        title: element.getAttribute('title'),
                        rect: element.getBoundingClientRect().toJSON(),
                        style: element.getAttribute('style'),
                        parent: element.parentElement?.getBoundingClientRect().toJSON(),
                      })),
                    )
                    .catch(() => []),
                })),
              ),
            },
            null,
            2,
          ),
        )
        await testInfo.attach('live-workspace-state', {
          contentType: 'application/json',
          path: statePath,
        })
      } catch (error) {
        // Diagnostics must not replace the original browser failure or leak a context.
        await testInfo.attach('live-diagnostic-error', {
          contentType: 'text/plain',
          body: String(error),
        })
      } finally {
        await teacherContext.close()
      }
    }
  })
}
