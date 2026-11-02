import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { Glob } from 'bun'
import {
  linguagemDoProjeto,
  ManifestoDeDesafiosSchema,
} from '../../../packages/arquipelago-contracts/src/desafios'
import { renderProjectToPreviewDocAsync } from '../../../packages/studio/src/preview/renderProject'
import { slugBase } from './index'

/**
 * Tira o print "Como fica" de cada quadro do Quadro das Cores (retorno de quem testou,
 * 01/11/2026): roda o GABARITO no Chromium, espera o jogo desenhar e grava uma miniatura WebP em
 * `imagens/<slug>.webp`. Depois rode os geradores de manifesto de novo: `comApresentacao` embute
 * o arquivo no conteúdo. Python e Pro ficam sem print (precisam do ambiente e do compilador).
 *
 *   SZ_CHECK_CHROMIUM=/caminho/do/chrome bun docs/desafios-do-jogo/apresentacao/imagens.ts [slug...]
 */
if (!process.env.SZ_CHECK_CHROMIUM) throw Error('Defina SZ_CHECK_CHROMIUM para tirar os prints.')
const raiz = fileURLToPath(new URL('../', import.meta.url))
const studio = fileURLToPath(new URL('../../../packages/studio/', import.meta.url))
const driver = Bun.resolveSync(
  'playwright-core',
  dirname(Bun.resolveSync('@playwright/test', studio)),
)
const pedidos = new Set(process.argv.slice(2))

const quadros = new Map<string, unknown>()
for await (const arquivo of new Glob('*/*.manifesto.json').scan(raiz)) {
  if (arquivo.includes('-adulto.')) continue
  const manifesto = ManifestoDeDesafiosSchema.parse(await Bun.file(join(raiz, arquivo)).json())
  for (const d of manifesto.desafios) {
    if (d.tipo !== 'quadro-das-cores') continue
    const lingua = linguagemDoProjeto(d.conteudo.gabarito)
    if (lingua === 'python' || lingua === 'pro') continue
    const slug = slugBase(d.slug)
    if (pedidos.size > 0 && !pedidos.has(slug)) continue
    quadros.set(slug, d.conteudo.gabarito)
  }
}

const dir = await mkdtemp(join(tmpdir(), 'sz-como-fica-'))
const base = resolve(tmpdir()) + sep
if (!resolve(dir).startsWith(base)) throw Error('Diretório de ensaio inválido')
try {
  for (const [slug, gabarito] of quadros)
    await writeFile(
      join(dir, `${slug}.html`),
      await renderProjectToPreviewDocAsync(gabarito as never, { securityProfile: 'creative' }),
    )
  const child = Bun.spawn(
    [
      'node',
      fileURLToPath(new URL('./imagens-browser.mjs', import.meta.url)),
      dir,
      fileURLToPath(new URL('./imagens/', import.meta.url)),
    ],
    {
      env: { ...process.env, SZ_PLAYWRIGHT_URL: pathToFileURL(driver).href },
      stdout: 'inherit',
      stderr: 'inherit',
    },
  )
  const prazo = setTimeout(() => child.kill(), 600_000)
  try {
    if ((await child.exited) !== 0) throw Error('Os prints falharam.')
  } finally {
    clearTimeout(prazo)
  }
} finally {
  if (resolve(dir).startsWith(base) && dir.includes('sz-como-fica-'))
    await rm(dir, { recursive: true, force: true })
}
