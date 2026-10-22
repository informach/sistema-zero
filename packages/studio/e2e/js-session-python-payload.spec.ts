import { gzipSync } from 'node:zlib'
import { expect, type Page, test } from '@playwright/test'

// F0 of the performance contract (docs/plans/2026-10-16-estudio-python-desempenho.md): a
// JavaScript-only session downloads 0 bytes of Python executors, editors or analysers, and at
// most 5 KiB gzip of shared Python descriptors.
const PYTHON_EXECUTION_OR_EDITING =
  /pyodide|ruff_wasm|PythonClassicMode|PythonCodeMode|PythonSourceEditor|PythonEditorPreview|PythonExtensionsPanel|python-language|pythonWeb|turtle|_sz_turtle|pyright|analysis-(frame|worker)/i
const PYTHON_NAMED = /python/i

async function recordScripts(page: Page) {
  const loaded: { url: string; gzip: number }[] = []
  page.on('response', async (response) => {
    const url = response.url()
    if (!/\.(m?js|wasm)(\?|$)/.test(url)) return
    try {
      loaded.push({ url, gzip: gzipSync(await response.body()).length })
    } catch {
      loaded.push({ url, gzip: 0 })
    }
  })
  return loaded
}

async function openNewProject(page: Page, pro: boolean) {
  await page.goto('/')
  await page.getByRole('button', { name: '+ Novo projeto' }).first().click()
  if (pro) await page.getByText('Pro (código)', { exact: true }).click()
  await page.getByRole('button', { name: 'Criar e abrir' }).click()
  await expect(page).toHaveURL(/\/editor\//)
  // The Pro preview keeps downloading the WebContainer; the editor is the settled UI here.
  if (pro) await page.getByRole('button', { name: 'Ocultar pré-visualização' }).click()
  await expect(page.locator(pro ? '.monaco-editor' : '.blocklySvg').first()).toBeVisible({
    timeout: 30_000,
  })
}

for (const pro of [false, true]) {
  test(`JS ${pro ? 'Pro' : 'classic'} session loads no Python runtime and almost no Python bytes`, async ({
    page,
  }, info) => {
    const loaded = await recordScripts(page)
    await openNewProject(page, pro)
    await page.waitForTimeout(2000)
    const forbidden = loaded.filter((item) => PYTHON_EXECUTION_OR_EDITING.test(item.url))
    const descriptors = loaded.filter(
      (item) => PYTHON_NAMED.test(item.url) && !PYTHON_EXECUTION_OR_EDITING.test(item.url),
    )
    const descriptorGzip = descriptors.reduce((sum, item) => sum + item.gzip, 0)
    await info.attach('js-session-python-payload', {
      body: JSON.stringify(
        {
          scripts: loaded.length,
          forbidden: forbidden.map((item) => item.url),
          descriptors: descriptors.map((item) => ({
            path: new URL(item.url).pathname,
            gzip: item.gzip,
          })),
          descriptorGzip,
        },
        null,
        2,
      ),
      contentType: 'application/json',
    })
    expect(forbidden.map((item) => new URL(item.url).pathname)).toEqual([])
    expect(descriptorGzip).toBeLessThanOrEqual(5 * 1024)
  })
}
