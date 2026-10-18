import { expect, test } from '@playwright/test'
import type {} from './fixtures/blocklyEditorHost'

test.beforeEach(async ({ page }) => {
  await page.goto('/analysis')
  await page.waitForFunction(() => !!globalThis.pythonBlocklyEditorProbe)
  await page.evaluate(() => pythonBlocklyEditorProbe.create())
  await expect(page.getByRole('region', { name: 'Editor de blocos Python' })).not.toHaveAttribute(
    'inert',
  )
  await page.waitForFunction(() => pythonBlocklyEditorProbe.state().count > 0)
})
test.afterEach(async ({ page }) => {
  await page.evaluate(() => pythonBlocklyEditorProbe.dispose())
})

test('production Blockly surface commits edits and uses the shared undo/redo history', async ({
  page,
}) => {
  const immediate = await page.evaluate(() => pythonBlocklyEditorProbe.number('40'))
  expect(immediate).toEqual({ source: '# placar\nx = 3\nprint(x)\n', pending: true })
  await expect
    .poll(() => page.evaluate(() => pythonBlocklyEditorProbe.state().source))
    .toBe('# placar\nx = (40)\nprint(x)\n')
  await page.evaluate(() => pythonBlocklyEditorProbe.undo())
  await expect
    .poll(() => page.evaluate(() => pythonBlocklyEditorProbe.state().source))
    .toBe('# placar\nx = (3)\nprint(x)\n')
  await page.evaluate(() => pythonBlocklyEditorProbe.redo())
  await expect
    .poll(() => page.evaluate(() => pythonBlocklyEditorProbe.state().source))
    .toBe('# placar\nx = (40)\nprint(x)\n')
})

test('incomplete edits survive unmount and require an explicit restore or discard', async ({
  page,
}) => {
  await page.evaluate(() => pythonBlocklyEditorProbe.incomplete())
  await expect(page.getByRole('status')).toContainText('Preencha')
  await page.evaluate(() => pythonBlocklyEditorProbe.remount())
  await page.getByRole('button', { name: 'Restaurar alterações dos blocos' }).click()
  await expect(page.getByRole('status')).toContainText('Preencha')
  expect(await page.evaluate(() => pythonBlocklyEditorProbe.state().pending)).toBe(true)
  await page.evaluate(() => pythonBlocklyEditorProbe.remount())
  await page.getByRole('button', { name: 'Descartar rascunho e abrir o código salvo' }).click()
  await expect.poll(() => page.evaluate(() => pythonBlocklyEditorProbe.state().pending)).toBe(false)
  expect(await page.evaluate(() => pythonBlocklyEditorProbe.state().source)).toBe(
    '# placar\nx = 3\nprint(x)\n',
  )
})

test('source syntax errors preserve source and observation refuses mutations', async ({ page }) => {
  await page.evaluate(() => pythonBlocklyEditorProbe.source('if :\n'))
  await expect(page.getByRole('alert')).toBeVisible()
  expect(await page.evaluate(() => pythonBlocklyEditorProbe.state().source)).toBe('if :\n')
  await page.evaluate(() => pythonBlocklyEditorProbe.source('x = 7\n'))
  await expect(page.getByRole('region', { name: 'Editor de blocos Python' })).not.toHaveAttribute(
    'inert',
  )
  await page.evaluate(() => pythonBlocklyEditorProbe.observe())
  await expect(page.getByRole('searchbox')).toHaveCount(0)
  await page.waitForFunction(() => pythonBlocklyEditorProbe.state().count > 0)
  await page.evaluate(() => pythonBlocklyEditorProbe.number('90'))
  expect(await page.evaluate(() => pythonBlocklyEditorProbe.state().source)).toBe('x = 7\n')
})

test('transient parser failure can retry without publishing an empty workspace', async ({
  page,
}) => {
  await page.evaluate(() => {
    pythonBlocklyEditorProbe.setAnalysisUnavailable(true)
    pythonBlocklyEditorProbe.remount()
  })
  await expect(page.getByRole('alert')).toContainText('Falha de conexão')
  await page.evaluate(() => pythonBlocklyEditorProbe.setAnalysisUnavailable(false))
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await page.waitForFunction(() => pythonBlocklyEditorProbe.state().count > 0)
  await expect(page.getByRole('region', { name: 'Editor de blocos Python' })).not.toHaveAttribute(
    'inert',
  )
  expect(await page.evaluate(() => pythonBlocklyEditorProbe.state().source)).toBe(
    '# placar\nx = 3\nprint(x)\n',
  )
})

test('an observer sees the saved source when the author has unfinished blocks', async ({
  page,
}) => {
  await page.evaluate(() => {
    pythonBlocklyEditorProbe.incomplete()
    pythonBlocklyEditorProbe.observe()
  })
  await expect(page.getByRole('status')).toContainText('Você está vendo o código salvo')
  await expect(page.getByRole('button', { name: 'Restaurar alterações dos blocos' })).toHaveCount(0)
  expect(await page.evaluate(() => pythonBlocklyEditorProbe.state().pending)).toBe(true)
  await page.waitForFunction(() => pythonBlocklyEditorProbe.state().count > 0)
})

test('a real field gesture preserves unfinished text through explicit recovery', async ({
  page,
}, testInfo) => {
  await page.locator('.blocklyTextInputField').filter({ hasText: /^3$/ }).dblclick()
  await page.locator('.blocklyHtmlInput').fill('12a')
  await page.locator('.blocklyHtmlInput').press('Enter')
  await expect(page.getByRole('status')).toContainText('número inteiro')
  await page.evaluate(() => pythonBlocklyEditorProbe.remount())
  await page.getByRole('button', { name: 'Restaurar alterações dos blocos' }).click()
  await expect(page.locator('.blocklyTextInputField').filter({ hasText: /^12a$/ })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('python-blockly-editor.png') })
  expect(await page.evaluate(() => pythonBlocklyEditorProbe.state().source)).toBe(
    '# placar\nx = 3\nprint(x)\n',
  )
})

test('a gesture queued during source publication is subsequently committed', async ({ page }) => {
  await page.evaluate(() => {
    pythonBlocklyEditorProbe.numberDuringNextCommit('41')
    pythonBlocklyEditorProbe.number('40')
  })
  await expect
    .poll(() => page.evaluate(() => pythonBlocklyEditorProbe.state().source))
    .toBe('# placar\nx = (41)\nprint(x)\n')
  await expect.poll(() => page.evaluate(() => pythonBlocklyEditorProbe.state().pending)).toBe(false)
  await expect(page.locator('.blocklyTextInputField').filter({ hasText: /^41$/ })).toBeVisible()
})

test('restore cannot replace a newer draft offered by another owner', async ({ page }) => {
  await page.evaluate(() => pythonBlocklyEditorProbe.number('12a'))
  await expect(page.getByRole('status')).toContainText('número inteiro')
  await page.evaluate(() => pythonBlocklyEditorProbe.remount())
  const restore = page.getByRole('button', { name: 'Restaurar alterações dos blocos' })
  await expect(restore).toBeVisible()
  const newer = await page.evaluate(() => pythonBlocklyEditorProbe.replacePendingNumber('17b'))
  await restore.click()
  await expect(restore).toBeVisible()
  expect(await page.evaluate(() => pythonBlocklyEditorProbe.state().generation)).toBe(newer)
  await restore.click()
  await expect(page.locator('.blocklyTextInputField').filter({ hasText: /^17b$/ })).toBeVisible()
  expect(await page.evaluate(() => pythonBlocklyEditorProbe.state().source)).toBe(
    '# placar\nx = 3\nprint(x)\n',
  )
  expect(await page.evaluate(() => pythonBlocklyEditorProbe.state().pending)).toBe(true)
})

test('search can return no blocks and recover its curated toolbox', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.getByRole('searchbox', { name: 'Buscar blocos' }).fill('zzzz-não-existe')
  await expect(page.getByRole('treeitem', { name: 'Nenhum bloco encontrado' })).toBeVisible()
  await page.getByRole('searchbox', { name: 'Buscar blocos' }).fill('')
  await expect(page.getByRole('treeitem', { name: 'Nenhum bloco encontrado' })).toHaveCount(0)
  await expect(page.getByRole('treeitem').first()).toBeVisible()
  expect(errors).toEqual([])
  expect(await page.evaluate(() => pythonBlocklyEditorProbe.state().source)).toBe(
    '# placar\nx = 3\nprint(x)\n',
  )
})

test('shadowing a built-in changes its label without breaking visual history', async ({ page }) => {
  await expect(
    page.getByRole('region').getByText('mostrar no console', { exact: true }),
  ).toBeVisible()
  await page.evaluate(() => pythonBlocklyEditorProbe.renameAssignment('print'))
  await expect(
    page.getByRole('region').getByText('chamada Python (ver código)', { exact: true }),
  ).toBeVisible()
  await expect.poll(() => page.evaluate(() => pythonBlocklyEditorProbe.state().pending)).toBe(false)
  expect(await page.evaluate(() => pythonBlocklyEditorProbe.state().source)).toContain('print = 3')
  await page.evaluate(() => pythonBlocklyEditorProbe.undo())
  await expect(
    page.getByRole('region').getByText('mostrar no console', { exact: true }),
  ).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => pythonBlocklyEditorProbe.state().source))
    .toBe('# placar\nx = 3\nprint(x)\n')
  await page.evaluate(() => pythonBlocklyEditorProbe.redo())
  await expect(
    page.getByRole('region').getByText('chamada Python (ver código)', { exact: true }),
  ).toBeVisible()
  await page.evaluate(() => pythonBlocklyEditorProbe.incomplete())
  await expect(page.getByRole('status')).toContainText('Preencha')
  await expect(
    page.getByRole('region').getByText('chamada Python (ver código)', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('region').getByText('mostrar no console', { exact: true }),
  ).toHaveCount(0)
})

test('file switching and remount preserve each visual layout and its notes', async ({ page }) => {
  await page.evaluate(() => pythonBlocklyEditorProbe.arrange(72, 96, 'principal'))
  await expect.poll(() => page.evaluate(() => pythonBlocklyEditorProbe.state().pending)).toBe(false)
  await page.evaluate(() => pythonBlocklyEditorProbe.selectFile('layout_helper.py'))
  await expect(page.locator('.blocklyTextInputField').filter({ hasText: /^8$/ })).toBeVisible()
  await page.evaluate(() => pythonBlocklyEditorProbe.arrange(192, 144, 'auxiliar'))
  await expect.poll(() => page.evaluate(() => pythonBlocklyEditorProbe.state().pending)).toBe(false)
  await page.evaluate(() => pythonBlocklyEditorProbe.selectFile('main.py'))
  await expect
    .poll(() => page.evaluate(() => pythonBlocklyEditorProbe.arrangement()))
    .toEqual({ x: 72, y: 96, note: 'principal' })
  await page.evaluate(() => pythonBlocklyEditorProbe.remount())
  await expect
    .poll(() => page.evaluate(() => pythonBlocklyEditorProbe.arrangement()))
    .toEqual({ x: 72, y: 96, note: 'principal' })
  await page.evaluate(() => pythonBlocklyEditorProbe.selectFile('layout_helper.py'))
  await expect
    .poll(() => page.evaluate(() => pythonBlocklyEditorProbe.arrangement()))
    .toEqual({ x: 192, y: 144, note: 'auxiliar' })
})

test('a combined Blockly move and insertion preserves comments through Undo, Redo and remount', async ({
  page,
}) => {
  await page.evaluate(() => pythonBlocklyEditorProbe.source('x = 1 # x\ny = 2 # y\n'))
  await expect(page.locator('.blocklyTextInputField').filter({ hasText: /^2$/ })).toBeVisible()
  await page.evaluate(() => pythonBlocklyEditorProbe.rearrangeAndInsert())
  const edited = "y = 2 # y\nprint('novo')\nx = (10) # x\n"
  await expect.poll(() => page.evaluate(() => pythonBlocklyEditorProbe.state().source)).toBe(edited)
  await page.evaluate(() => pythonBlocklyEditorProbe.undo())
  await expect
    .poll(() => page.evaluate(() => pythonBlocklyEditorProbe.state().source))
    .toBe('x = (1) # x\ny = 2 # y\n')
  await page.evaluate(() => pythonBlocklyEditorProbe.redo())
  await expect.poll(() => page.evaluate(() => pythonBlocklyEditorProbe.state().source)).toBe(edited)
  await page.evaluate(() => pythonBlocklyEditorProbe.remount())
  await expect(page.locator('.blocklyTextInputField').filter({ hasText: /^10$/ })).toBeVisible()
  expect(await page.evaluate(() => pythonBlocklyEditorProbe.state().source)).toBe(edited)
  expect(await page.evaluate(() => pythonBlocklyEditorProbe.state().pending)).toBe(false)
})

test('a pending file cannot be overwritten and discarding it preserves another file layout', async ({
  page,
}) => {
  await page.evaluate(() => pythonBlocklyEditorProbe.arrange(72, 96, 'principal'))
  await expect.poll(() => page.evaluate(() => pythonBlocklyEditorProbe.state().pending)).toBe(false)
  await page.evaluate(() => pythonBlocklyEditorProbe.selectFile('layout_helper.py'))
  await expect(page.locator('.blocklyTextInputField').filter({ hasText: /^8$/ })).toBeVisible()
  await page.evaluate(() => pythonBlocklyEditorProbe.number('8a'))
  await expect(page.getByRole('status')).toContainText('número inteiro')
  await page.evaluate(() => pythonBlocklyEditorProbe.selectFile('main.py'))
  await expect(page.locator('.blocklyTextInputField').filter({ hasText: /^3$/ })).toBeVisible()
  await page.evaluate(() => pythonBlocklyEditorProbe.number('9'))
  await expect(page.getByRole('status')).toContainText('layout_helper.py')
  expect(await page.evaluate(() => pythonBlocklyEditorProbe.state().source)).toBe(
    '# placar\nx = 3\nprint(x)\n',
  )
  await page.evaluate(() => pythonBlocklyEditorProbe.selectFile('layout_helper.py'))
  await page.getByRole('button', { name: 'Descartar rascunho e abrir o código salvo' }).click()
  await expect.poll(() => page.evaluate(() => pythonBlocklyEditorProbe.state().pending)).toBe(false)
  await page.evaluate(() => pythonBlocklyEditorProbe.selectFile('main.py'))
  await expect
    .poll(() => page.evaluate(() => pythonBlocklyEditorProbe.arrangement()))
    .toEqual({ x: 72, y: 96, note: 'principal' })
})

test('an emptied function body emits official pass and its cache survives Undo, Redo and remount', async ({
  page,
}) => {
  await page.evaluate(() =>
    pythonBlocklyEditorProbe.source('def f():\n    x = 1 # anotação\nf()\n'),
  )
  await expect(page.locator('.blocklyTextInputField').filter({ hasText: /^1$/ })).toBeVisible()
  await page.evaluate(() => pythonBlocklyEditorProbe.emptyFunctionBody())
  const empty = 'def f():\n    # anotação\n    pass\nf()\n'
  await expect.poll(() => page.evaluate(() => pythonBlocklyEditorProbe.state().source)).toBe(empty)
  await expect.poll(() => page.evaluate(() => pythonBlocklyEditorProbe.state().pending)).toBe(false)
  await page.evaluate(() => pythonBlocklyEditorProbe.undo())
  await expect
    .poll(() => page.evaluate(() => pythonBlocklyEditorProbe.state().source))
    .toBe('def f():\n    # anotação\n    x = 1\nf()\n')
  await page.evaluate(() => pythonBlocklyEditorProbe.redo())
  await expect.poll(() => page.evaluate(() => pythonBlocklyEditorProbe.state().source)).toBe(empty)
  await page.evaluate(() => pythonBlocklyEditorProbe.remount())
  await expect(page.getByRole('region', { name: 'Editor de blocos Python' })).not.toHaveAttribute(
    'inert',
  )
  await expect
    .poll(() => page.evaluate(() => pythonBlocklyEditorProbe.state().count))
    .toBeGreaterThan(0)
  expect(await page.evaluate(() => pythonBlocklyEditorProbe.state().source)).toBe(empty)
  expect(await page.evaluate(() => pythonBlocklyEditorProbe.state().pending)).toBe(false)
})

test('an optional branch and its header can be removed, undone and restored from the saved cache', async ({
  page,
}, testInfo) => {
  await page.evaluate(() =>
    pythonBlocklyEditorProbe.source(
      'if True:\n    print(1)\nelse: # alternativa\n    print(2) # opção\n',
    ),
  )
  await expect(page.locator('.blocklyTextInputField').filter({ hasText: /^2$/ })).toBeVisible()
  await page.evaluate(() => pythonBlocklyEditorProbe.emptyFunctionBody('sz_py_if', 'orelse'))
  const empty = 'if True:\n    print(1)\n# alternativa\n# opção\n'
  await expect.poll(() => page.evaluate(() => pythonBlocklyEditorProbe.state().source)).toBe(empty)
  await expect.poll(() => page.evaluate(() => pythonBlocklyEditorProbe.state().pending)).toBe(false)
  await page.evaluate(() => pythonBlocklyEditorProbe.undo())
  await expect
    .poll(() => page.evaluate(() => pythonBlocklyEditorProbe.state().source))
    .toBe('if True:\n    print(1)\nelse:\n    print(2)\n# alternativa\n# opção\n')
  await page.evaluate(() => pythonBlocklyEditorProbe.redo())
  try {
    await expect
      .poll(() => page.evaluate(() => pythonBlocklyEditorProbe.state().source))
      .toBe(empty)
  } finally {
    await testInfo.attach('branch-history', {
      body: JSON.stringify(
        await page.evaluate(() => ({
          state: pythonBlocklyEditorProbe.state(),
          history: pythonBlocklyEditorProbe.history(),
          status: document.querySelector('[role="status"]')?.textContent,
        })),
      ),
      contentType: 'application/json',
    })
  }
  await page.evaluate(() => pythonBlocklyEditorProbe.remount())
  await expect(page.getByRole('region', { name: 'Editor de blocos Python' })).not.toHaveAttribute(
    'inert',
  )
  await expect
    .poll(() => page.evaluate(() => pythonBlocklyEditorProbe.state().count))
    .toBeGreaterThan(0)
  expect(await page.evaluate(() => pythonBlocklyEditorProbe.state().source)).toBe(empty)
  expect(await page.evaluate(() => pythonBlocklyEditorProbe.state().pending)).toBe(false)
})

test('moving a command between functions preserves its annotation through Undo, Redo and remount', async ({
  page,
}) => {
  const original = 'def a():\n    x=1 # mover\ndef b():\n    y = 2 # ficar\n'
  await page.evaluate((source) => pythonBlocklyEditorProbe.source(source), original)
  await expect(page.locator('.blocklyTextInputField').filter({ hasText: /^2$/ })).toBeVisible()
  await page.evaluate(() => pythonBlocklyEditorProbe.transferFunctionCommand())
  const moved = 'def a():\n    pass\ndef b():\n    y = 2 # ficar\n    x=1 # mover\n'
  await expect.poll(() => page.evaluate(() => pythonBlocklyEditorProbe.state().source)).toBe(moved)
  await expect.poll(() => page.evaluate(() => pythonBlocklyEditorProbe.state().pending)).toBe(false)
  await page.evaluate(() => pythonBlocklyEditorProbe.undo())
  await expect
    .poll(() => page.evaluate(() => pythonBlocklyEditorProbe.state().source))
    .toBe(original)
  await page.evaluate(() => pythonBlocklyEditorProbe.redo())
  await expect.poll(() => page.evaluate(() => pythonBlocklyEditorProbe.state().source)).toBe(moved)
  await page.evaluate(() => pythonBlocklyEditorProbe.remount())
  await expect(page.getByRole('region', { name: 'Editor de blocos Python' })).not.toHaveAttribute(
    'inert',
  )
  await expect
    .poll(() => page.evaluate(() => pythonBlocklyEditorProbe.state().count))
    .toBeGreaterThan(0)
  expect(await page.evaluate(() => pythonBlocklyEditorProbe.state().source)).toBe(moved)
  expect(await page.evaluate(() => pythonBlocklyEditorProbe.state().pending)).toBe(false)
})

test('pending persistence hydration cannot open an editable source-derived workspace', async ({
  page,
}) => {
  await page.evaluate(() => {
    pythonBlocklyEditorProbe.incomplete()
    pythonBlocklyEditorProbe.setHydrating(true)
    pythonBlocklyEditorProbe.remount()
  })
  await expect(page.getByRole('status')).toContainText('Recuperando os blocos salvos')
  await expect(page.getByRole('region', { name: 'Editor de blocos Python' })).toHaveAttribute(
    'inert',
  )
  expect(await page.evaluate(() => pythonBlocklyEditorProbe.state().count)).toBe(0)
  await page.evaluate(() => pythonBlocklyEditorProbe.failHydration())
  await expect(page.getByRole('alert')).toContainText('recuperar os blocos salvos')
  await expect(page.getByRole('region', { name: 'Editor de blocos Python' })).toHaveAttribute(
    'inert',
  )
  expect(await page.evaluate(() => pythonBlocklyEditorProbe.state().count)).toBe(0)
  await page.evaluate(() => pythonBlocklyEditorProbe.setHydrating(false))
  await expect(page.getByRole('button', { name: 'Restaurar alterações dos blocos' })).toBeVisible()
  expect(await page.evaluate(() => pythonBlocklyEditorProbe.state().pending)).toBe(true)
})

test('source selection survives parser startup and debounce without applying stale positions', async ({
  page,
}) => {
  await page.evaluate(() => {
    pythonBlocklyEditorProbe.selectSource(pythonBlocklyEditorProbe.state().source.indexOf('3'))
    pythonBlocklyEditorProbe.remount()
  })
  await expect(page.locator('.blocklyHighlighted')).toContainText('número inteiro')
  await page.evaluate(() => {
    pythonBlocklyEditorProbe.source('x = 19\n')
    pythonBlocklyEditorProbe.selectSource(4)
  })
  await expect(page.locator('.blocklyHighlighted')).toContainText('19')
  await page.evaluate(() => pythonBlocklyEditorProbe.source('x = 25\n'))
  await expect(page.locator('.blocklyTextInputField').filter({ hasText: /^25$/ })).toBeVisible()
  await expect(page.locator('.blocklyHighlighted')).toHaveCount(0)
})
