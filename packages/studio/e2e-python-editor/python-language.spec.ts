import type { Request, Route } from '@playwright/test'
import type {} from './fixtures/bridge'
import { expect, test } from './fixtures/pythonLanguageSessions'

test('Pro symbol rename validates Python names and reviews cross-file changes without rewriting trivia', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await page.goto('/')
  await page.waitForFunction(() => !!globalThis.pythonBridgeProbe)
  await page.evaluate(() => pythonBridgeProbe.create())
  const files = {
    'src/main.py': '# início\r\nfrom helper import valor\nprint(valor)\r\n',
    'src/helper.py': '# valor preservado\nvalor = 42\r\n',
  }
  await page.evaluate((files) => pythonBridgeProbe.openPro(files), files)
  await expect(page.locator('.monaco-editor .view-lines')).toContainText('from helper')
  await page.evaluate(() => pythonBridgeProbe.proCursor(3, 8))
  await page.keyboard.press('F2')
  await page.getByRole('textbox', { name: 'Novo nome do símbolo', exact: true }).fill('for')
  await page.getByRole('button', { name: 'Conferir referências', exact: true }).click()
  await expect(
    page.getByRole('region', { name: 'Código do projeto', exact: true }).getByRole('status'),
  ).toContainText('Escolha um nome Python válido, sem espaços nem palavras reservadas.', {
    timeout: 35_000,
  })
  for (const [path, content] of Object.entries(files))
    expect((await page.evaluate(() => pythonBridgeProbe.proState())).tree?.[path]).toEqual({
      kind: 'file',
      content,
    })
  await page.evaluate(() => pythonBridgeProbe.proCursor(3, 8))
  await page.keyboard.press('F2')
  await page.getByRole('textbox', { name: 'Novo nome do símbolo', exact: true }).fill('pontos')
  await page.getByRole('button', { name: 'Conferir referências', exact: true }).click()
  const review = page.getByRole('dialog', { name: 'Conferir mudança nos arquivos', exact: true })
  await expect(review).toBeVisible()
  await review.getByRole('button', { name: 'Aplicar mudança', exact: true }).click()
  await expect
    .poll(() => page.evaluate(() => pythonBridgeProbe.proState().tree?.['src/main.py']))
    .toEqual({
      kind: 'file',
      content: files['src/main.py'].replaceAll('valor', 'pontos'),
    })
  expect((await page.evaluate(() => pythonBridgeProbe.proState())).tree?.['src/helper.py']).toEqual(
    {
      kind: 'file',
      content: '# valor preservado\npontos = 42\r\n',
    },
  )
  await page.getByRole('button', { name: 'Executar', exact: true }).click()
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          pythonBridgeProbe
            .proState()
            .logs.filter((entry) => entry.kind === 'log')
            .map((entry) => entry.text)
            .join(''),
        ),
      { timeout: 30_000 },
    )
    .toBe('42\n')
  await page.evaluate(() => pythonBridgeProbe.unmount())
})

test('Pro symbol rename refuses a candidate that parses but cannot compile', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => !!globalThis.pythonBridgeProbe)
  await page.evaluate(() => pythonBridgeProbe.create())
  const source = 'def somar(a, b):\n    return a + b\nprint(somar(1, 2))\n'
  await page.evaluate((source) => pythonBridgeProbe.openPro({ 'src/main.py': source }), source)
  await expect(page.locator('.monaco-editor .view-lines')).toContainText('def somar')
  await page.evaluate(() => pythonBridgeProbe.proCursor(1, 14))
  await page.keyboard.press('F2')
  await page.getByRole('textbox', { name: 'Novo nome do símbolo', exact: true }).fill('a')
  await page.getByRole('button', { name: 'Conferir referências', exact: true }).click()
  await expect(
    page.getByRole('region', { name: 'Código do projeto', exact: true }).getByRole('status'),
  ).toContainText('duplicate argument', { timeout: 35_000 })
  expect((await page.evaluate(() => pythonBridgeProbe.proState())).tree?.['src/main.py']).toEqual({
    kind: 'file',
    content: source,
  })
  await expect(
    page.getByRole('dialog', { name: 'Conferir mudança nos arquivos', exact: true }),
  ).toHaveCount(0)
  await page.evaluate(() => pythonBridgeProbe.unmount())
})

test('Pro analysis follows entrypoint moves and ignores same-name modules above its execution root', async ({
  page,
  pythonLanguageSessions,
}) => {
  test.setTimeout(60_000)
  await page.goto('/')
  await page.waitForFunction(() => !!globalThis.pythonBridgeProbe)
  await page.evaluate(() => pythonBridgeProbe.create())
  await page.evaluate(() =>
    pythonBridgeProbe.openPro({
      'src/main.py': 'from helper import valor\nprint(valor)\n',
      'src/helper.py': 'valor = "SRC"\n',
      'helper.py': 'valor = "ROOT"\n',
    }),
  )
  await expect(page.locator('.monaco-editor .view-lines')).toContainText('from helper')
  await page.evaluate(() => pythonBridgeProbe.proCursor(2, 8))
  await page.keyboard.press('F12')
  await expect
    .poll(() => page.evaluate(() => pythonBridgeProbe.proState().source), { timeout: 30_000 })
    .toBe('valor = "SRC"\n')
  const before = await pythonLanguageSessions.openedIdCount()
  await page.getByRole('button', { name: 'Renomear ou mover src', exact: true }).click()
  await page.getByRole('textbox', { name: 'Renomear src', exact: true }).fill('game')
  await page.getByRole('textbox', { name: 'Renomear src', exact: true }).press('Enter')
  const review = page.getByRole('dialog', { name: 'Conferir mudança nos arquivos', exact: true })
  await expect(review).toBeVisible({ timeout: 35_000 })
  await review.getByRole('button', { name: 'Aplicar mudança', exact: true }).click()
  await expect
    .poll(() => page.evaluate(() => pythonBridgeProbe.proState().entrypoint))
    .toBe('game/main.py')
  await page.getByRole('treeitem', { name: 'game/main.py', exact: true }).click()
  await page.evaluate(() => pythonBridgeProbe.proCursor(2, 8))
  await page.keyboard.press('F12')
  await expect
    .poll(() => page.evaluate(() => pythonBridgeProbe.proState().source))
    .toBe('valor = "SRC"\n')
  expect(await pythonLanguageSessions.openedIdCount()).toBe(before)
  expect((await page.evaluate(() => pythonBridgeProbe.proState())).tree?.['helper.py']).toEqual({
    kind: 'file',
    content: 'valor = "ROOT"\n',
  })
  await expect.poll(() => pythonLanguageSessions.aliveIdCount()).toBe(1)
  await page.evaluate(() => pythonBridgeProbe.unmount())
  await expect.poll(() => pythonLanguageSessions.aliveIdCount()).toBe(0)
})

test('Pro file rename reviews real CPython imports, warns on deletion and recovers the operation', async ({
  page,
}) => {
  test.setTimeout(90_000) // Two independent CPython bootstraps plus reviewed history operations.
  await page.goto('/')
  await page.waitForFunction(() => !!globalThis.pythonBridgeProbe)
  await page.evaluate(() => pythonBridgeProbe.create())
  const source = '# preservar\r\nimport helper\nprint(helper.valor)\r\n'
  await page.evaluate(
    (source) =>
      pythonBridgeProbe.openPro({ 'src/main.py': source, 'src/helper.py': 'valor = 42\n' }),
    source,
  )
  await page.getByRole('button', { name: 'Renomear ou mover src/helper.py', exact: true }).click()
  const rename = page.getByRole('textbox', { name: 'Renomear helper.py', exact: true })
  await rename.fill('src/tools.py')
  await rename.press('Enter')
  const review = page.getByRole('dialog', { name: 'Conferir mudança nos arquivos', exact: true })
  await expect(review).toBeVisible({ timeout: 45_000 })
  expect((await page.evaluate(() => pythonBridgeProbe.proState())).tree?.['src/main.py']).toEqual({
    kind: 'file',
    content: source,
  })
  await review.getByRole('button', { name: 'Aplicar mudança', exact: true }).click()
  const changed = source.replace('import helper', 'import tools as helper')
  await expect
    .poll(() => page.evaluate(() => pythonBridgeProbe.proState().tree?.['src/main.py']))
    .toEqual({ kind: 'file', content: changed })
  expect(
    (await page.evaluate(() => pythonBridgeProbe.proState())).tree?.['src/helper.py'],
  ).toBeUndefined()
  await page.getByRole('button', { name: 'Executar', exact: true }).click()
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          pythonBridgeProbe
            .proState()
            .logs.filter((entry) => entry.kind === 'log')
            .map((entry) => entry.text)
            .join(''),
        ),
      { timeout: 30_000 },
    )
    .toBe('42\n')
  await page.getByRole('button', { name: 'Excluir src/tools.py', exact: true }).click()
  await expect(review).toBeVisible()
  await expect(review).toContainText('Referências conhecidas em: src/main.py')
  await review.getByRole('button', { name: 'Voltar ao código', exact: true }).click()
  await page.getByRole('button', { name: 'Comandos…', exact: true }).click()
  await page.getByRole('button', { name: 'Recuperar arquivos e materiais', exact: true }).click()
  const history = page.getByRole('dialog', { name: 'Recuperar arquivos e materiais', exact: true })
  await history.getByRole('button', { name: 'Recuperar', exact: true }).first().click()
  await expect
    .poll(() => page.evaluate(() => pythonBridgeProbe.proState().tree?.['src/main.py']))
    .toEqual({ kind: 'file', content: source })
  expect((await page.evaluate(() => pythonBridgeProbe.proState())).tree?.['src/helper.py']).toEqual(
    { kind: 'file', content: 'valor = 42\n' },
  )
  expect(
    (await page.evaluate(() => pythonBridgeProbe.proState())).tree?.['src/tools.py'],
  ).toBeUndefined()
  await history.getByRole('button', { name: 'Fechar histórico', exact: true }).click()
  await page.getByRole('button', { name: 'Reiniciar', exact: true }).click()
  await expect(page.getByText('Programa concluído', { exact: true })).toBeVisible()
  await page.evaluate(() => pythonBridgeProbe.unmount())
})

test('Pro console runs real Python in the current namespace without changing saved source', async ({
  page,
}) => {
  await page.goto('/')
  await page.waitForFunction(() => !!globalThis.pythonBridgeProbe)
  await page.evaluate(() => pythonBridgeProbe.create())
  const source = 'valor = 40\n'
  await page.evaluate((source) => pythonBridgeProbe.openPro({ 'src/main.py': source }), source)
  await page.getByRole('button', { name: 'Console', exact: true }).click()
  const command = page.getByRole('textbox', { name: 'Comando Python', exact: true })
  const execute = page.getByRole('button', { name: 'Executar comando', exact: true })
  await command.fill('valor + 2')
  await expect(execute).toBeDisabled()
  await page.getByRole('button', { name: 'Executar', exact: true }).click()
  await expect(execute).toBeEnabled({ timeout: 30_000 })
  await execute.click()
  await expect
    .poll(() =>
      page.evaluate(() =>
        pythonBridgeProbe.proState().logs.some((item) => item.kind === 'log' && item.text === '42'),
      ),
    )
    .toBe(true)
  await command.fill('valor = 99\n1 / 0')
  await execute.click()
  await expect
    .poll(() =>
      page.evaluate(() =>
        pythonBridgeProbe
          .proState()
          .logs.some((item) => item.kind === 'error' && item.text.includes('ZeroDivisionError')),
      ),
    )
    .toBe(true)
  await command.fill('valor')
  await execute.click()
  await expect
    .poll(() =>
      page.evaluate(() =>
        pythonBridgeProbe.proState().logs.some((item) => item.kind === 'log' && item.text === '99'),
      ),
    )
    .toBe(true)
  expect(await page.evaluate(() => pythonBridgeProbe.proState().tree?.['src/main.py'])).toEqual({
    kind: 'file',
    content: source,
  })
  await page.getByRole('button', { name: 'Reiniciar', exact: true }).click()
  await command.fill('valor')
  await expect(execute).toBeEnabled({ timeout: 30_000 })
  await execute.click()
  await expect
    .poll(() =>
      page.evaluate(() =>
        pythonBridgeProbe.proState().logs.some((item) => item.kind === 'log' && item.text === '40'),
      ),
    )
    .toBe(true)
  await page.getByRole('button', { name: 'Parar', exact: true }).click()
  await command.fill('valor')
  await expect(execute).toBeDisabled()
  await page.evaluate(() => pythonBridgeProbe.unmount())
})

test('Python Pro uses actual Pyright for diagnostics, Turtle completion and cross-file navigation', async ({
  page,
  pythonLanguageSessions,
}) => {
  await page.goto('/')
  await page.waitForFunction(() => !!globalThis.pythonBridgeProbe)
  await page.evaluate(() => pythonBridgeProbe.create())
  await page.evaluate(() =>
    pythonBridgeProbe.openPro({
      'src/main.py':
        'from helper import somar\nimport turtle\npontos = somar(1, 2)\ntartaruga = turtle.Turtle()\ntartaruga.\n',
      'src/helper.py': 'def somar(a: int, b: int) -> int:\n    return a + b\n',
    }),
  )
  await expect(page.locator('.monaco-editor .view-lines')).toContainText('somar')
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          pythonBridgeProbe.proState().markers.some((item) => item.source === 'Pyright'),
        ),
      { timeout: 30_000 },
    )
    .toBe(true)
  await page.evaluate(() => pythonBridgeProbe.proCursor(5, 11))
  await page.evaluate(() => pythonBridgeProbe.proAction('editor.action.triggerSuggest'))
  await expect(page.locator('.suggest-widget')).toBeVisible()
  // Monaco virtualizes the long Turtle list; narrow it through the same typing gesture as a learner.
  await page.keyboard.type('for')
  await expect(page.locator('.suggest-widget')).toContainText('forward', { timeout: 15_000 })
  await page.keyboard.press('Escape')
  await page.evaluate(() => pythonBridgeProbe.proCursor(3, 12))
  await page.keyboard.press('F12')
  await expect
    .poll(() => page.evaluate(() => pythonBridgeProbe.proState().active))
    .toContain('helper.py')
  await expect(page.locator('.monaco-editor .view-lines')).toContainText('return a + b')
  await page.evaluate(() => pythonBridgeProbe.unmount())
  await expect.poll(() => pythonLanguageSessions.aliveIdCount()).toBe(0)
})

test('Python completion recovers when typing invalidates a pending real Pyright answer', async ({
  page,
  pythonLanguageSessions,
}) => {
  const pattern = '**/api/studio/python-language/**'
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  let firstRequest: Request | undefined
  let firstResponseReady = false
  let firstTransfer: Promise<void> | undefined
  let completionRequests = 0
  const intercept = async (route: Route) => {
    const request = route.request()
    const input = request.method() === 'POST' ? request.postDataJSON() : undefined
    if (input?.command?.kind !== 'query' || input.command.method !== 'completions') {
      await route.continue()
      return
    }
    completionRequests++
    if (firstRequest) {
      await route.continue()
      return
    }
    firstRequest = request
    firstTransfer = (async () => {
      // Keep a real server answer pending at the browser; no completion values are fabricated.
      const response = await route.fetch({ timeout: 5000 })
      firstResponseReady = true
      await gate
      try {
        await route.fulfill({ response })
      } catch (error) {
        // Source invalidation legitimately aborts this obsolete browser request.
        if (!request.failure()) throw error
      }
    })()
    await firstTransfer
  }
  await page.route(pattern, intercept)
  try {
    await page.goto('/')
    await page.waitForFunction(() => !!globalThis.pythonBridgeProbe)
    await page.evaluate(() => pythonBridgeProbe.create())
    await page.evaluate(() =>
      pythonBridgeProbe.openPro({
        'src/main.py': 'import turtle\ntartaruga = turtle.Turtle()\ntartaruga.\n',
      }),
    )
    await expect.poll(() => pythonLanguageSessions.aliveIdCount(), { timeout: 15_000 }).toBe(1)
    await page.evaluate(() => pythonBridgeProbe.proCursor(3, 11))
    await page.evaluate(() => pythonBridgeProbe.proAction('editor.action.triggerSuggest'))
    await expect.poll(() => firstResponseReady, { timeout: 15_000 }).toBe(true)
    await page.keyboard.type('for')
    await expect
      .poll(() => page.evaluate(() => pythonBridgeProbe.proState().source))
      .toContain('tartaruga.for')
    await expect.poll(() => firstRequest?.failure()?.errorText).toContain('ERR_ABORTED')
    release()
    await firstTransfer
    await expect(page.locator('.suggest-widget')).toContainText('forward', { timeout: 15_000 })
    expect(completionRequests).toBeGreaterThanOrEqual(2)
    await page.evaluate(() => pythonBridgeProbe.unmount())
    await expect.poll(() => pythonLanguageSessions.aliveIdCount()).toBe(0)
  } finally {
    release()
    await firstTransfer
    await page.unroute(pattern, intercept)
  }
})

test('Python keeps original mixed line endings while diagnostics and definitions use correct positions', async ({
  page,
}) => {
  await page.goto('/')
  await page.waitForFunction(() => !!globalThis.pythonBridgeProbe)
  await page.evaluate(() => pythonBridgeProbe.create())
  const main = '# início\r\nfrom helper import valor\nprint(valor)\r\nproblema\n'
  const helper = '#a\r\n#b\n#c\nvalor = 1\n'
  await page.evaluate(
    ({ main, helper }) =>
      pythonBridgeProbe.openPro({ 'src/main.py': main, 'src/helper.py': helper }),
    { main, helper },
  )
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          pythonBridgeProbe
            .proState()
            .markers.some(
              (item) => item.path.endsWith('/src/main.py') && item.line === 4 && item.column === 1,
            ),
        ),
      { timeout: 30_000 },
    )
    .toBe(true)
  expect(await page.evaluate(() => pythonBridgeProbe.proState().tree?.['src/main.py'])).toEqual({
    kind: 'file',
    content: main,
  })
  await page.evaluate(() => pythonBridgeProbe.proCursor(3, 8))
  await page.keyboard.press('F12')
  await expect
    .poll(() => page.evaluate(() => pythonBridgeProbe.proState().active))
    .toContain('helper.py')
  expect(await page.evaluate(() => pythonBridgeProbe.proState().position)).toMatchObject({
    lineNumber: 4,
    column: 1,
  })
  expect(await page.evaluate(() => pythonBridgeProbe.proState().tree?.['src/helper.py'])).toEqual({
    kind: 'file',
    content: helper,
  })
  await page.evaluate(() => pythonBridgeProbe.unmount())
})

test('official Ruff formats Python locally with undo and redo preserving comments and strings', async ({
  page,
}) => {
  await page.goto('/')
  await page.waitForFunction(() => !!globalThis.pythonBridgeProbe)
  await page.evaluate(() => pythonBridgeProbe.create())
  const original = '# desenho da criança\ncores=["azul", "verde"]\ndef somar(a,b):\n return a+b\n'
  await page.evaluate((source) => pythonBridgeProbe.openPro({ 'src/main.py': source }), original)
  await expect(page.locator('.monaco-editor .view-lines')).toContainText('somar')
  await page.evaluate(() => pythonBridgeProbe.proAction('editor.action.formatDocument'))
  const formatted =
    '# desenho da criança\ncores = ["azul", "verde"]\n\n\ndef somar(a, b):\n    return a + b\n'
  await expect.poll(() => page.evaluate(() => pythonBridgeProbe.proState().source)).toBe(formatted)
  await page.evaluate(() => pythonBridgeProbe.proCursor(1, 1))
  await page.keyboard.press('Control+z')
  await expect.poll(() => page.evaluate(() => pythonBridgeProbe.proState().source)).toBe(original)
  await page.keyboard.press('Control+y')
  await expect.poll(() => page.evaluate(() => pythonBridgeProbe.proState().source)).toBe(formatted)
  await page.evaluate(() => pythonBridgeProbe.unmount())
})
