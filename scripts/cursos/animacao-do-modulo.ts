/**
 * Animação de cada módulo na página do curso (Kids), feita no ediSVG com as artes do próprio
 * curso. A receita de cada curso fica em docs/aulas-interativas-tecnico/recursos/<curso>/
 * animacao-dos-modulos.ts. Passo a passo: docs/operations/cursos-passo-a-passo.md (Etapa 1).
 *
 *   bun scripts/cursos/animacao-do-modulo.ts --receita <arquivo da receita> --passo montar
 *       monta o projeto de cada módulo com o código do ediSVG e grava art/edisvg/sources/<chave>.edisvg
 *   ... --passo exportar
 *       exporta com o exportador do ediSVG (scripts/qualify-web-assets.mts, Chromium de verdade) e
 *       guarda o resultado em art/edisvg/exports (scripts/edisvg/import-artifacts.ts)
 *   ... --passo cadastrar --ambiente staging [--publico kids] [--refazer] [--confirmo-producao]
 *       guarda a animação no R2 pelo código do Admin e põe no módulo (título conferido com o
 *       modulos.md e com a plataforma); módulo que já tem a mesma animação fica como está
 *   ... --passo conferir --ambiente staging [--publico kids]
 *       mostra, módulo a módulo, se a animação cadastrada é a exportada agora
 *
 * Opções: --modulo N (só um módulo). O ediSVG fica em ../informach-apps/apps/edisvg (ou EDISVG_APP).
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { prepareWebArtwork } from '../../packages/edisvg/src/data'
import type { Cena } from './lib/edisvg'
import { EDISVG_APP, RAIZ } from './lib/edisvg'
import { AMBIENTES, type Ambiente, noServico, variaveis } from './lib/railway'

const { values: op } = parseArgs({
  options: {
    receita: { type: 'string' },
    passo: { type: 'string' },
    modulo: { type: 'string' },
    ambiente: { type: 'string' },
    publico: { type: 'string', default: 'kids' },
    refazer: { type: 'boolean', default: false },
    ator: { type: 'string', default: '00000000-0000-4000-8000-00000000a007' },
    'confirmo-producao': { type: 'boolean', default: false },
  },
})
if (!op.receita)
  throw new Error(
    '--receita <docs/aulas-interativas-tecnico/recursos/<curso>/animacao-dos-modulos.ts>',
  )
const receita = (await import(resolve(RAIZ, op.receita))) as {
  curso: { slug: string; pasta: string }
  animacoes: { modulo: number; titulo: string; montar: () => Cena }[]
}
const escolhidas = receita.animacoes.filter((a) => !op.modulo || a.modulo === Number(op.modulo))
if (!escolhidas.length) throw new Error('Nenhuma animação para esse módulo na receita')

const FONTES = join(RAIZ, 'art/edisvg/sources')
const EXPORTS = join(RAIZ, 'art/edisvg/exports')
const sha = (b: string | Buffer) => createHash('sha256').update(b).digest('hex')
const chaveDe = (a: (typeof escolhidas)[number]) => a.montar().opcoes.chave
const manifesto = () =>
  JSON.parse(readFileSync(join(EXPORTS, 'manifest.json'), 'utf8')) as {
    artifacts: {
      key: string
      source: string
      sourceSha256: string
      file: string
      sha256: string
      poster: { file: string }
    }[]
  }

// Os títulos dos módulos no modulos.md (o padrão: "## Módulo N · <título>").
const md = readFileSync(join(RAIZ, receita.curso.pasta, 'modulos.md'), 'utf8')
const titulosDoMd = [...md.matchAll(/^## Módulo (\d+) · (.+)$/gm)].map((m) => m[2]!.trim())
for (const a of escolhidas)
  if (titulosDoMd[a.modulo - 1] !== a.titulo)
    throw new Error(
      `Módulo ${a.modulo}: a receita diz "${a.titulo}" e o modulos.md diz "${titulosDoMd[a.modulo - 1]}"`,
    )

if (op.passo === 'montar') {
  mkdirSync(FONTES, { recursive: true })
  for (const a of escolhidas) {
    const cena = a.montar()
    const texto = await cena.projeto()
    const arquivo = join(FONTES, `${cena.opcoes.chave}.edisvg`)
    const antes = existsSync(arquivo) ? readFileSync(arquivo, 'utf8') : null
    if (antes !== texto) writeFileSync(arquivo, texto)
    console.log(
      `módulo ${a.modulo} · ${a.titulo}: ${relative(RAIZ, arquivo)} ${antes === texto ? '(igual, nada mudou)' : `(gravado, ${Buffer.byteLength(texto)} bytes)`}`,
    )
  }
  console.log('Próximo: --passo exportar')
} else if (op.passo === 'exportar') {
  // O exportador lê TODOS os .edisvg da pasta: uma pasta só com os desta receita.
  const pasta = join(RAIZ, '.cache/cursos/animacoes', receita.curso.slug, String(Date.now()))
  const entrada = join(pasta, 'entrada')
  const saida = join(pasta, 'saida')
  mkdirSync(entrada, { recursive: true })
  const chaves = escolhidas.map(chaveDe)
  for (const chave of chaves) {
    const fonte = join(FONTES, `${chave}.edisvg`)
    if (!existsSync(fonte)) throw new Error(`Falta ${relative(RAIZ, fonte)}: rode --passo montar`)
    copyFileSync(fonte, join(entrada, `${chave}.edisvg`))
  }
  console.log(`Exportando ${chaves.length} animação(ões) com o ediSVG (Chromium de verdade)...`)
  const exportar = spawnSync(
    'node',
    ['--import', 'tsx', 'scripts/qualify-web-assets.mts', entrada, saida],
    {
      cwd: EDISVG_APP,
      stdio: 'inherit',
      windowsHide: true,
      timeout: 15 * 60_000,
    },
  )
  if (exportar.status !== 0)
    throw new Error(`O exportador do ediSVG falhou (${exportar.status}); veja ${saida}`)
  // Arquivos da exportação anterior destas chaves, para apagar os que ficarem órfãos.
  const antigos = existsSync(join(EXPORTS, 'manifest.json'))
    ? manifesto()
        .artifacts.filter((x) => chaves.some((c) => x.key.startsWith(`${c}-b`)))
        .flatMap((x) => [x.file, x.poster.file])
    : []
  const guardar = spawnSync(
    process.execPath,
    ['scripts/edisvg/import-artifacts.ts', saida, 'sources'],
    {
      cwd: RAIZ,
      stdio: 'inherit',
      windowsHide: true,
    },
  )
  if (guardar.status !== 0) throw new Error('Guardar no acervo (import-artifacts) falhou')
  const vivos = new Set(manifesto().artifacts.flatMap((x) => [x.file, x.poster.file]))
  for (const f of antigos) if (!vivos.has(f)) rmSync(join(EXPORTS, f), { force: true })
  for (const chave of chaves) {
    const feitos = manifesto().artifacts.filter((x) => x.key.startsWith(`${chave}-b`))
    console.log(`${chave}: ${feitos.map((x) => x.file).join(', ')}`)
  }
  console.log(`Imagens de conferência (computador e celular): ${relative(RAIZ, saida)}`)
  console.log('Próximo: --passo cadastrar --ambiente staging')
} else if (op.passo === 'cadastrar' || op.passo === 'conferir') {
  const ambiente = op.ambiente as Ambiente
  if (!(ambiente in AMBIENTES)) throw new Error('--ambiente staging | production')
  if (ambiente === 'production' && !op['confirmo-producao'])
    throw new Error('Produção: passe --confirmo-producao')
  const publico = op.publico === 'adulto' ? 'adult' : op.publico
  if (publico !== 'kids' && publico !== 'adult') throw new Error('--publico kids | adulto')
  const codigo = readFileSync(join(import.meta.dir, 'remoto/animacoes.mjs'), 'utf8')
  const pedido = {
    ambienteId: AMBIENTES[ambiente],
    publico,
    ator: op.ator,
    curso: receita.curso.slug,
  }
  type Modulo = { id: string; titulo: string; animacao: { sha256: string; url: string } | null }
  const [curso] = await noServico<{ slug: string; status: string; modulos: Modulo[] }[]>(
    ambiente,
    'members',
    codigo,
    { ...pedido, acao: 'listar' },
  )
  if (!curso)
    throw new Error(`Curso ${receita.curso.slug} não encontrado (${publico}, ${ambiente})`)
  let falhas = 0
  for (const a of escolhidas) {
    const chave = chaveDe(a)
    const fonte = readFileSync(join(FONTES, `${chave}.edisvg`))
    const exportada = manifesto().artifacts.find((x) => x.key === `${chave}-b1-a1`)
    if (!exportada || exportada.sourceSha256 !== sha(fonte))
      throw new Error(`${chave}: a exportação não é a do projeto atual; rode --passo exportar`)
    const modulo = curso.modulos[a.modulo - 1]
    if (!modulo || modulo.titulo !== a.titulo)
      throw new Error(
        `Módulo ${a.modulo} na plataforma: "${modulo?.titulo ?? '(não existe)'}", esperado "${a.titulo}"`,
      )
    // O Admin guarda o arquivo sem o pôster embutido (o pôster vai à parte): o sha256 cadastrado é
    // o do conteúdo preparado pela mesma função (prepareWebArtwork), não o do arquivo exportado.
    const preparado = prepareWebArtwork(readFileSync(join(EXPORTS, exportada.file), 'utf8'))
    const shaCadastrado = sha(preparado.content)
    const igual = modulo.animacao?.sha256 === shaCadastrado
    if (op.passo === 'conferir') {
      console.log(
        `${igual ? '✓' : '✗'} módulo ${a.modulo} · ${a.titulo}: ${modulo.animacao ? (igual ? 'animação atual' : 'animação diferente da exportada') : 'sem animação'}`,
      )
      if (!igual) falhas++
      continue
    }
    if (igual && !op.refazer) {
      console.log(`módulo ${a.modulo} · ${a.titulo}: já tem esta animação (nada a fazer)`)
      continue
    }
    // O Admin guarda o arquivo e o pôster no R2 do ambiente e devolve a referência.
    const r = spawnSync(
      process.execPath,
      [
        '--conditions=react-server',
        join(import.meta.dir, 'lib/guardar-animacao-no-admin.ts'),
        join(EXPORTS, exportada.file),
      ],
      {
        env: { ...process.env, ...variaveis(ambiente, 'admin') },
        cwd: RAIZ,
        encoding: 'utf8',
        windowsHide: true,
        timeout: 5 * 60_000,
      },
    )
    const linha = r.stdout?.split(/\r?\n/).find((l) => l.startsWith('SZ_ANIMACAO='))
    if (!linha)
      throw new Error(
        `O Admin não guardou a animação (${r.status}): ${(r.stderr ?? '').slice(-800)}`,
      )
    const animacao = JSON.parse(linha.slice('SZ_ANIMACAO='.length)) as { sha256: string }
    if (animacao.sha256 !== shaCadastrado)
      throw new Error(`O Admin guardou outro arquivo: ${JSON.stringify(animacao)}`)
    const feito = await noServico<{ modulo: string; animacao: string; poster: string }>(
      ambiente,
      'members',
      codigo,
      { ...pedido, acao: 'gravar', moduloId: modulo.id, tituloDoModulo: a.titulo, animacao },
    )
    console.log(`módulo ${a.modulo} · ${feito.modulo}: animação cadastrada (${feito.animacao})`)
  }
  if (falhas) process.exitCode = 1
} else {
  throw new Error('--passo montar | exportar | cadastrar | conferir')
}
