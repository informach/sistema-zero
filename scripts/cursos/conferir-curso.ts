/**
 * Confere um curso publicado contra a pasta dele no repositório (só leitura): aulas e partes dos
 * manifestos, o PDF do passo a passo (o mesmo arquivo, marcado como caderno do aluno para o Zappy),
 * os blocos liberados (a união do blocos.json), os vídeos (nenhum provisório de 2 s) e, quando o
 * modulos.md traz, o título, as descrições e os módulos. Passo a passo:
 * docs/operations/cursos-passo-a-passo.md.
 *
 *   bun scripts/cursos/conferir-curso.ts --ambiente staging --publico kids --curso jornada-faisca-missao \
 *     --pasta docs/aulas-interativas/faisca/o-jardim-secreto [--confirmo-producao]
 */
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { AMBIENTES, type Ambiente, noServico } from './lib/railway'

const { values: op } = parseArgs({
  options: {
    ambiente: { type: 'string' },
    publico: { type: 'string' },
    curso: { type: 'string' },
    pasta: { type: 'string' },
    ator: { type: 'string', default: '00000000-0000-4000-8000-00000000a007' },
    'confirmo-producao': { type: 'boolean', default: false },
  },
})
const ambiente = op.ambiente as Ambiente
if (!(ambiente in AMBIENTES)) throw new Error('--ambiente staging | production')
if (ambiente === 'production' && !op['confirmo-producao'])
  throw new Error('Produção (só leitura, mas confirme): passe --confirmo-producao')
const publico = op.publico === 'adulto' ? 'adult' : op.publico
if (publico !== 'kids' && publico !== 'adult') throw new Error('--publico kids | adulto')
if (!op.curso || !op.pasta) throw new Error('--curso <slug> --pasta <pasta do curso em docs/>')

interface Resumo {
  curso: {
    titulo: string
    subtitulo: string | null
    descricao: string | null
    status: string
    blocosLiberados: number
  }
  modulos: { titulo: string; resumo: string | null }[]
  aulas: {
    aula: number
    titulo: string
    publicada: boolean
    partes: number
    blocos: Record<string, number>
    anexos: {
      rotulo: string
      url: string
      tipo: string | null
      bytes: number | null
      cadernoDoZappy: boolean
    }[]
  }[]
}
interface Inspecao {
  aulas: { partes: { videos: { durationSeconds: number }[] }[] }[]
}
const codigo = readFileSync(join(import.meta.dir, 'remoto/aulas-do-curso.mjs'), 'utf8')
const pedido = { ambienteId: AMBIENTES[ambiente], curso: op.curso, publico, ator: op.ator }
const resumo = await noServico<Resumo>(ambiente, 'members', codigo, { ...pedido, acao: 'resumo' })
const inspecao = await noServico<Inspecao>(ambiente, 'members', codigo, {
  ...pedido,
  acao: 'inspecionar',
})

const linhas: { ok: boolean; item: string; detalhe?: string }[] = []
const conferir = (ok: boolean, item: string, detalhe?: string) => linhas.push({ ok, item, detalhe })

conferir(resumo.curso.status === 'published', 'curso publicado', resumo.curso.status)
for (const a of resumo.aulas) conferir(a.publicada, `aula ${a.aula} publicada`, a.titulo)

// Manifestos: uma aula por manifesto (aula-N.manifesto.json ou <prefixo>-aula-N.manifesto.json),
// com o mesmo número de partes.
const numeroDaAula = (n: string) => Number(n.match(/aula-(\d+)\.manifesto\.json$/)![1])
const manifestos = readdirSync(op.pasta)
  .filter((n) => /(^|-)aula-\d+\.manifesto\.json$/.test(n))
  .sort((x, y) => numeroDaAula(x) - numeroDaAula(y))
conferir(
  manifestos.length === resumo.aulas.length,
  'uma aula por manifesto',
  `${manifestos.length} manifestos, ${resumo.aulas.length} aulas`,
)
for (const [i, nome] of manifestos.entries()) {
  const m = JSON.parse(readFileSync(join(op.pasta, nome), 'utf8')) as { sections?: unknown[] }
  const aula = resumo.aulas[i]
  if (aula && Array.isArray(m.sections))
    conferir(
      m.sections.length === aula.partes,
      `aula ${aula.aula}: partes do manifesto`,
      `${m.sections.length} no manifesto, ${aula.partes} publicadas`,
    )
}

// O PDF do passo a passo: o mesmo arquivo e marcado. No staging o nome do objeto no R2 é o sha256
// do arquivo; a promoção para produção copia com outro nome (admin/course-publication/...), e aí
// vale o tamanho exato (a promoção confere o conteúdo ao copiar).
const pdf = join(op.pasta, 'passo-a-passo-do-projeto.pdf')
const anexosPdf = resumo.aulas.flatMap((a) =>
  a.anexos
    .filter((x) => x.tipo === 'application/pdf' || /\.pdf/i.test(x.url))
    .map((x) => ({ ...x, aula: a.aula })),
)
if (existsSync(pdf)) {
  const bytes = readFileSync(pdf)
  const sha = createHash('sha256').update(bytes).digest('hex')
  const peloSha = anexosPdf.some((x) => x.url.includes(sha))
  const peloTamanho = anexosPdf.some((x) => x.bytes === bytes.length)
  conferir(
    peloSha || peloTamanho,
    'PDF do passo a passo anexado (o mesmo arquivo da pasta)',
    `${anexosPdf.map((x) => `aula ${x.aula}: ${x.rotulo}`).join('; ') || 'nenhum PDF'}${peloSha ? ' (mesmo sha256)' : peloTamanho ? ` (mesmo tamanho, ${bytes.length} bytes)` : ''}`,
  )
}
for (const x of anexosPdf)
  conferir(
    x.cadernoDoZappy,
    `aula ${x.aula}: PDF marcado como caderno do aluno para o Zappy`,
    x.rotulo,
  )

// Blocos liberados: a união das listas do blocos.json.
const arquivoBlocos = join(op.pasta, 'blocos.json')
if (existsSync(arquivoBlocos)) {
  const lido = JSON.parse(readFileSync(arquivoBlocos, 'utf8')) as unknown
  const listas = Array.isArray(lido) ? [lido] : Object.values(lido as Record<string, unknown>)
  const uniao = new Set(listas.flatMap((l) => (Array.isArray(l) ? l : [])))
  conferir(
    resumo.curso.blocosLiberados === uniao.size,
    'blocos liberados = união do blocos.json',
    `${resumo.curso.blocosLiberados} no curso, ${uniao.size} no blocos.json`,
  )
}

// Vídeos: nenhum provisório (2 s) e todos com duração.
const duracoes = inspecao.aulas.flatMap((a) =>
  a.partes.flatMap((p) => p.videos.map((v) => v.durationSeconds)),
)
conferir(
  duracoes.length > 0 && duracoes.every((d) => d > 5),
  'vídeos finais (nenhum provisório de 2 s)',
  duracoes.join(', '),
)

// modulos.md, quando traz os campos (cada curso usa um formato).
const arquivoModulos = join(op.pasta, 'modulos.md')
if (existsSync(arquivoModulos)) {
  const md = readFileSync(arquivoModulos, 'utf8')
  const campo = (nome: string) => md.match(new RegExp(`\\*\\*${nome}:\\*\\*\\s*(.+)`))?.[1]?.trim()
  const titulo = campo('Título do curso')
  if (titulo)
    conferir(titulo === resumo.curso.titulo, 'título do curso = modulos.md', resumo.curso.titulo)
  const curta = campo('Descrição curta')
  if (curta)
    conferir(
      curta === resumo.curso.subtitulo,
      'descrição curta = modulos.md (subtítulo)',
      resumo.curso.subtitulo ?? '(vazio)',
    )
  const longa = campo('Descrição longa')
  if (longa)
    conferir(
      longa === resumo.curso.descricao,
      'descrição longa = modulos.md',
      (resumo.curso.descricao ?? '(vazio)').slice(0, 80),
    )
  // O padrão (modulos-padrao.test.ts): "## Módulo N · <título>" seguido de "**Resumo:** ...".
  const modulos = [...md.matchAll(/^## Módulo \d+ · (.+)$/gm)].map((m, i, todos) => ({
    titulo: m[1]!.trim(),
    resumo: md
      .slice(m.index, todos[i + 1]?.index ?? md.length)
      .match(/^\*\*Resumo:\*\* *(.+)$/m)?.[1]
      ?.trim(),
  }))
  conferir(
    JSON.stringify(modulos.map((m) => m.titulo)) ===
      JSON.stringify(resumo.modulos.map((m) => m.titulo)),
    'módulos = modulos.md',
    resumo.modulos.map((m) => m.titulo).join('; '),
  )
  for (const [i, m] of modulos.entries())
    if (resumo.modulos[i])
      conferir(
        m.resumo === resumo.modulos[i]!.resumo,
        `resumo do módulo ${i + 1} = modulos.md`,
        (resumo.modulos[i]!.resumo ?? '(vazio)').slice(0, 80),
      )
}

for (const l of linhas)
  console.log(`${l.ok ? '✓' : '✗'} ${l.item}${l.detalhe ? `: ${l.detalhe}` : ''}`)
const falhas = linhas.filter((l) => !l.ok).length
console.log(falhas ? `${falhas} item(ns) a corrigir.` : 'Tudo confere.')
console.log(
  JSON.stringify({ blocosPorAula: resumo.aulas.map((a) => ({ aula: a.aula, ...a.blocos })) }),
)
if (falhas) process.exitCode = 1
