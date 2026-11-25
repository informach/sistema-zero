/**
 * Cadastra um curso no Kids de STAGING a partir da pasta dele no repositório, com o vídeo
 * provisório de 2 s e a capa de cada parte (Etapa 1 de docs/operations/cursos-passo-a-passo.md).
 * Só staging: a produção recebe o curso pela promoção (Etapa 4).
 *
 *   bun scripts/cursos/cadastrar-curso.ts <passo> --pasta docs/aulas-interativas/<app>/<curso> \
 *     [--capa-do-curso <jpg>]
 *
 * Passos, nesta ordem (cada um pode rodar de novo; o que já está igual fica como está):
 *   inspecionar  o curso no staging e o que a pasta tem (só leitura)
 *   aulas        cria os módulos e as aulas que faltam (o seed traz só a aula-1) e importa cada
 *                manifesto no modo "Atualizar pelo manifesto"
 *   midia        um vídeo do Vimeo por parte com vídeo (o provisório, com a capa da parte), as capas
 *                e a capa do curso no R2 público e o caderno no R2 privado, pelo código do Admin.
 *                Um vídeo que travou em "processando" no Vimeo: --refazer 2-2 (apaga e envia de novo)
 *   ligar        põe vídeo e capa em cada bloco de vídeo, liga os vídeos planejados e anexa o caderno,
 *                marcado para o Zappy, no bloco de materiais "Passo a passo do projeto"; valida
 *   vozes        a voz do Zappy dos balões, dos quizzes e das experiências (o código do botão
 *                "Gerar a voz do Zappy" do Admin)
 *   publicar     publica as aulas, grava módulos (título e resumo do modulos.md) e curso (título,
 *                descrições, capa e os blocos liberados do blocos.json) e publica o curso
 *
 * Depois: a animação de cada módulo (animacao-do-modulo.ts), a base do Zappy
 * (base-do-zappy.ts atualizar) e a conferência (conferir-curso.ts).
 *
 * Arquivos lidos da pasta: modulos.md, blocos.json, (prefixo-)aula-N.manifesto.json,
 * passo-a-passo-do-projeto.pdf e capas-das-aulas/aula-0N-parte-0M.png (uma por parte com vídeo).
 * A capa do curso é caderno-visual/arte/capa-<pasta>.jpg (ou --capa-do-curso).
 * O estado (ids dos vídeos, endereços do R2) fica em .cache/cursos/cadastrar/<curso>-staging/.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { AMBIENTES, noServico, variaveis } from './lib/railway'

const RAIZ = resolve(import.meta.dir, '../..')
const PASSOS = ['inspecionar', 'aulas', 'midia', 'ligar', 'vozes', 'publicar'] as const
const { values: op, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    pasta: { type: 'string' },
    'capa-do-curso': { type: 'string' },
    refazer: { type: 'string' },
    ambiente: { type: 'string', default: 'staging' },
    ator: { type: 'string', default: '00000000-0000-4000-8000-00000000a007' },
  },
})
const passo = positionals[0] as (typeof PASSOS)[number]
if (!PASSOS.includes(passo)) throw new Error(`Passo: ${PASSOS.join(' | ')}`)
if (op.ambiente !== 'staging')
  throw new Error('Só staging: a produção recebe o curso pela promoção (publicar-curso.ts)')
if (!op.pasta) throw new Error('--pasta docs/aulas-interativas/<app>/<curso>')
const pasta = resolve(RAIZ, op.pasta)

// ── A pasta do curso ──
const numeroDaAula = (n: string) => Number(n.match(/aula-(\d+)\.manifesto\.json$/)![1])
const manifestos = readdirSync(pasta)
  .filter((n) => /(^|-)aula-\d+\.manifesto\.json$/.test(n))
  .sort((x, y) => numeroDaAula(x) - numeroDaAula(y))
  .map((n) => ({
    aula: numeroDaAula(n),
    documento: JSON.parse(readFileSync(join(pasta, n), 'utf8')) as {
      courseSlug: string
      lessonSlug: string
      title: string
      blocks: { key: string; plannedVideo?: unknown; content?: { kind: string; title?: string } }[]
      sections: { title: string; blockKeys: string[] }[]
    },
  }))
if (!manifestos.length) throw new Error('Nenhum aula-N.manifesto.json na pasta')
const slug = manifestos[0]!.documento.courseSlug
if (manifestos.some((m) => m.documento.courseSlug !== slug))
  throw new Error('Os manifestos apontam para cursos diferentes')

const md = readFileSync(join(pasta, 'modulos.md'), 'utf8')
const campo = (texto: string, nome: string) =>
  texto.match(new RegExp(`\\*\\*${nome}:\\*\\*\\s*(.+)`))?.[1]?.trim() ?? null
const tituloDoCurso = campo(md, 'Título do curso')
if (!tituloDoCurso) throw new Error('modulos.md sem **Título do curso:**')
const pedacos = md.split(/^## Módulo \d+ · /m).slice(1)
const modulos = pedacos.map((t) => {
  const titulo = t.split(/\r?\n/)[0]!.trim()
  const aulas = [...t.matchAll(/^### Aula (\d+)\./gm)].map((x) => Number(x[1]))
  return { titulo, resumo: campo(t, 'Resumo'), aulas }
})
if (!modulos.length) throw new Error('modulos.md sem "## Módulo N · <título>"')
const moduloDaAula = (aula: number) => {
  const i = modulos.findIndex((m) => m.aulas.includes(aula))
  if (i >= 0) return i
  if (modulos.length === 1) return 0
  throw new Error(`Aula ${aula} não aparece em nenhum módulo do modulos.md`)
}
const blocos = JSON.parse(readFileSync(join(pasta, 'blocos.json'), 'utf8')) as
  | string[]
  | Record<string, string[]>
const blocosLiberados = [...new Set(Array.isArray(blocos) ? blocos : Object.values(blocos).flat())]

const dois = (n: number) => String(n).padStart(2, '0')
// As partes com vídeo: a seção que tem um bloco com vídeo planejado.
const partes = manifestos.flatMap((m) =>
  m.documento.sections.flatMap((s, i) =>
    s.blockKeys.some((k) => m.documento.blocks.find((b) => b.key === k)?.plannedVideo)
      ? [
          {
            chave: `${m.aula}-${i + 1}`,
            aula: m.aula,
            lessonSlug: m.documento.lessonSlug,
            parte: i + 1,
            capa: join(pasta, 'capas-das-aulas', `aula-${dois(m.aula)}-parte-${dois(i + 1)}.png`),
          },
        ]
      : [],
  ),
)
const caderno = join(pasta, 'passo-a-passo-do-projeto.pdf')
const arte = join(RAIZ, 'docs/aulas-interativas-tecnico/recursos/caderno-visual/arte')
const nomeDaPasta = basename(pasta)
const capaDoCurso = op['capa-do-curso']
  ? resolve(RAIZ, op['capa-do-curso'])
  : [`capa-${nomeDaPasta}.jpg`, `capa-${nomeDaPasta.replace(/^poder-/, '')}.jpg`]
      .map((n) => join(arte, n))
      .find(existsSync)
const provisorio = join(
  RAIZ,
  'docs/aulas-interativas-tecnico/recursos/video-provisorio/video-provisorio-2s.mp4',
)

const estadoDir = join(RAIZ, '.cache/cursos/cadastrar', `${slug}-staging`)
mkdirSync(estadoDir, { recursive: true })
const arquivoDeEstado = join(estadoDir, 'midia.json')
const codigo = readFileSync(join(import.meta.dir, 'remoto/cadastro.mjs'), 'utf8')
const remoto = <T>(acao: string, extra: Record<string, unknown> = {}) =>
  noServico<T>('staging', 'members', codigo, {
    ambienteId: AMBIENTES.staging,
    ator: op.ator,
    curso: slug,
    acao,
    ...extra,
  })
const mostrar = (x: unknown) => console.log(JSON.stringify(x, null, 1))

/** Roda lib/midia-no-admin.ts com as variáveis do Admin de staging (só na memória do filho). */
function noAdmin<T>(pedido: Record<string, unknown>): T {
  const arquivo = join(estadoDir, `pedido-${pedido.acao}.json`)
  writeFileSync(arquivo, JSON.stringify(pedido))
  const r = spawnSync(
    process.execPath,
    ['--conditions=react-server', join(import.meta.dir, 'lib/midia-no-admin.ts'), arquivo],
    {
      env: { ...process.env, ...variaveis('staging', 'admin') },
      cwd: RAIZ,
      encoding: 'utf8',
      windowsHide: true,
      timeout: 30 * 60_000,
      maxBuffer: 64 * 1024 * 1024,
    },
  )
  const linha = r.stdout?.split(/\r?\n/).find((l) => l.startsWith('SZ_MIDIA='))
  if (!linha)
    throw new Error(`O Admin não concluiu (${r.status}): ${(r.stderr ?? '').slice(-1500)}`)
  return JSON.parse(linha.slice('SZ_MIDIA='.length)) as T
}

if (passo === 'inspecionar') {
  const faltam = [
    ...partes.filter((p) => !existsSync(p.capa)).map((p) => `capa ${p.chave}`),
    ...(existsSync(caderno) ? [] : ['passo-a-passo-do-projeto.pdf']),
    ...(capaDoCurso ? [] : ['capa do curso (--capa-do-curso)']),
  ]
  const comCaderno = manifestos.filter((m) =>
    m.documento.blocks.some(
      (b) =>
        b.content?.kind === 'materials' &&
        String(b.content.title ?? '').startsWith('Passo a passo do projeto'),
    ),
  )
  mostrar({
    pasta: op.pasta,
    curso: slug,
    titulo: tituloDoCurso,
    modulos: modulos.map((m) => ({ titulo: m.titulo, aulas: m.aulas })),
    aulas: manifestos.map((m) => ({
      aula: m.aula,
      slug: m.documento.lessonSlug,
      titulo: m.documento.title,
      partes: m.documento.sections.length,
      comVideo: partes.filter((p) => p.aula === m.aula).map((p) => p.parte),
    })),
    cadernoNaAula: comCaderno.map((m) => m.aula),
    capaDoCurso: capaDoCurso ? capaDoCurso.slice(RAIZ.length + 1) : null,
    blocosLiberados: blocosLiberados.length,
    faltam,
  })
  mostrar(await remoto('estado'))
} else if (passo === 'aulas') {
  mostrar(
    await remoto('aulas', {
      modulos: modulos.map((m) => ({ titulo: m.titulo, resumo: m.resumo })),
      aulas: manifestos.map((m) => ({ modulo: moduloDaAula(m.aula), documento: m.documento })),
    }),
  )
} else if (passo === 'midia') {
  for (const p of partes) if (!existsSync(p.capa)) throw new Error(`Falta a capa ${p.capa}`)
  if (!existsSync(caderno)) throw new Error('Falta passo-a-passo-do-projeto.pdf')
  if (!capaDoCurso) throw new Error('Falta a capa do curso: --capa-do-curso <jpg>')
  const hoje = new Date().toISOString().slice(0, 10).replaceAll('-', '')
  mostrar(
    noAdmin({
      acao: 'midia',
      estado: arquivoDeEstado,
      nomeDoCurso: tituloDoCurso,
      data: hoje,
      videoProvisorio: provisorio,
      prefixoR2: `admin/staging/${slug}`,
      partes: partes.map((p) => ({ chave: p.chave, capa: p.capa })),
      caderno,
      capaDoCurso,
      refazer: (op.refazer ?? '').split(',').filter(Boolean),
    }),
  )
} else if (passo === 'ligar') {
  if (!existsSync(arquivoDeEstado)) throw new Error('Rode o passo midia antes')
  const estado = JSON.parse(readFileSync(arquivoDeEstado, 'utf8')) as {
    videos: Record<
      string,
      { id: string; embedUrl: string; duracao: number; status: string; capaAtiva: boolean }
    >
    capas: Record<string, { url: string }>
    caderno: { url: string; bytes: number }
  }
  const aulas = manifestos.map((m) => ({
    slug: m.documento.lessonSlug,
    partes: partes
      .filter((p) => p.aula === m.aula)
      .map((p) => {
        const v = estado.videos[p.chave]
        const capa = estado.capas[p.chave]
        if (v?.status !== 'available' || !v.capaAtiva || !capa)
          throw new Error(`Parte ${p.chave}: vídeo ou capa não prontos; rode o passo midia`)
        return {
          parte: p.parte,
          video: { id: v.id, src: v.embedUrl, durationSeconds: v.duracao },
          posterUrl: capa.url,
        }
      }),
  }))
  mostrar(
    await remoto('ligar', {
      aulas,
      caderno: {
        url: estado.caderno.url,
        bytes: estado.caderno.bytes,
        rotulo: `Passo a passo do projeto · ${tituloDoCurso}`,
      },
    }),
  )
} else if (passo === 'vozes') {
  const { aulas } = await remoto<{
    aulas: { slug: string; blocos: { id: string; content: unknown }[] }[]
  }>('falas')
  const r = noAdmin<{
    vozes: Record<string, Record<string, string>>
    falas: number
    geradas: number
    reaproveitadas: number
    longasDemais: number
    semVoz: number
  }>({
    acao: 'vozes',
    blocos: aulas.flatMap((a) => a.blocos),
  })
  const { vozes, ...resumo } = r
  mostrar({ ...resumo, blocos: Object.keys(vozes).length })
  if (r.semVoz) throw new Error(`${r.semVoz} falas sem voz: rode de novo`)
  mostrar(await remoto('vozes', { vozes }))
} else if (passo === 'publicar') {
  if (!existsSync(arquivoDeEstado)) throw new Error('Rode o passo midia antes')
  const estado = JSON.parse(readFileSync(arquivoDeEstado, 'utf8')) as {
    capaDoCurso: { url: string }
  }
  mostrar(
    await remoto('publicar', {
      modulos: modulos.map((m) => ({ titulo: m.titulo, resumo: m.resumo })),
      dadosDoCurso: {
        titulo: tituloDoCurso,
        subtitulo: campo(md, 'Descrição curta'),
        descricao: campo(md, 'Descrição longa'),
        capa: estado.capaDoCurso.url,
        blocos: blocosLiberados,
      },
    }),
  )
}
