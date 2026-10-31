import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { instrumentCheckScript } from '../../../packages/studio/src/check/instrumentCheckScript'
import { gameTwoDRuntime } from '../../../packages/studio/src/official-extensions/game-2d/runtime'
import { buildPreviewDoc } from '../../../packages/studio/src/preview/bootstrap'
import { projetoDoQuadroVila, type QuadroInicialDaVila } from './quadros-iniciais'

if (!process.env.SZ_CHECK_CHROMIUM)
  throw Error('Defina SZ_CHECK_CHROMIUM para a conferência local.')
const studio = fileURLToPath(new URL('../../../packages/studio/', import.meta.url))
const driver = Bun.resolveSync(
  'playwright-core',
  dirname(Bun.resolveSync('@playwright/test', studio)),
)
const out =
  process.env.ARQUIPELAGO_PRINTS ??
  fileURLToPath(new URL('../../qa/2026-10-29-quadros-vila/r1/', import.meta.url))
const dir = await mkdtemp(join(tmpdir(), 'sz-vila-visual-'))
const base = resolve(tmpdir()) + sep
if (!resolve(dir).startsWith(base)) throw Error('Diretório de ensaio inválido')
try {
  for (const quadro of [1, 2, 3, 4, 5] as QuadroInicialDaVila[]) {
    const p = projetoDoQuadroVila(quadro, true)
    await writeFile(
      join(dir, `${quadro}.html`),
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
    ['node', fileURLToPath(new URL('./conferir-quadros-browser.mjs', import.meta.url)), dir, out],
    {
      env: { ...process.env, SZ_PLAYWRIGHT_URL: pathToFileURL(driver).href },
      stdout: 'inherit',
      stderr: 'inherit',
      windowsHide: true,
    },
  )
  const deadline = setTimeout(() => child.kill(), 180000)
  try {
    const code = await child.exited
    if (code !== 0) throw Error(`Conferência visual falhou: ${code}`)
  } finally {
    clearTimeout(deadline)
    if (child.exitCode === null) child.kill()
  }
} finally {
  if (resolve(dir).startsWith(base) && dir.includes('sz-vila-visual-'))
    await rm(dir, { recursive: true, force: true })
}
