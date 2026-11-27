import { expect, test } from '@playwright/test'

type Stored = { id: string; name: string; text: string | null; projected: boolean }
declare global {
  interface Window {
    pintaProjectedQA: {
      documents(): Promise<Stored[]>
      backup(): Promise<string | null>
      library(): Promise<Array<{ id: string }>>
      exportFromLibrary(
        id: string,
      ): Promise<{ ok: boolean; asset?: { dataUrl: string; regional?: { dataVersion: number } } }>
      exported: Array<{ regional?: { dataVersion: number }; dataUrl: string }>
    }
  }
}
const content = (text: string | null) =>
  JSON.stringify(JSON.parse(text!), (key, value) => (key === 'updatedAt' ? undefined : value))

for (const [name, projection] of [
  ['colmeia', 'hexagonal'],
  ['praca', 'isometric'],
] as const) {
  test(`${projection}: galeria → pincel → desfazer/refazer → reabrir → PNG 6 integral`, async ({
    page,
    browser,
    baseURL,
  }, testInfo) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(`/?profile=${projection}-${Date.now()}`)
    const open = page.getByRole('button', { name: new RegExp(`Abrir ${name} \\(`) })
    await expect(open).toBeVisible()
    const before = (await page.evaluate(() => window.pintaProjectedQA.documents())).find(
      (item) => item.name === name,
    )!
    expect(before.projected).toBe(true)
    await open.click()
    await expect(page.locator(`[data-projected-map-editor="${projection}"]`)).toBeVisible()
    await page.getByRole('button', { name: 'Peça 2', exact: true }).click()
    const stage = page.locator('canvas[aria-label="Desenhar no cenário"]')
    await expect(stage).toBeVisible()
    const box = (await stage.boundingBox())!
    if (testInfo.project.name === 'touch')
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
    else await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    await expect
      .poll(async () =>
        content(
          (await page.evaluate(() => window.pintaProjectedQA.documents())).find(
            (item) => item.id === before.id,
          )!.text,
        ),
      )
      .not.toBe(content(before.text))
    const after = (await page.evaluate(() => window.pintaProjectedQA.documents())).find(
      (item) => item.id === before.id,
    )!
    await page.getByRole('button', { name: /^Desfazer/ }).click()
    await expect
      .poll(async () =>
        content(
          (await page.evaluate(() => window.pintaProjectedQA.documents())).find(
            (item) => item.id === before.id,
          )!.text,
        ),
      )
      .toBe(content(before.text))
    await page.getByRole('button', { name: /^Refazer/ }).click()
    await expect
      .poll(async () =>
        content(
          (await page.evaluate(() => window.pintaProjectedQA.documents())).find(
            (item) => item.id === before.id,
          )!.text,
        ),
      )
      .toBe(content(after.text))
    await page.getByRole('button', { name: 'Voltar', exact: true }).click()
    await open.click()
    await expect(stage).toBeVisible()
    if (testInfo.project.name === 'desktop') {
      await page.getByRole('button', { name: 'Peça 4', exact: true }).click()
      await stage.focus()
      await stage.press('Enter')
      await expect
        .poll(async () =>
          content(
            (await page.evaluate(() => window.pintaProjectedQA.documents())).find(
              (item) => item.id === before.id,
            )!.text,
          ),
        )
        .not.toBe(content(after.text))
      await stage.press('ArrowLeft')
      await expect(page.getByRole('status').filter({ hasText: 'Coluna' })).toBeVisible()
      await page.getByRole('button', { name: /^Desfazer/ }).click()
      await expect
        .poll(async () =>
          content(
            (await page.evaluate(() => window.pintaProjectedQA.documents())).find(
              (item) => item.id === before.id,
            )!.text,
          ),
        )
        .toBe(content(after.text))
    }
    await page.getByRole('button', { name: 'Jogar meu mapa', exact: true }).click()
    await expect.poll(() => page.evaluate(() => window.pintaProjectedQA.exported.length)).toBe(1)
    const exported = await page.evaluate(() => window.pintaProjectedQA.exported[0])
    expect(exported?.regional?.dataVersion).toBe(6)
    expect(
      (await page.evaluate(() => window.pintaProjectedQA.library())).map((item) => item.id),
    ).toContain(before.id)
    const imported = await page.evaluate(
      (id) => window.pintaProjectedQA.exportFromLibrary(id),
      before.id,
    )
    expect(imported.ok).toBe(true)
    expect(imported.asset?.regional?.dataVersion).toBe(6)
    expect(imported.asset?.dataUrl).toBe(exported?.dataUrl)
    // A browser context with empty IndexedDB restores through the actual file picker and importer.
    const backup = await page.evaluate(() => window.pintaProjectedQA.backup())
    expect(backup).not.toBeNull()
    const cold = await browser.newContext({ baseURL })
    try {
      const next = await cold.newPage()
      await next.goto(`/?profile=cold-${projection}-${Date.now()}&blank=1`)
      await expect(next.getByRole('button', { name: 'Trazer de volta', exact: true })).toBeVisible()
      await next.locator('input[type="file"][accept^=".pinta.json"]').setInputFiles({
        name: 'galeria.pinta.json',
        mimeType: 'application/json',
        buffer: Buffer.from(backup!),
      })
      const restoredCard = next.getByRole('button', { name: new RegExp(`Abrir ${name} \\(`) })
      await expect(restoredCard).toBeVisible()
      const restored = (await next.evaluate(() => window.pintaProjectedQA.documents())).find(
        (item) => item.name === name,
      )!
      const original = JSON.parse(after.text!).assets[0],
        document = JSON.parse(restored.text!).assets[0]
      expect(document.map.projection).toEqual(original.map.projection)
      expect(document.map.origin).toEqual(original.map.origin)
      expect(document.map.layers.map((layer: { cells?: unknown }) => layer.cells)).toEqual(
        original.map.layers.map((layer: { cells?: unknown }) => layer.cells),
      )
      if (original.book) {
        expect(document.book.rules).toHaveLength(original.book.rules.length)
        const ids = new Set(document.map.layers.map((layer: { id: string }) => layer.id))
        for (const rule of document.book.rules)
          for (const plane of [...rule.input, ...rule.outputs.flat()]) {
            expect(ids.has(plane.layer)).toBe(true)
            expect(plane.sheet).toBe(document.map.tilesetId)
          }
      }
      await restoredCard.click()
      await expect(next.locator(`[data-projected-map-editor="${projection}"]`)).toBeVisible()
    } finally {
      await cold.close()
    }
    await page.screenshot({ path: testInfo.outputPath(`${projection}.png`) })
    await page.reload()
    await expect(open).toBeVisible()
    expect(
      content(
        (await page.evaluate(() => window.pintaProjectedQA.documents())).find(
          (item) => item.id === before.id,
        )!.text,
      ),
    ).toBe(content(after.text))
    if (testInfo.project.name === 'desktop') {
      await open.click()
      await page.getByRole('button', { name: 'Peça 3', exact: true }).click()
      const interrupted = (await stage.boundingBox())!
      await page.mouse.move(
        interrupted.x + interrupted.width / 2,
        interrupted.y + interrupted.height / 2,
      )
      await page.mouse.down()
      // A held gesture must reach autosave instead of claiming "Salvo" for a RAM-only preview.
      await expect
        .poll(async () =>
          content(
            (await page.evaluate(() => window.pintaProjectedQA.documents())).find(
              (item) => item.id === before.id,
            )!.text,
          ),
        )
        .not.toBe(content(after.text))
      // Interrupt after the actual durable checkpoint while the pointer is still down.
      await page.reload()
      await page.mouse.up()
      await expect(open).toBeVisible()
      await expect
        .poll(async () =>
          content(
            (await page.evaluate(() => window.pintaProjectedQA.documents())).find(
              (item) => item.id === before.id,
            )!.text,
          ),
        )
        .not.toBe(content(after.text))
    }
    expect(errors).toEqual([])
  })
}

for (const projection of ['hexagonal', 'isometric'] as const) {
  test(`${projection}: criar mapa e livro pelo fluxo comum e reabrir sem versão paralela`, async ({
    page,
  }) => {
    await page.goto(`/?profile=new-${projection}-${Date.now()}`)
    await page.getByRole('button', { name: 'Criar novo', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: /^Pixel art/ }).click()
    await dialog.getByRole('button', { name: /^Mapa / }).click()
    await dialog
      .getByRole('button', {
        name: projection === 'hexagonal' ? /^Mapa hexagonal/ : /^Mapa isométrico/,
      })
      .click()
    const name = 'novo-' + projection
    await dialog.getByRole('textbox', { name: 'Qual o nome?' }).fill(name)
    await dialog.getByRole('button', { name: 'Começar a desenhar', exact: true }).click()
    await expect(page.locator(`[data-projected-map-editor="${projection}"]`)).toBeVisible()
    await page.getByRole('button', { name: 'Criar autorregras', exact: true }).click()
    await expect
      .poll(async () => {
        const saved = (await page.evaluate(() => window.pintaProjectedQA.documents())).find(
          (item) => item.name === name,
        )
        return saved?.text && !!JSON.parse(saved.text).assets[0].book
      })
      .toBe(true)
    await page.getByRole('button', { name: /^Desfazer/ }).click()
    await expect
      .poll(async () => {
        const saved = (await page.evaluate(() => window.pintaProjectedQA.documents())).find(
          (item) => item.name === name,
        )
        return saved?.text && !!JSON.parse(saved.text).assets[0].book
      })
      .toBe(false)
    await page.getByRole('button', { name: /^Refazer/ }).click()
    const stage = page.locator('canvas[aria-label="Desenhar no cenário"]')
    const box = (await stage.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    const location = page.getByRole('status').filter({ hasText: /^Coluna/ })
    await expect(location).toHaveText(/^Coluna -?\d+, linha -?\d+$/)
    const coordinates = (await location.textContent())!.match(/-?\d+/g)!.map(Number)
    const rules = page.locator('[data-pinta-automapping]')
    await rules
      .getByRole('spinbutton', { name: 'Coluna', exact: true })
      .fill(String(coordinates[0]))
    await rules.getByRole('spinbutton', { name: 'Linha', exact: true }).fill(String(coordinates[1]))
    await rules.getByRole('button', { name: 'Copiar o antes', exact: true }).click()
    await page.getByRole('button', { name: 'Peça 2', exact: true }).click()
    await stage.click({ position: { x: box.width / 2, y: box.height / 2 } })
    await rules.getByRole('button', { name: 'Guardar o depois', exact: true }).click()
    await expect
      .poll(async () => {
        const saved = (await page.evaluate(() => window.pintaProjectedQA.documents())).find(
          (item) => item.name === name,
        )
        return saved?.text && JSON.parse(saved.text).assets[0].book?.rules.length
      })
      .toBe(1)
    await page.getByRole('button', { name: 'Borracha', exact: true }).click()
    await stage.click({ position: { x: box.width / 2, y: box.height / 2 } })
    let empty: string | null = null
    await expect
      .poll(async () => {
        empty = (await page.evaluate(() => window.pintaProjectedQA.documents())).find(
          (item) => item.name === name,
        )!.text
        return JSON.parse(empty!)
          .assets[0].map.layers.filter((layer: { cells?: { chunks: unknown[] } }) => layer.cells)
          .every((layer: { cells: { chunks: unknown[] } }) => layer.cells.chunks.length === 0)
      })
      .toBe(true)
    await rules.getByRole('button', { name: 'Ver prévia na área', exact: true }).click()
    await expect(rules.getByRole('button', { name: 'Aplicar prévia', exact: true })).toBeVisible()
    expect(
      content(
        (await page.evaluate(() => window.pintaProjectedQA.documents())).find(
          (item) => item.name === name,
        )!.text,
      ),
    ).toBe(content(empty))
    await rules.getByRole('button', { name: 'Aplicar prévia', exact: true }).click()
    await expect
      .poll(async () =>
        content(
          (await page.evaluate(() => window.pintaProjectedQA.documents())).find(
            (item) => item.name === name,
          )!.text,
        ),
      )
      .not.toBe(content(empty))
    await page.getByRole('button', { name: 'Voltar', exact: true }).click()
    await page.reload()
    await page.getByRole('button', { name: new RegExp('Abrir ' + name + ' \\(') }).click()
    await expect(page.locator(`[data-projected-map-editor="${projection}"]`)).toBeVisible()
    const saved = (await page.evaluate(() => window.pintaProjectedQA.documents())).find(
      (item) => item.name === name,
    )!
    expect(saved.projected).toBe(true)
    const doc = JSON.parse(saved.text!).assets[0]
    expect(doc.map.projection.kind).toBe(projection)
    expect(doc.book.rules).toHaveLength(1)
  })
}
