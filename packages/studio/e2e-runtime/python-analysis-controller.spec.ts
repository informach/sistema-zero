import { expect, test } from '@playwright/test'
import type {} from './fixtures/analysisController'

test.beforeEach(async ({ page }) => {
  await page.goto('/analysis')
  await page.waitForFunction(() => !!globalThis.pythonAnalysisControllerProbe)
})
test.afterEach(async ({ page }) => {
  await page.evaluate(() => pythonAnalysisControllerProbe.dispose())
})

test('a real Blockly gesture stages before CPython generation and commits a comment-preserving edit', async ({
  page,
}) => {
  const result = await page.evaluate(() => pythonAnalysisControllerProbe.visualGesture())
  expect(result.synchronous).toEqual({
    pending: true,
    source: '# título 🐢\r\nx = 3  # placar\r\nprint(x)\r\n',
  })
  expect(result.source).toBe('# título 🐢\r\nx = (4)  # placar\r\nprint(x)\r\n')
  expect(result.source).toBe(result.parsed)
  expect(result.draft).toBeNull()
  expect(result.retainedWorkspace).toMatchObject({
    blocks: { blocks: [expect.objectContaining({ x: 48, y: 72 })] },
    workspaceComments: [expect.objectContaining({ id: 'my-note', text: 'Ideia do meu jogo 🐢' })],
  })
})

test('successive edits and structural undo/redo preserve comments without nesting parentheses', async ({
  page,
}) => {
  const result = await page.evaluate(() => pythonAnalysisControllerProbe.visualGesture(true))
  expect(result.history).toHaveLength(7)
  for (const source of result.history) {
    expect(source).toContain('# título 🐢\r\n')
    expect(source).toContain('  # placar\r\n')
    expect(source).not.toContain('((')
  }
  expect(result.history.slice(0, 4).map((source) => /x = \((\d+)\)/.exec(source)?.[1])).toEqual([
    '4000',
    '5',
    '4000',
    '5',
  ])
  expect(result.history[4]).toContain('print(x, 900)')
  expect(result.history[5]).toContain('print(x)')
  expect(result.history[6]).toContain('print(x, 900)')
  expect(result.source).toBe(result.parsed)
  expect(result.draft).toBeNull()
})

test('incomplete blocks recover against a fresh CPython parse after earlier edits and undo', async ({
  page,
}) => {
  const result = await page.evaluate(() => pythonAnalysisControllerProbe.visualGesture(true, true))
  expect(result.recovery).toMatchObject({
    pending: true,
    error: 'Preencha todas as entradas do bloco Python.',
  })
  expect(result.recovery?.source).toContain('print(x, 900)')
  expect(result.recovery?.restoredSource).toContain('print(x, 900, 42)')
  expect(result.source).toContain('# título 🐢\r\nx = (5)  # placar\r\n')
  expect(result.draft).toBeNull()
  expect(result.source).toBe(result.parsed)
})

test('real analysis controller groups rapid typing and reuses one interpreter for parse/render/parse', async ({
  page,
}) => {
  await page.evaluate(() => {
    pythonAnalysisControllerProbe.start('old', 'old = 1')
    pythonAnalysisControllerProbe.start('middle', 'middle = 2')
    pythonAnalysisControllerProbe.start('latest', 'print("🐢 final")')
  })
  await page.waitForFunction(() => !!pythonAnalysisControllerProbe.state().results.latest)
  const state = await page.evaluate(() => pythonAnalysisControllerProbe.state())
  expect(state.results.old).toBe('AbortError')
  expect(state.results.middle).toBe('AbortError')
  expect(state.results.latest).toMatchObject({
    source: 'print("🐢 final")',
    diagnostics: [],
    tree: { kind: 'Module' },
  })
  expect(state.requests).toEqual(['print("🐢 final")'])
  const roundtrip = await page.evaluate(() =>
    pythonAnalysisControllerProbe.roundtrip('x = [n * 2 for n in range(4)]\nprint(x)\n'),
  )
  expect(roundtrip.diagnostics).toEqual([])
  expect(roundtrip.tree?.kind).toBe('Module')
  expect(await page.evaluate(() => pythonAnalysisControllerProbe.state().mounts)).toBe(1)
  await expect(page.locator('iframe[data-python-analysis]')).toHaveCount(1)
})

test('writer handoff removes the analysis frame and a new project receives a fresh parser', async ({
  page,
}) => {
  await page.evaluate(() => pythonAnalysisControllerProbe.roundtrip('print(1)'))
  await page.evaluate(() => pythonAnalysisControllerProbe.handoff())
  await expect(page.locator('iframe[data-python-analysis]')).toHaveCount(0)
  await page.evaluate(() => pythonAnalysisControllerProbe.changeProject())
  const next = await page.evaluate(() =>
    pythonAnalysisControllerProbe.roundtrip('print("outro projeto")'),
  )
  expect(next.identity.projectId).toBe('other-python-project')
  expect(next.diagnostics).toEqual([])
  expect(
    await page.evaluate(() => {
      const { mounts, releases } = pythonAnalysisControllerProbe.state()
      return { mounts, releases }
    }),
  ).toEqual({ mounts: 2, releases: 1 })
  await page.evaluate(() => pythonAnalysisControllerProbe.dispose())
  await expect(page.locator('iframe[data-python-analysis]')).toHaveCount(0)
})
