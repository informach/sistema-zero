/**
 * Copia um curso Kids para o adulto e promove o Kids de staging para produção, pelo operador
 * implantado `packages/members/scripts/publish-course.ts` (o mesmo serviço e o mesmo trabalho
 * durável dos botões do Admin). Passo a passo: docs/operations/cursos-passo-a-passo.md (Etapas 3 e 4).
 *
 *   bun scripts/cursos/publicar-curso.ts <passo> --operacao adulto|producao --ambiente <amb> \
 *     --curso <slug do curso Kids> [--destino <slug>] [--blocos <blocos.json>] [--confirmo-producao]
 *
 *   --operacao adulto    copy-adult no --ambiente (staging ou production): Kids → adulto do mesmo
 *                        ambiente; destino padrão `<slug>-adulto`
 *   --operacao producao  promote-kids: Kids de staging → Kids de produção (roda no Members de
 *                        staging); destino padrão o mesmo slug
 *
 * Passos (o trabalho fica em .cache/cursos/publicar/<operação>-<slug>-<ambiente>/trabalho.json):
 *   previa    prepara e mostra a prévia (origem, destino, módulos, aulas e o que sai da grade)
 *   aprovar   aprova a última prévia e acompanha até terminar (30 s entre as leituras)
 *   ver       mostra o estado do último trabalho
 *   retomar   retoma um trabalho que falhou (depois de corrigir a causa) e acompanha
 *   cancelar  cancela o último trabalho
 *   blocos    confere (e, com --blocos <arquivo>, grava) as ferramentas que o curso de destino
 *             libera no Estúdio: a união das listas do blocos.json
 *
 * Tudo que escreve em produção (promover, copiar no adulto de produção, blocos em produção) exige
 * --confirmo-producao.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { AMBIENTES, type Ambiente, noServico } from './lib/railway'

const RAIZ = resolve(import.meta.dir, '../..')
const ATOR_PADRAO = '00000000-0000-4000-8000-00000000a007'
const PASSOS = ['previa', 'aprovar', 'ver', 'retomar', 'cancelar', 'blocos'] as const
type Passo = (typeof PASSOS)[number]

const { values: op, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    operacao: { type: 'string' },
    ambiente: { type: 'string' },
    curso: { type: 'string' },
    destino: { type: 'string' },
    blocos: { type: 'string' },
    ator: { type: 'string', default: ATOR_PADRAO },
    'confirmo-producao': { type: 'boolean', default: false },
  },
})
const passo = positionals[0] as Passo
if (!PASSOS.includes(passo)) throw new Error(`Passo: ${PASSOS.join(' | ')}`)
const operacao =
  op.operacao === 'adulto' ? 'copy-adult' : op.operacao === 'producao' ? 'promote-kids' : null
if (!operacao) throw new Error('--operacao adulto | producao')
const ambiente = op.ambiente as Ambiente
if (!(ambiente in AMBIENTES)) throw new Error('--ambiente staging | production')
if (operacao === 'promote-kids' && ambiente !== 'staging')
  throw new Error('A promoção parte do Kids de staging: use --ambiente staging')
if (!op.curso) throw new Error('--curso <slug do curso Kids>')
const destino = op.destino ?? (operacao === 'copy-adult' ? `${op.curso}-adulto` : op.curso)
const escreveEmProducao = ambiente === 'production' || operacao === 'promote-kids'
if (escreveEmProducao && passo !== 'ver' && !op['confirmo-producao'])
  throw new Error('Isto escreve em produção: confira a prévia e passe --confirmo-producao')

const pasta = join(RAIZ, '.cache/cursos/publicar', `${operacao}-${op.curso}-${ambiente}`)
mkdirSync(pasta, { recursive: true })
const arquivoDoTrabalho = join(pasta, 'trabalho.json')

interface Trabalho {
  id: string
  operation: string
  status: string
  version: number
  planHash: string
  preview: {
    source: { slug: string; environment: string }
    target: {
      id: string | null
      slug: string
      environment: string
      audience: string
      exists: boolean
    }
    modules: number
    lessons: number
    retiredModules: number
    retiredLessons: number
  }
  tasks: { completed: number; total: number }
  error: string | null
}

async function operador(pedido: Record<string, unknown>): Promise<Trabalho> {
  const codigo = readFileSync(join(import.meta.dir, 'remoto/operador.mjs'), 'utf8')
  const r = await noServico<{ trabalho: Trabalho }>(ambiente, 'members', codigo, {
    ambienteId: AMBIENTES[ambiente],
    curso: op.curso,
    pedido: { environment: ambiente, ...pedido },
  })
  writeFileSync(arquivoDoTrabalho, `${JSON.stringify(r.trabalho, null, 2)}\n`)
  return r.trabalho
}

function mostrar(t: Trabalho) {
  const p = t.preview
  console.log(
    JSON.stringify({
      trabalho: t.id,
      estado: t.status,
      origem: `${p.source.slug} (${p.source.environment})`,
      destino: `${p.target.slug} (${p.target.environment}, ${p.target.audience}, ${p.target.exists ? 'já existe' : 'novo'})`,
      modulos: p.modules,
      aulas: p.lessons,
      saemDaGrade: { modulos: p.retiredModules, aulas: p.retiredLessons },
      tarefas: `${t.tasks.completed}/${t.tasks.total}`,
      ...(t.error ? { erro: t.error } : {}),
    }),
  )
}

function ultimo(): Trabalho {
  if (!existsSync(arquivoDoTrabalho)) throw new Error('Nenhum trabalho ainda: rode previa')
  return JSON.parse(readFileSync(arquivoDoTrabalho, 'utf8')) as Trabalho
}

async function acompanhar(id: string) {
  const fim = Date.now() + 2 * 60 * 60_000
  for (;;) {
    const t = await operador({ action: 'view', id })
    mostrar(t)
    if (['completed', 'failed', 'cancelled'].includes(t.status)) return t
    if (Date.now() > fim) throw new Error('Acompanhamento passou de duas horas: rode ver depois')
    await Bun.sleep(30_000)
  }
}

if (passo === 'previa') {
  const t = await operador({
    action: 'preview',
    operation: operacao,
    targetSlug: destino,
    requestKey: crypto.randomUUID(),
    actorId: op.ator,
  })
  mostrar(t)
  if (t.preview.retiredLessons || t.preview.retiredModules)
    console.log(
      '⚠ Esta publicação arquiva aulas ou módulos que estão a mais no destino (o histórico dos alunos fica).',
    )
  console.log('Confira acima e rode aprovar para publicar.')
} else if (passo === 'aprovar' || passo === 'retomar' || passo === 'cancelar') {
  const t0 = ultimo()
  const acao = passo === 'aprovar' ? 'approve' : passo === 'retomar' ? 'resume' : 'cancel'
  const t = await operador({ action: acao, id: t0.id, version: t0.version, planHash: t0.planHash })
  mostrar(t)
  if (acao !== 'cancel') {
    const fim = await acompanhar(t.id)
    if (fim.status !== 'completed') process.exitCode = 1
  }
} else if (passo === 'ver') {
  mostrar(await operador({ action: 'view', id: ultimo().id }))
} else if (passo === 'blocos') {
  // O curso de destino, no ambiente onde ele mora.
  const alvo: Ambiente = operacao === 'promote-kids' ? 'production' : ambiente
  const publico = operacao === 'copy-adult' ? 'adult' : 'kids'
  let blocos: string[] | undefined
  if (op.blocos) {
    const lido = JSON.parse(readFileSync(op.blocos, 'utf8')) as unknown
    const listas = Array.isArray(lido) ? [lido] : Object.values(lido as Record<string, unknown>)
    blocos = [
      ...new Set(
        listas
          .flatMap((l) => (Array.isArray(l) ? l : []))
          .filter((b): b is string => typeof b === 'string'),
      ),
    ]
    if (blocos.length === 0) throw new Error(`Nenhum bloco em ${op.blocos}`)
  }
  const codigo = readFileSync(join(import.meta.dir, 'remoto/aulas-do-curso.mjs'), 'utf8')
  const r = await noServico<unknown>(alvo, 'members', codigo, {
    acao: 'blocos',
    ambienteId: AMBIENTES[alvo],
    curso: destino,
    publico,
    ator: op.ator,
    ...(blocos ? { blocos } : {}),
  })
  console.log(JSON.stringify(r))
}
