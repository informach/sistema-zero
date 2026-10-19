import type {} from './fixtures/bridge'
import { expect, test } from './fixtures/pythonLanguageSessions'

for (const kind of ['classic', 'pro'] as const)
  test(`live code anchor ${kind} follows canonical mixed EOL/UTF-16 and hides after edits or scrolling`, async ({
    page,
  }) => {
    const source =
      'nome = "😀"\r\nprint(nome)\n' +
      Array.from({ length: 90 }, (_, i) => `# linha ${i}\n`).join('')
    if (kind === 'pro')
      await page.evaluate((source) => pythonBridgeProbe.openPro({ 'src/main.py': source }), source)
    else await page.evaluate((source) => pythonBridgeProbe.replaceSavedSource(source), source)
    await expect(page.locator('.monaco-editor .view-lines').first()).toContainText('print(nome)')
    const point = await page.evaluate(() => pythonBridgeProbe.cursorPoint(2, 1))
    const anchor = await page.evaluate(
      ({ x, y }) => pythonBridgeProbe.codeObservation.anchorAt(x, y),
      point,
    )
    expect(anchor?.id).toBe(kind === 'pro' ? 'src/main.py' : 'main.py')
    expect(anchor?.start).toBe(source.indexOf('print'))
    expect(
      await page.evaluate(
        (anchor) => pythonBridgeProbe.codeObservation.positionOf(anchor!),
        anchor,
      ),
    ).not.toBeNull()
    await page.evaluate(() => pythonBridgeProbe.scrollCode(80))
    await expect
      .poll(() =>
        page.evaluate((anchor) => pythonBridgeProbe.codeObservation.positionOf(anchor!), anchor),
      )
      .toBeNull()
    await page.evaluate(() => pythonBridgeProbe.scrollCode(1))
    await expect
      .poll(() =>
        page.evaluate((anchor) => pythonBridgeProbe.codeObservation.positionOf(anchor!), anchor),
      )
      .not.toBeNull()
    await page.locator('.monaco-editor textarea').first().focus()
    await page.keyboard.press('Control+Home')
    await page.keyboard.type('# mudado\n')
    await expect
      .poll(() =>
        page.evaluate((anchor) => pythonBridgeProbe.codeObservation.positionOf(anchor!), anchor),
      )
      .toBeNull()
  })

test.beforeEach(async ({ page }, testInfo) => {
  const started = Date.now()
  // Match the approved cold browser initialization budget. Action assertions
  // retain their normal deadlines; no retry or sleep conceals a startup failure.
  const initializationBudgetMs = 12_000
  await page.goto('/')
  await page.waitForFunction(() => !!globalThis.pythonBridgeProbe)
  await page.evaluate(() => pythonBridgeProbe.create())
  await expect(page.locator('section[aria-label="Editor de blocos Python"]')).toHaveCSS(
    'position',
    'relative',
  )
  await expect(page.locator('.blocklyTextInputField').filter({ hasText: /^3$/ })).toBeVisible({
    timeout: Math.max(1, initializationBudgetMs - (Date.now() - started)),
  })
  await testInfo.attach('python-initial-blocks.json', {
    body: JSON.stringify({
      durationMs: Date.now() - started,
      budgetMs: initializationBudgetMs,
      context: 'fresh browser context; OS/compiler caches are not controlled',
    }),
    contentType: 'application/json',
  })
  await expect(page.locator('.monaco-editor').first()).toBeVisible()
})

test('Ponte synchronizes actual Blockly and Monaco edits and executes the saved Python', async ({
  page,
}, testInfo) => {
  await page.screenshot({ path: testInfo.outputPath('python-ponte-initial.png') })
  await page.locator('.blocklyTextInputField').filter({ hasText: /^3$/ }).dblclick()
  await page.locator('.blocklyHtmlInput').fill('40')
  await page.locator('.blocklyHtmlInput').press('Enter')
  await expect.poll(() => page.evaluate(() => pythonBridgeProbe.state().source)).toContain('(40)')
  await expect(page.locator('.monaco-editor .view-lines')).toContainText('(40)')
  await page.evaluate(() => pythonBridgeProbe.replaceSource('# meu código\nx = 9\nprint(x)\n'))
  await expect(page.locator('.blocklyTextInputField').filter({ hasText: /^9$/ })).toBeVisible()
  await page.getByRole('button', { name: 'Executar', exact: true }).click()
  await expect
    .poll(() =>
      page.evaluate(() =>
        pythonBridgeProbe
          .state()
          .logs.map((entry) => entry.text)
          .join('\n'),
      ),
    )
    .toContain('9')
  await expect(page.getByText('Programa concluído', { exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('python-ponte-wide.png') })
})

test('narrow layout keeps Python editors mounted while switching tabs', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 640, height: 850 })
  await page.evaluate(() => pythonBridgeProbe.layout(true))
  await expect(page.getByRole('tab', { name: 'Blocos', exact: true })).toBeVisible()
  await page.getByRole('tab', { name: 'Código Python', exact: true }).click()
  await expect(page.locator('.monaco-editor').first()).toBeVisible()
  await page.evaluate(() => pythonBridgeProbe.replaceSource('print("Olá")\n'))
  await page.getByRole('tab', { name: 'Blocos', exact: true }).click()
  await expect(page.locator('.blocklyTextInputField').filter({ hasText: /^Olá$/ })).toBeVisible()
  expect(await page.evaluate(() => pythonBridgeProbe.state().source)).toBe('print("Olá")\n')
  await page.screenshot({ path: testInfo.outputPath('python-ponte-narrow.png') })
})

test('Ponte connects real pointer selection in both editors and exposes programming categories', async ({
  page,
}) => {
  await page.locator('.blocklyTextInputField').filter({ hasText: /^3$/ }).click()
  await expect(page.locator('.sz-highlight-line')).toBeVisible()
  const point = await page.evaluate(() => pythonBridgeProbe.cursorPoint(3, 7))
  await page.mouse.click(point.x, point.y)
  await expect(page.locator('.blocklyHighlighted')).toHaveCount(1)
  await expect(page.locator('.blocklyHighlighted')).toContainText('x')
  await page.getByRole('treeitem', { name: 'Programação', exact: true }).click()
  await expect(page.getByRole('treeitem', { name: 'Textos', exact: true })).toBeVisible()
  await page.getByRole('treeitem', { name: 'Textos', exact: true }).click()
  await expect(
    page
      .locator('.blocklyFlyout .blocklyText')
      .filter({ hasText: /^texto$/ })
      .first(),
  ).toBeVisible()
})

test('source selection preserves mixed newlines loaded from a Python file', async ({ page }) => {
  const source = 'x = 4\r\ny = 2\nprint(x + y)\r\n'
  await page.evaluate((source) => pythonBridgeProbe.replaceSavedSource(source), source)
  await expect(page.locator('.blocklyTextInputField').filter({ hasText: /^4$/ })).toBeVisible()
  const point = await page.evaluate(() => pythonBridgeProbe.cursorPoint(3, 7))
  await page.mouse.click(point.x, point.y)
  await expect(page.locator('.blocklyHighlighted')).toHaveCount(1)
  await expect(page.locator('.blocklyHighlighted')).toContainText('x')
  expect(await page.evaluate(() => pythonBridgeProbe.state().source)).toBe(source)
})

test('Python tutor references select the current block and reopen a filtered category without editing', async ({
  page,
}) => {
  const source = await page.evaluate(() => pythonBridgeProbe.state().source)
  await page.evaluate(() => pythonBridgeProbe.observeSelections())
  await page.locator('.blocklyTextInputField').filter({ hasText: /^3$/ }).click()
  await expect
    .poll(() => page.evaluate(() => pythonBridgeProbe.selectionDebug()))
    .toMatchObject({
      selections: expect.arrayContaining([
        expect.objectContaining({ selectedBlockId: expect.any(String) }),
      ]),
    })
  const blockId = await page.evaluate(() => pythonBridgeProbe.selectedBlockId())
  if (!blockId)
    throw new Error(JSON.stringify(await page.evaluate(() => pythonBridgeProbe.selectionDebug())))
  const backgroundPoint = await page.locator('.blocklyMainBackground').evaluate((background) => {
    const bounds = background.getBoundingClientRect()
    for (let y = 0.9; y >= 0.1; y -= 0.1)
      for (let x = 0.1; x <= 0.9; x += 0.1) {
        const point = { x: bounds.left + bounds.width * x, y: bounds.top + bounds.height * y }
        if (document.elementFromPoint(point.x, point.y) === background) return point
      }
    throw new Error('No visible Blockly background point')
  })
  await page.mouse.click(backgroundPoint.x, backgroundPoint.y)
  await expect(page.locator('.blocklySelected')).toHaveCount(0)
  await page.evaluate(
    (blockId) =>
      pythonBridgeProbe.focusTutor({
        blockId,
        blockType: 'sz_py_integer',
        category: 'Programação',
        subcategory: 'Números e matemática',
      }),
    blockId,
  )
  await expect(page.locator('.blocklySelected')).toContainText('3')
  await page.getByRole('searchbox', { name: 'Buscar blocos' }).fill('categoria inexistente')
  await expect(page.getByRole('treeitem', { name: 'Nenhum bloco encontrado' })).toBeVisible()
  // The same ID with another type must not select an unrelated existing block.
  await page.evaluate(
    (blockId) =>
      pythonBridgeProbe.focusTutor({
        blockId,
        blockType: 'sz_py_text',
        category: 'Programação',
        subcategory: 'Textos',
      }),
    blockId,
  )
  await expect(page.getByRole('searchbox', { name: 'Buscar blocos' })).toHaveValue('')
  await expect(
    page
      .locator('.blocklyFlyout .blocklyText')
      .filter({ hasText: /^texto$/ })
      .first(),
  ).toBeVisible()
  expect(await page.evaluate(() => pythonBridgeProbe.state().source)).toBe(source)
})

test('a historical Python tutor reference cannot reveal a category removed by current curation', async ({
  page,
}) => {
  const source = await page.evaluate(() => pythonBridgeProbe.state().source)
  await page.evaluate(() => pythonBridgeProbe.learning({ allowBlocks: ['sz_py_print'] }))
  await page.getByRole('treeitem', { name: 'Programação', exact: true }).click()
  await expect(page.getByRole('treeitem', { name: 'Repetições', exact: true })).toHaveCount(0)
  await page.evaluate(() =>
    pythonBridgeProbe.focusTutor({
      blockType: 'sz_py_for',
      category: 'Programação',
      subcategory: 'Repetições',
    }),
  )
  await expect(page.getByRole('treeitem', { name: 'Repetições', exact: true })).toHaveCount(0)
  await expect(
    page.locator('.blocklyFlyout .blocklyText').filter({ hasText: /^para cada$/ }),
  ).toHaveCount(0)
  expect(await page.evaluate(() => pythonBridgeProbe.state().source)).toBe(source)
})

test('a block selection belongs to its project and exact source', async ({ page }) => {
  await page.locator('.blocklyTextInputField').filter({ hasText: /^3$/ }).click()
  await expect(page.locator('.sz-highlight-line')).toBeVisible()
  await page.evaluate(() => pythonBridgeProbe.replaceSavedSource('print(5)\n'))
  await expect(page.locator('.sz-highlight-line')).toHaveCount(0)
  await expect(page.locator('.blocklyTextInputField').filter({ hasText: /^5$/ })).toBeVisible()
  await page.locator('.blocklyTextInputField').filter({ hasText: /^5$/ }).click()
  await expect(page.locator('.sz-highlight-line')).toBeVisible()
  await page.evaluate(() => pythonBridgeProbe.switchProject('print(6)\n'))
  await expect(page.locator('.blocklyTextInputField').filter({ hasText: /^6$/ })).toBeVisible()
  await expect(page.locator('.sz-highlight-line')).toHaveCount(0)
  await expect(page.locator('.blocklyHighlighted')).toHaveCount(0)
})

test('mode routing honors Python curation and a revoked authoring approval without losing source', async ({
  page,
}) => {
  const source = await page.evaluate(() => pythonBridgeProbe.state().source)
  await page.getByRole('treeitem', { name: 'Programação', exact: true }).click()
  await expect(page.getByRole('treeitem', { name: 'Repetições', exact: true })).toBeVisible()
  await page.evaluate(() => pythonBridgeProbe.learning({ allowBlocks: ['sz_py_print'] }))
  await page.getByRole('treeitem', { name: 'Programação', exact: true }).click()
  await expect(page.getByRole('treeitem', { name: 'Repetições', exact: true })).toHaveCount(0)
  await page.evaluate(() => pythonBridgeProbe.approveBlocks(false))
  await expect(
    page.getByRole('alert').filter({ hasText: 'Os blocos Python deste projeto' }),
  ).toContainText('não estão disponíveis')
  expect(await page.evaluate(() => pythonBridgeProbe.state().source)).toBe(source)
  await page.evaluate(() => pythonBridgeProbe.approveBlocks(true))
  await expect(page.locator('.blocklyTextInputField').filter({ hasText: /^3$/ })).toBeVisible()
  expect(await page.evaluate(() => pythonBridgeProbe.state().source)).toBe(source)
})

test('Pro Python routes to its source editor and interpreter and keeps narrow preview usable', async ({
  page,
}) => {
  await page.evaluate(() => pythonBridgeProbe.openPro())
  await expect(page.locator('section[aria-label="Editor de blocos Python"]')).toHaveCount(0)
  await expect(page.locator('.monaco-editor .view-lines')).toContainText('Pro Python')
  await page.getByRole('button', { name: 'Executar', exact: true }).click()
  await expect(page.getByText('Programa concluído', { exact: true })).toBeVisible()
  await page.setViewportSize({ width: 640, height: 850 })
  await page.evaluate(() => pythonBridgeProbe.layout(true))
  const navigation = page.getByRole('navigation', { name: 'Organizar o editor' })
  await expect(navigation.getByRole('button', { name: 'Código', exact: true })).toBeVisible()
  await navigation.getByRole('button', { name: 'Jogo', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Reiniciar', exact: true })).toBeVisible()
  await expect(page.getByText('Programa concluído', { exact: true })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Terminal', exact: true })).toHaveCount(0)
  await navigation.getByRole('button', { name: 'Código', exact: true }).click()
  await expect(page.locator('.monaco-editor .view-lines')).toContainText('Pro Python')
})
