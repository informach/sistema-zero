import { expect, test } from '@playwright/test'
import type {} from '../../../experiments/studio-python-runtime/analysisHost'

test('rendered Python blocks expose Portuguese controls and preserve the connected child through undo', async ({
  page,
}, testInfo) => {
  await page.evaluate(() => globalThis.analysisProbe.showBlocks())
  await expect(page.locator('#python-blocks-proof svg.blocklySvg')).toBeVisible()
  await page.getByText('mostrar', { exact: true }).click({ button: 'right' })
  await page.getByText('Adicionar valor', { exact: true }).click()
  await expect
    .poll(() => page.evaluate(() => globalThis.analysisProbe.blockState()))
    .toEqual({ count: 2, original: 'Olá, turma!', connections: 2, blocks: 3 })
  await page.screenshot({ path: testInfo.outputPath('python-blocks.png') })
  await page.evaluate(() => globalThis.analysisProbe.undoBlocks())
  await expect.poll(() => page.evaluate(() => globalThis.analysisProbe.blockState().count)).toBe(1)
  await page.evaluate(() => globalThis.analysisProbe.undoBlocks(true))
  await expect.poll(() => page.evaluate(() => globalThis.analysisProbe.blockState().count)).toBe(2)
})

test.beforeEach(async ({ page }) => {
  await page.goto('/analysis')
  await page.waitForFunction(() => !!globalThis.analysisProbe)
  await page.evaluate(() => globalThis.analysisProbe.start())
})
test('Turtle blocks preserve official aliases, callbacks and receiver ownership through CPython and Blockly', async ({
  page,
}, testInfo) => {
  const results = await page.evaluate(() => globalThis.analysisProbe.turtleBlocks())
  expect(results).toHaveLength(6)
  for (const result of results) {
    for (const expected of result.expected) expect(result.types, result.id).toContain(expected)
    for (const excluded of result.excluded) expect(result.types, result.id).not.toContain(excluded)
  }
  await testInfo.attach('turtle-blocks', {
    body: JSON.stringify(results),
    contentType: 'application/json',
  })
})
test.afterEach(async ({ page }) => {
  await page.evaluate(() => globalThis.analysisProbe?.dispose())
})

test('real CPython syntax worker roundtrips Unicode, imports, classes and opaque syntax without running it', async ({
  page,
}) => {
  const source =
    '# intacto\r\nimport turtle as t\r\nnome = "🐢 ação"\r\nclass Jogo:\r\n    def __init__(self):\r\n        self.valores = [x*x for x in range(3)]\r\nwhile True: pass\r\n'
  const parsed = await page.evaluate((source) => globalThis.analysisProbe.parse(source), source)
  expect(parsed.source).toBe(source)
  expect(parsed.tree?.kind).toBe('Module')
  expect(parsed.diagnostics).toEqual([])
  expect(
    parsed.tokens.some((token) => token.kind === 'COMMENT' && token.text === '# intacto'),
  ).toBe(true)
  const string = parsed.tokens.find((token) => token.kind === 'STRING')!
  expect(source.slice(string.range.start, string.range.end)).toBe('"🐢 ação"')
  for (const token of parsed.tokens) {
    expect(source.slice(token.range.start, token.range.end)).toBe(token.text)
    for (const offset of [token.range.start, token.range.end])
      expect(source.slice(Math.max(0, offset - 1), offset + 1)).not.toBe('\r\n')
  }
  const generated = await page.evaluate(() => globalThis.analysisProbe.render())
  expect(generated).toContain('import turtle as t')
  expect(generated).toContain('self.valores = [x * x for x in range(3)]')
  const roundtrip = await page.evaluate(
    (source) => globalThis.analysisProbe.parse(source),
    generated,
  )
  expect(roundtrip.diagnostics).toEqual([])
})
test('syntax failure preserves source and session; following revision still parses', async ({
  page,
}) => {
  const source = 'print("🐢"); x ='
  const invalid = await page.evaluate((source) => globalThis.analysisProbe.parse(source), source)
  expect(invalid.source).toBe(source)
  expect(invalid.tree).toBeNull()
  expect(invalid.diagnostics).toHaveLength(1)
  const valid = await page.evaluate(() => globalThis.analysisProbe.parse('x = 42\n'))
  expect(valid.tree?.kind).toBe('Module')
  expect(valid.identity.generation).toBe(invalid.identity.generation + 1)
})

test('Python source roundtrips through real Blockly, saved connections and CPython generation', async ({
  page,
}, testInfo) => {
  // `global` and `nonlocal` redirect only the declared name: the replaced print and sqrt stay
  // generic calls (checked in blockFoundation.test.ts) and the rest of the file keeps its blocks.
  const cases = await page.evaluate(() => globalThis.analysisProbe.blocks())
  expect(cases).toHaveLength(21)
  expect(cases.every((item) => item.blocks > 0)).toBe(true)
  expect(
    cases
      .filter((item) => item.opaque > 0)
      .map((item) => item.id)
      .sort(),
  ).toEqual(['opaque', 'shadow_match', 'shadow_walrus', 'starred'])
  await testInfo.attach('blockly-python-roundtrip', {
    body: JSON.stringify(cases),
    contentType: 'application/json',
  })
})
test('cancel revokes the analysis generation and a fresh session recovers', async ({ page }) => {
  const outcome = await page.evaluate(async () => {
    const result = globalThis.analysisProbe.parse('x=1\n'.repeat(10000)).then(
      () => 'unexpected success',
      (error: Error) => error.name,
    )
    globalThis.analysisProbe.cancel()
    return result
  })
  expect(outcome).toBe('AbortError')
  await page.evaluate(() => globalThis.analysisProbe.start())
  const fresh = await page.evaluate(() => globalThis.analysisProbe.parse('print("recuperado")'))
  expect(fresh.diagnostics).toEqual([])
})

test('visual edits preserve comments, CRLF and precedence and reject stale source', async ({
  page,
}, testInfo) => {
  const result = await page.evaluate(() => globalThis.analysisProbe.editBlocks())
  expect(
    result.unchangedByteExact &&
      result.staleCommit &&
      result.commentsProtected &&
      result.changedDuringRender &&
      result.invalidSourcePreserved,
  ).toBe(true)
  await testInfo.attach('verified-source-edits', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  })
})
test('oversized structures are diagnosed without silently discarding source', async ({ page }) => {
  const outcome = await page.evaluate(() =>
    globalThis.analysisProbe.parse('x=1\n'.repeat(20000)).then(
      () => 'unexpected success',
      (error: Error) => error.message,
    ),
  )
  expect(outcome).toContain('limite')
  const fresh = await page.evaluate(() => globalThis.analysisProbe.parse('x=1'))
  expect(fresh.source).toBe('x=1')
})

test('a long line with thousands of nodes stays within the existing analysis deadline', async ({
  page,
}, testInfo) => {
  const source = `x = ["${'a'.repeat(220_000)}",${Array(9000).fill('1').join(',')}]\n`
  const result = await page.evaluate(async (source) => {
    const start = performance.now()
    const parsed = await globalThis.analysisProbe.parse(source)
    return {
      elapsedMs: performance.now() - start,
      ok: !!parsed.tree && !parsed.diagnostics.length,
      sourcePreserved: parsed.source === source,
      tokens: parsed.tokens.length,
    }
  }, source)
  expect(result.ok).toBe(true)
  expect(result.sourcePreserved).toBe(true)
  expect(result.tokens).toBe(18_007)
  expect(result.elapsedMs).toBeLessThan(3000)
  await testInfo.attach('long-line-analysis', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  })
})

test('the complete pinned games remain preserved as Python source, including syntax outside visual blocks', async ({
  page,
}, testInfo) => {
  const result = await page.evaluate(() => globalThis.analysisProbe.corpus())
  expect(result).toHaveLength(24)
  expect(result.some((file) => file.fixture === 'spaceArenaOriginal' && file.tokens > 5000)).toBe(
    true,
  )
  await testInfo.attach('corpus-analysis', {
    body: JSON.stringify({
      samples: result,
      scope: 'one diagnostic sample per file, no editor latency qualification',
    }),
    contentType: 'application/json',
  })
})

test('analysis cancellation and disposal release native worker targets across five sessions', async ({
  page,
  browser,
}) => {
  const cdp = await browser.newBrowserCDPSession()
  try {
    for (let cycle = 0; cycle < 5; cycle++) {
      if (cycle) await page.evaluate(() => globalThis.analysisProbe.start())
      expect(
        (await cdp.send('Target.getTargets')).targetInfos.filter(
          (target) => target.type === 'worker',
        ),
      ).toHaveLength(1)
      await page.evaluate(() =>
        globalThis.analysisProbe.parse('class Jogo:\n    def jogar(self):\n        return 42\n'),
      )
      await page.evaluate(() => globalThis.analysisProbe.dispose())
      await expect
        .poll(
          async () =>
            (await cdp.send('Target.getTargets')).targetInfos.filter(
              (target) => target.type === 'worker',
            ).length,
          { timeout: 3000 },
        )
        .toBe(0)
    }
  } finally {
    await cdp.detach()
  }
})
