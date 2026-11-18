import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import { expect, type Page, test } from '@playwright/test'

function savedIds(value: unknown): string[] {
  const pending: unknown[] = [value]
  const ids: string[] = []
  while (pending.length) {
    const item = pending.pop()
    if (!item || typeof item !== 'object') continue
    if (
      'type' in item &&
      typeof item.type === 'string' &&
      'id' in item &&
      typeof item.id === 'string'
    )
      ids.push(item.id)
    pending.push(...Object.values(item))
  }
  return ids.sort()
}

async function persisted(page: Page, id: string) {
  return page.evaluate(async (id) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('sistema-zero-studio')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    try {
      const transaction = database.transaction('kv', 'readonly')
      const store = transaction.objectStore('kv')
      const read = (request: IDBRequest<unknown>) =>
        new Promise<unknown>((resolve, reject) => {
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => reject(request.error)
        })
      const values = Promise.all([
        read(store.get(`sz:v3:project-blocks:${id}`)),
        read(store.get(`sz:v3:project-files:${id}`)),
      ])
      transaction.commit()
      const [blocks, sources] = await values
      if (!blocks || typeof blocks !== 'object' || !('blocksState' in blocks)) return null
      if (!sources || typeof sources !== 'object' || !('files' in sources)) return null
      const files = sources.files
      if (
        !files ||
        typeof files !== 'object' ||
        !('script.js' in files) ||
        typeof files['script.js'] !== 'string'
      )
        return null
      const pending: unknown[] = [blocks.blocksState]
      const ids: string[] = []
      while (pending.length) {
        const item = pending.pop()
        if (!item || typeof item !== 'object') continue
        if (
          'type' in item &&
          typeof item.type === 'string' &&
          'id' in item &&
          typeof item.id === 'string'
        )
          ids.push(item.id)
        pending.push(...Object.values(item))
      }
      const digest = async (text: string) =>
        Array.from(
          new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))),
          (byte) => byte.toString(16).padStart(2, '0'),
        ).join('')
      return {
        count: ids.length,
        actualIds: ids,
        ids: await digest(ids.sort().join('\n')),
        code: await digest(files['script.js']),
      }
    } finally {
      database.close()
    }
  }, id)
}

for (const size of [2000, 5000, 10000]) {
  test(`${size} blocks: save during load, reload, edit, undo, redo and execute retain the complete project`, async ({
    page,
  }, testInfo) => {
    // Same stress deadline as classic-scale; no production timeout or quota changes.
    test.setTimeout(5 * 60_000)
    const phases: Record<string, number> = {}
    let phaseStarted = performance.now()
    const record = (name: string) => {
      const now = performance.now()
      phases[name] = Math.round(now - phaseStarted)
      phaseStarted = now
    }
    const { stdout } = await promisify(execFile)(
      'bun',
      ['scripts/profile-js-classic.ts', '--project'],
      {
        env: { ...process.env, SZ_PROFILE_BLOCKS: String(size) },
        maxBuffer: 4 * 1024 * 1024,
      },
    )
    const fixture: unknown = JSON.parse(stdout)
    if (!fixture || typeof fixture !== 'object' || !('blocksState' in fixture))
      throw new Error('Invalid canonical stress project')
    const ids = savedIds(fixture.blocksState)
    expect(ids.length).toBeGreaterThanOrEqual(size)
    const expectedIds = createHash('sha256').update(ids.join('\n')).digest('hex')
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')
    await page.locator('input[name="project-import-file"]').setInputFiles({
      name: `classic-${size}.szproject.json`,
      mimeType: 'application/json',
      buffer: Buffer.from(stdout),
    })
    await expect(page).toHaveURL(/\/editor\//)
    const id = decodeURIComponent(new URL(page.url()).pathname.split('/').at(-1) ?? '')
    await page.locator('[inert]').first().waitFor({ state: 'attached' })
    record('generateImportAndBeginLoadMs')
    const opening = await persisted(page, id)
    expect(opening?.ids).toBe(expectedIds)
    expect(opening?.count).toBe(ids.length)

    // The public Save shortcut and actual pagehide happen before the visual load finishes.
    await page.getByRole('button', { name: 'Mais opções', exact: true }).focus()
    await page.keyboard.press('ControlOrMeta+s')
    await page.reload({ waitUntil: 'commit' })
    await expect.poll(async () => (await persisted(page, id))?.ids).toBe(expectedIds)
    const number = (value: number) =>
      page
        .locator('.blocklyBlockCanvas .blocklyEditableField')
        .filter({ hasText: new RegExp(`^${value}$`) })
        .first()
    await number(480).waitFor({ state: 'visible', timeout: 120_000 })
    await expect(page.locator('[inert]')).toHaveCount(0)
    const baseline = await persisted(page, id)
    if (!baseline) throw new Error('The full project did not reopen')
    expect(
      baseline.ids,
      JSON.stringify({
        count: baseline.count,
        missing: ids.filter((id) => !baseline.actualIds.includes(id)).slice(0, 30),
        added: baseline.actualIds.filter((id) => !ids.includes(id)).slice(0, 30),
      }),
    ).toBe(expectedIds)
    expect(baseline.count).toBe(ids.length)

    record('saveInterruptReloadAndLoadMs')
    await number(480).click()
    await page.locator('input.blocklyHtmlInput').fill('500')
    await page.keyboard.press('Enter')
    await expect.poll(async () => (await persisted(page, id))?.code).not.toBe(baseline.code)
    const edited = await persisted(page, id)
    if (!edited) throw new Error('The edit was not saved')
    expect(edited.ids).toBe(expectedIds)

    record('editAndPersistMs')
    for (const [action, code] of [
      ['Desfazer', baseline.code],
      ['Refazer', edited.code],
    ]) {
      const button = page.getByRole('button', { name: action, exact: true })
      await button.scrollIntoViewIfNeeded()
      await expect(button).toBeInViewport()
      await button.click()
      await expect.poll(async () => (await persisted(page, id))?.code).toBe(code)
      expect((await persisted(page, id))?.ids).toBe(expectedIds)
      record(`${action}AndPersistMs`)
    }
    await page.reload({ waitUntil: 'commit' })
    await number(500).waitFor({ state: 'visible', timeout: 120_000 })
    expect((await persisted(page, id))?.ids).toBe(expectedIds)
    expect((await persisted(page, id))?.code).toBe(edited.code)

    record('reopenEditedMs')
    await page.getByRole('button', { name: /^Rodar(?: de novo)?$/ }).click()
    const game = page.frameLocator('iframe[title="Pré-visualização"]')
    await expect(game.locator('canvas').first()).toBeVisible()
    await expect
      .poll(() =>
        game.locator('body').evaluate(() => {
          const api: unknown = Reflect.get(window, 'SZGame2D')
          if (
            !api ||
            typeof api !== 'object' ||
            !('stageWidth' in api) ||
            typeof api.stageWidth !== 'function'
          )
            return null
          const width: unknown = api.stageWidth()
          return typeof width === 'number' ? width : null
        }),
      )
      .toBe(500)
    await page.getByRole('button', { name: 'Parar', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Rodar', exact: true })).toBeVisible()
    expect((await persisted(page, id))?.ids).toBe(expectedIds)
    record('runAndStopMs')
    const evidence = JSON.stringify(
      {
        blocks: ids.length,
        requested: size,
        engine: testInfo.project.name,
        platform: process.platform,
        browser: page.context().browser()?.version(),
        fixture: 'Farol with separate editable draft stacks; not a frame-rate benchmark',
        phases,
        note: 'Single-run end-to-end wall times include assertions and IndexedDB reads; not p95 input latency.',
      },
      null,
      2,
    )
    await mkdir('.cache/mission', { recursive: true })
    await writeFile(`.cache/mission/classic-incremental-${size}.json`, evidence)
    await testInfo.attach('integrity-phase-times', {
      body: evidence,
      contentType: 'application/json',
    })
  })
}
