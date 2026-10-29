import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { instrumentCheckScript } from '../../../packages/studio/src/check/instrumentCheckScript'
import { gameTwoDRuntime } from '../../../packages/studio/src/official-extensions/game-2d/runtime'
import { buildPreviewDoc } from '../../../packages/studio/src/preview/bootstrap'
import { montarProjeto } from './projetos'

const executablePath = process.env.SZ_CHECK_CHROMIUM
if (!executablePath) throw Error('Defina SZ_CHECK_CHROMIUM para conferir a prévia local.')
const studio = fileURLToPath(new URL('../../../packages/studio/', import.meta.url))
const driver = Bun.resolveSync(
  'playwright-core',
  dirname(Bun.resolveSync('@playwright/test', studio)),
)
const out = fileURLToPath(new URL('../../qa/', import.meta.url))
const scope = '__sz0123456789abcdef01234567'
const project = montarProjeto('jardim', true)
const html = buildPreviewDoc({
  html: project.files['index.html'],
  css: project.files['style.css'],
  js: instrumentCheckScript(project.files['script.js'], scope),
  extensionScripts: [gameTwoDRuntime],
  runtimeInspection: true,
  assets: Object.fromEntries((project.assets ?? []).map((a) => [a.name, a.dataUrl!])),
})
const base = resolve(tmpdir()) + sep
const dir = await mkdtemp(join(tmpdir(), 'sz-nuvens-visual-'))
if (!resolve(dir).startsWith(base)) throw Error('Diretório de ensaio inválido')
try {
  const game = join(dir, 'game.html')
  await writeFile(game, html)
  const child = Bun.spawn(
    ['node', fileURLToPath(new URL('./conferir-browser.mjs', import.meta.url)), game, out],
    {
      env: { ...process.env, SZ_PLAYWRIGHT_URL: pathToFileURL(driver).href },
      stdout: 'inherit',
      stderr: 'inherit',
      windowsHide: true,
    },
  )
  const code = await child.exited
  if (code !== 0) throw Error(`Conferência visual falhou: ${code}`)
} finally {
  if (resolve(dir).startsWith(base) && dir.includes('sz-nuvens-visual-'))
    await rm(dir, { recursive: true, force: true })
}
