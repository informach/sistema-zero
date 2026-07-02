import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { loadRoteiroFile } from './roteiro/parse'
import { gerarVoz } from './steps/02-voz'
import { gerarAvatar } from './steps/03-avatar'
import { escreverPlano } from './steps/07-montagem/plano'
import { aviso, erro, etapa, ok } from './util/log'
import { aulaPaths, CENARIOS_DIR, PACKAGE_ROOT } from './util/paths'

const USO = `
Pipeline de aulas — uso:
  bun run src/cli.ts <comando> <slug-da-aula> [--cenas c1,c2]

Comandos:
  validar  confere se aulas/<slug>/roteiro.yaml está válido
  voz      gera 1 mp3 por cena (ElevenLabs, voz clonada)
  avatar   gera o avatar por cena (HeyGen) — precisa da voz antes
  tela     grava o passo a passo do Estúdio (Playwright) + timeline
  plano    (re)constrói out/montagem.json a partir do que já foi gerado
  render   monta o vídeo final (Remotion)
  all      tela → plano → render (voz/avatar entram quando houver chaves)

Ex.: bun run src/cli.ts tela dia-1-a-nave-ganha-vida
`

function parseArgs(argv: string[]): { cmd: string; slug: string; cenas?: string[] } {
  const [cmd, ...rest] = argv
  let slug = ''
  let cenas: string[] | undefined
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]
    if (a === '--cenas') {
      cenas = (rest[++i] ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    } else if (a && !a.startsWith('--') && !slug) {
      slug = a
    }
  }
  return { cmd: cmd ?? '', slug, cenas }
}

/** Copia os cenários usados para out/cenarios (o Remotion serve out/ como public). */
function prepararMidia(slug: string): void {
  const paths = aulaPaths(slug)
  const destCenarios = join(paths.outDir, 'cenarios')
  mkdirSync(destCenarios, { recursive: true })
  for (const nome of ['cenario-a', 'cenario-b']) {
    const src = join(CENARIOS_DIR, `${nome}.png`)
    if (existsSync(src)) cpSync(src, join(destCenarios, `${nome}.png`))
  }
}

/**
 * Grava a tela rodando o recorder SOB NODE (via `node --import tsx`). O Playwright
 * não conecta o pipe de debug do browser quando lançado pelo Bun; o Node lança
 * normalmente. O resto do pipeline segue em Bun.
 */
async function gravarTelaNode(slug: string): Promise<void> {
  const proc = Bun.spawn({
    cmd: ['node', '--import', 'tsx', 'src/steps/04-tela/run.ts', slug],
    cwd: PACKAGE_ROOT,
    stdout: 'inherit',
    stderr: 'inherit',
  })
  const code = await proc.exited
  if (code !== 0) throw new Error(`gravação da tela falhou (código ${code})`)
}

async function render(slug: string): Promise<void> {
  const paths = aulaPaths(slug)
  mkdirSync(paths.outDir, { recursive: true })
  prepararMidia(slug)
  const planoPath = escreverPlano(slug)
  etapa(`Render — ${slug}`)
  // --public-dir RELATIVO ao cwd (PACKAGE_ROOT), com barras normais: o caminho
  // absoluto com backslashes do Windows não era resolvido pelo Remotion (as
  // mídias caíam em 404 no bundle). As mídias (tela.webm, audio/, cenarios/)
  // vivem em aulas/<slug>/out e são referenciadas por staticFile relativo.
  const publicDirRel = `aulas/${slug}/out`
  const proc = Bun.spawn({
    cmd: [
      'bun',
      'x',
      'remotion',
      'render',
      'remotion/index.ts',
      'Aula',
      paths.videoFinal,
      `--public-dir=${publicDirRel}`,
      `--props=${planoPath}`,
    ],
    cwd: PACKAGE_ROOT,
    stdout: 'inherit',
    stderr: 'inherit',
  })
  const code = await proc.exited
  if (code !== 0) throw new Error(`remotion render saiu com código ${code}`)
  ok(`vídeo final: ${paths.videoFinal}`)
}

async function main(): Promise<void> {
  const { cmd, slug, cenas } = parseArgs(Bun.argv.slice(2))
  if (!cmd || cmd === 'help' || cmd === '--help') {
    console.log(USO)
    return
  }
  if (!slug) {
    erro('faltou o slug da aula')
    console.log(USO)
    process.exit(1)
  }

  switch (cmd) {
    case 'validar': {
      const roteiro = loadRoteiroFile(aulaPaths(slug).roteiro)
      ok(`roteiro válido: ${roteiro.cenas.length} cenas, "${roteiro.meta.titulo}"`)
      break
    }
    case 'voz':
      await gerarVoz(slug, cenas)
      break
    case 'avatar':
      await gerarAvatar(slug, cenas)
      break
    case 'tela':
      await gravarTelaNode(slug)
      break
    case 'plano':
      ok(`plano em ${escreverPlano(slug)}`)
      break
    case 'render':
      await render(slug)
      break
    case 'all':
      await gravarTelaNode(slug)
      if (!existsSync(aulaPaths(slug).audioDir)) {
        aviso('sem áudio/avatar (faltam chaves) — montando só tela + balões')
      }
      await render(slug)
      break
    default:
      erro(`comando desconhecido: ${cmd}`)
      console.log(USO)
      process.exit(1)
  }
}

main().catch((e) => {
  erro((e as Error).message)
  process.exit(1)
})
