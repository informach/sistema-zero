import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { instrumentCheckScript } from '../../../packages/studio/src/check/instrumentCheckScript'
import { gameTwoDRuntime } from '../../../packages/studio/src/official-extensions/game-2d/runtime'
import { buildPreviewDoc } from '../../../packages/studio/src/preview/bootstrap'
import { montarProjeto, VARIACOES } from './projetos'

if (!process.env.SZ_CHECK_CHROMIUM) throw Error('Defina SZ_CHECK_CHROMIUM para a prova local.')
const studio = fileURLToPath(new URL('../../../packages/studio/', import.meta.url))
const driver = Bun.resolveSync(
  'playwright-core',
  dirname(Bun.resolveSync('@playwright/test', studio)),
)
const out =
  process.env.ARQUIPELAGO_PRINTS ??
  fileURLToPath(new URL('../../qa/2026-10-30-vila-repertorio/', import.meta.url))
const dir = await mkdtemp(join(tmpdir(), 'sz-vila-corrida-'))
const base = resolve(tmpdir()) + sep
if (!resolve(dir).startsWith(base)) throw Error('Diretório de ensaio inválido')
try {
  for (const variacao of VARIACOES) {
    const p = montarProjeto(variacao, true)
    await writeFile(
      join(dir, `${variacao}.html`),
      buildPreviewDoc({
        html: p.files['index.html'],
        css: p.files['style.css'],
        js: instrumentCheckScript(p.files['script.js'], '__sz0123456789abcdef01234567'),
        extensionScripts: [gameTwoDRuntime],
        runtimeInspection: true,
        assets: Object.fromEntries((p.assets ?? []).map((a) => [a.name, a.dataUrl!])),
      }),
    )
  }
  const child = Bun.spawn(
    ['node', fileURLToPath(new URL('./conferir-corrida-browser.mjs', import.meta.url)), dir, out],
    {
      env: { ...process.env, SZ_PLAYWRIGHT_URL: pathToFileURL(driver).href },
      stdout: 'inherit',
      stderr: 'inherit',
      windowsHide: true,
    },
  )
  const deadline = setTimeout(() => child.kill(), 180000)
  try {
    if ((await child.exited) !== 0) throw Error('Conferência da corrida falhou.')
  } finally {
    clearTimeout(deadline)
    if (child.exitCode === null) child.kill()
  }
} finally {
  if (resolve(dir).startsWith(base) && dir.includes('sz-vila-corrida-'))
    await rm(dir, { recursive: true, force: true })
}
