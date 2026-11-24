/**
 * A base de conhecimento do Zappy de um curso, sem navegador. A transcrição de cada vídeo (a
 * legenda que o Vimeo gera) e o texto do caderno do aluno (o PDF do passo a passo do projeto)
 * alimentam o que o Zappy sabe responder. Passo a passo: docs/operations/cursos-passo-a-passo.md.
 *
 *   bun scripts/cursos/base-do-zappy.ts <passo> --ambiente staging --publico kids --curso <slug>
 *
 *   caderno    marca todo anexo PDF do curso como caderno do aluno para o Zappy
 *              ("Passo a passo do projeto para o Zappy") e publica as aulas que mudaram
 *   atualizar  o mesmo que o botão "Atualizar a base do Zappy" do Admin, só para este curso:
 *              o Members aponta o que falta, o texto é extraído com o código do próprio Admin
 *              (com as variáveis do Admin do ambiente, só na memória) e entregue ao Members
 *   conferir   o relatório da base para o curso (aula com vídeo sem transcrição, fonte com erro,
 *              curso sem caderno)
 *
 * Produção exige --confirmo-producao.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { AMBIENTES, type Ambiente, noServico, variaveis } from './lib/railway'

const RAIZ = resolve(import.meta.dir, '../..')
const ATOR_PADRAO = '00000000-0000-4000-8000-00000000a007'
const PASSOS = ['caderno', 'atualizar', 'conferir'] as const
type Passo = (typeof PASSOS)[number]

const { values: op, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    ambiente: { type: 'string' },
    publico: { type: 'string' },
    curso: { type: 'string' },
    ator: { type: 'string', default: ATOR_PADRAO },
    'confirmo-producao': { type: 'boolean', default: false },
  },
})
const passo = positionals[0] as Passo
if (!PASSOS.includes(passo)) throw new Error(`Passo: ${PASSOS.join(' | ')}`)
const ambiente = op.ambiente as Ambiente
if (!(ambiente in AMBIENTES)) throw new Error('--ambiente staging | production')
if (ambiente === 'production' && !op['confirmo-producao'])
  throw new Error('Produção: confira em staging antes e passe --confirmo-producao')
const publico = op.publico === 'adulto' ? 'adult' : op.publico
if (publico !== 'kids' && publico !== 'adult') throw new Error('--publico kids | adulto')
if (!op.curso) throw new Error('--curso <slug do curso>')

const pasta = join(RAIZ, '.cache/cursos/base-do-zappy', `${publico}-${op.curso}-${ambiente}`)
mkdirSync(pasta, { recursive: true })
const gravar = (nome: string, v: unknown) =>
  writeFileSync(join(pasta, nome), `${JSON.stringify(v, null, 2)}\n`)

function membros<T>(pedido: Record<string, unknown>): Promise<T> {
  const codigo = readFileSync(join(import.meta.dir, 'remoto/aulas-do-curso.mjs'), 'utf8')
  return noServico<T>(ambiente, 'members', codigo, {
    ...pedido,
    ambienteId: AMBIENTES[ambiente],
    curso: op.curso,
    publico,
    ator: op.ator,
  })
}

interface Relatorio {
  aulas: { aula: number; id: string; titulo: string }[]
  semTranscricao: string[]
  falhas: { sourceRef: string; lessonTitle: string; error: string }[]
  semCaderno: boolean
}
async function conferir() {
  const r = await membros<Relatorio>({ acao: 'zappy' })
  gravar('relatorio.json', r)
  const titulo = (id: string) => r.aulas.find((a) => a.id === id)?.titulo ?? id
  console.log(
    JSON.stringify({
      aulasComVideoSemTranscricao: r.semTranscricao.map(titulo),
      fontesComErro: r.falhas.map((f) => ({
        fonte: f.sourceRef,
        aula: f.lessonTitle,
        erro: f.error,
      })),
      cursoSemCaderno: r.semCaderno,
    }),
  )
  const ok = r.semTranscricao.length === 0 && r.falhas.length === 0 && !r.semCaderno
  console.log(ok ? 'Base do Zappy em dia para este curso.' : 'A base ainda tem pendências.')
  return ok
}

if (passo === 'caderno') {
  const r = await membros<{ resumo: { alterados: number }[] }>({ acao: 'caderno' })
  console.log(JSON.stringify(r.resumo))
  if (r.resumo.length === 0) console.log('Nenhum PDF anexado nas aulas deste curso.')
  else if (r.resumo.some((a) => a.alterados > 0))
    console.log('Rode o passo atualizar para o texto do caderno entrar na base do Zappy.')
  else console.log('Os PDFs do curso já estavam marcados como caderno do aluno.')
} else if (passo === 'atualizar') {
  interface Pendente {
    lessonId: string
    sourceType: 'video-vtt' | 'student-notebook'
    sourceRef: string
    expectedBlockRevision: string
    extraction: unknown
  }
  const { pendentes } = await membros<{ pendentes: Pendente[] }>({ acao: 'zappy-pendentes' })
  console.log(
    JSON.stringify({
      pendentes: pendentes.length,
      videos: pendentes.filter((p) => p.sourceType === 'video-vtt').length,
      cadernos: pendentes.filter((p) => p.sourceType === 'student-notebook').length,
    }),
  )
  if (pendentes.length) {
    // O código do Admin roda num processo filho com as variáveis do Admin deste ambiente.
    const r = spawnSync(
      process.execPath,
      ['--conditions=react-server', join(import.meta.dir, 'lib/extrair-no-admin.ts')],
      {
        input: JSON.stringify(
          pendentes.map((p) => ({ sourceRef: p.sourceRef, extraction: p.extraction })),
        ),
        env: { ...process.env, ...variaveis(ambiente, 'admin') },
        cwd: RAIZ,
        encoding: 'utf8',
        maxBuffer: 128 * 1024 * 1024,
        windowsHide: true,
        timeout: 10 * 60_000,
      },
    )
    const linha = r.stdout?.split(/\r?\n/).find((l) => l.startsWith('SZ_EXTRACAO='))
    if (!linha) throw new Error(`Extração falhou (${r.status}): ${(r.stderr ?? '').slice(-800)}`)
    const extraidos = JSON.parse(linha.slice('SZ_EXTRACAO='.length)) as {
      sourceRef: string
      content?: string
      error?: string
    }[]
    const fontes = pendentes.map((p) => {
      const x = extraidos.find((e) => e.sourceRef === p.sourceRef)
      return {
        ...p,
        extraction: undefined,
        content: x?.content,
        error: x?.error ?? (x?.content ? undefined : 'Sem extração'),
      }
    })
    const { resultado } = await membros<{
      resultado: { sourceRef: string; entregue: boolean; comTexto?: boolean; erro?: string }[]
    }>({ acao: 'zappy-entregar', fontes })
    gravar('atualizacao.json', resultado)
    for (const f of fontes) {
      const e = resultado.find((x) => x.sourceRef === f.sourceRef)
      console.log(
        JSON.stringify({
          fonte: f.sourceRef,
          tipo: f.sourceType,
          caracteres: f.content?.length ?? 0,
          erroNaExtracao: f.content ? null : f.error,
          entregue: e?.entregue ?? false,
          ...(e?.erro ? { erroNaEntrega: e.erro } : {}),
        }),
      )
    }
  }
  await conferir()
} else if (passo === 'conferir') {
  await conferir()
}
