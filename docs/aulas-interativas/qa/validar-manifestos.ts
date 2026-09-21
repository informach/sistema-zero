/**
 * Valida os manifestos do redesenho didático contra o validador REAL do core.
 * Uso: bun docs/aulas-interativas/qa/validar-manifestos.ts [filtro]
 */
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  isInteractiveBlock,
  isLearningManifest,
  SECTION_INTENTS,
} from '../../../packages/core/src/learning'
import { SCENE_IDS } from '../../../packages/core/src/learning/scene'
import { isSectionCompletion } from '../../../packages/core/src/learning/section-progression'
import { MANIFESTOS_NOVO_MODELO } from './novo-modelo'

/** Cena citada por um manifesto que o catálogo ainda não tem: dependência, não erro de formato. */
function cenasAusentes(m: Record<string, unknown>): string[] {
  const blocks = Array.isArray(m.blocks) ? (m.blocks as Record<string, unknown>[]) : []
  const faltando = new Set<string>()
  for (const b of blocks) {
    const c = b.content as Record<string, unknown> | undefined
    const a = c?.activity as Record<string, unknown> | undefined
    const cena = a?.scene
    if (typeof cena === 'string' && !(SCENE_IDS as readonly string[]).includes(cena))
      faltando.add(cena)
  }
  return [...faltando].sort()
}

const DIR = resolve(import.meta.dir, '../aulas')

const filtro = process.argv[2] ?? ''
const arquivos = readdirSync(DIR)
  .filter((f) => f.endsWith('.manifesto.json') && f.includes(filtro))
  .sort()

if (arquivos.length === 0 || (!filtro && arquivos.length !== 28)) {
  console.error(
    `Esperados ${filtro ? 'manifestos com o filtro' : '28 manifestos'}, encontrados ${arquivos.length} em ${DIR}`,
  )
  process.exit(1)
}

const CHAVE = /^[a-z][a-z0-9-]{0,79}$/
const texto = (v: unknown, max: number) => typeof v === 'string' && v.length > 0 && v.length <= max

/** Diz POR QUE o manifesto foi reprovado, campo a campo. */
function diagnosticar(m: Record<string, unknown>): string[] {
  const p: string[] = []
  if (m.version !== 5) p.push(`version=${String(m.version)} (esperado 5)`)
  if (!texto(m.courseSlug, 200)) p.push('courseSlug ausente ou longo demais')
  if (!texto(m.lessonSlug, 200)) p.push('lessonSlug ausente ou longo demais')
  if (!texto(m.title, 200)) p.push('title da aula ausente ou longo demais')

  const blocks = Array.isArray(m.blocks) ? (m.blocks as Record<string, unknown>[]) : []
  const sections = Array.isArray(m.sections) ? (m.sections as Record<string, unknown>[]) : []
  if (!Array.isArray(m.blocks)) p.push('blocks não é lista')
  if (!Array.isArray(m.sections)) p.push('sections não é lista')
  if (blocks.length > 200) p.push(`${blocks.length} blocos (máximo 200)`)
  if (sections.length === 0) p.push('nenhuma seção')
  if (sections.length > 59) p.push(`${sections.length} seções (máximo 59)`)

  for (const b of blocks) {
    const k = String(b.key)
    if (!CHAVE.test(k)) p.push(`chave de bloco inválida: "${k}"`)
    const formas = ['plannedVideo', 'content'].filter((f) => f in b)
    if (formas.length !== 1)
      p.push(
        `bloco "${k}": precisa de exatamente uma forma, tem ${formas.length} (${formas.join(', ') || 'nenhuma'})`,
      )
    if ('plannedVideo' in b && !texto(b.plannedVideo, 5000))
      p.push(`bloco "${k}": plannedVideo vazio ou acima de 5000 caracteres`)
    if ('existing' in b) p.push(`bloco "${k}": referência existing não é aceita`)
    if ('content' in b) {
      const c = b.content as Record<string, unknown>
      const kind = String(c?.kind)
      if (kind === 'dialogue') {
        if (!texto(c.text, 400))
          p.push(
            `bloco "${k}": dialogue.text vazio ou acima de 400 caracteres (tem ${String((c.text as string)?.length)})`,
          )
        if (
          c.pose !== undefined &&
          !['speaking', 'happy', 'thinking', 'celebrating'].includes(String(c.pose))
        )
          p.push(`bloco "${k}": pose inválida "${String(c.pose)}"`)
      } else if (kind === 'rich_text') {
        if (!texto(c.markdown, 50000))
          p.push(`bloco "${k}": rich_text.markdown vazio ou longo demais`)
      } else if (kind === 'interactive') {
        if (!isInteractiveBlock(c))
          p.push(
            `bloco "${k}": bloco interativo inválido (confira title, instructions, hints, activity, required)`,
          )
      } else if (kind === 'studio') {
        const project = c.initialProject as Record<string, unknown> | undefined
        if (
          !project ||
          !texto(project.name, 200) ||
          !project.files ||
          !Array.isArray(project.installedExtensions)
        )
          p.push(`bloco "${k}": projeto inicial do Estúdio inválido`)
      } else if (kind === 'pinta') {
        if (c.initialAsset === undefined) p.push(`bloco "${k}": desenho inicial do Pinta ausente`)
      } else if (kind === 'materials') {
        if (!Array.isArray(c.items)) p.push(`bloco "${k}": materials.items não é lista`)
      } else if (kind !== 'quiz' && kind !== 'certificate') {
        p.push(`bloco "${k}": content.kind desconhecido "${kind}"`)
      }
    }
  }

  for (const s of sections) {
    const k = String(s.key)
    if (!CHAVE.test(k)) p.push(`chave de seção inválida: "${k}"`)
    if (!texto(s.title, 200)) p.push(`seção "${k}": sem título ou acima de 200 caracteres`)
    if (typeof s.objective !== 'string' || s.objective.length > 2000)
      p.push(`seção "${k}": objective ausente ou acima de 2000 caracteres`)
    if (!SECTION_INTENTS.includes(s.intent as never))
      p.push(`seção "${k}": intent inválido "${String(s.intent)}"`)
    if (!Array.isArray(s.blockKeys)) p.push(`seção "${k}": blockKeys não é lista`)
    if (s.workspaceKey !== null && !CHAVE.test(String(s.workspaceKey)))
      p.push(`seção "${k}": workspaceKey inválido "${String(s.workspaceKey)}"`)
    if (s.externalTool !== null && s.externalTool !== 'estudio' && s.externalTool !== 'pinta')
      p.push(`seção "${k}": externalTool inválido "${String(s.externalTool)}"`)
    if (s.workspaceKey && s.externalTool) p.push(`seção "${k}": workspaceKey e externalTool juntos`)
    if (!Array.isArray(s.pendingMedia)) p.push(`seção "${k}": pendingMedia não é lista`)
    if (s.completion === undefined) p.push(`seção "${k}": sem completion (obrigatório na versão 5)`)
    else if (!isSectionCompletion(s.completion)) p.push(`seção "${k}": completion inválido`)
  }

  const bk = blocks.map((b) => String(b.key))
  const placed = sections.flatMap((s) =>
    Array.isArray(s.blockKeys) ? (s.blockKeys as string[]) : [],
  )
  const orfaos = bk.filter((k) => !placed.includes(k))
  const fantasmas = placed.filter((k) => !bk.includes(k))
  const repetidos = [...new Set(placed.filter((k, i) => placed.indexOf(k) !== i))]
  if (orfaos.length)
    p.push(`blocos declarados e não colocados em nenhuma seção: ${orfaos.join(', ')}`)
  if (fantasmas.length) p.push(`blockKeys sem bloco correspondente: ${fantasmas.join(', ')}`)
  if (repetidos.length) p.push(`blocos colocados em mais de uma seção: ${repetidos.join(', ')}`)
  if (new Set(bk).size !== bk.length) p.push('chaves de bloco repetidas')
  const sk = sections.map((s) => String(s.key))
  if (new Set(sk).size !== sk.length) p.push('chaves de seção repetidas')
  for (const s of sections)
    if (s.workspaceKey && !bk.includes(String(s.workspaceKey)))
      p.push(
        `seção "${String(s.key)}": workspaceKey "${String(s.workspaceKey)}" não existe em blocks`,
      )
  const retire = m.retireBlockKeys
  if (retire !== undefined) {
    if (!Array.isArray(retire)) p.push('retireBlockKeys não é lista')
    else {
      for (const k of retire as string[]) {
        if (!CHAVE.test(String(k))) p.push(`retireBlockKeys: chave inválida "${String(k)}"`)
        if (bk.includes(String(k))) p.push(`retireBlockKeys: "${String(k)}" também está em blocks`)
      }
      if (new Set(retire as string[]).size !== (retire as string[]).length)
        p.push('retireBlockKeys tem chave repetida')
    }
  }
  return p
}

/** Regras editoriais que só podem ser cobradas depois de cada aula passar pela migração humana. */
function diagnosticarNovoModelo(
  nome: string,
  m: { blocks: Array<Record<string, unknown>>; sections: Array<Record<string, unknown>> },
): string[] {
  if (!MANIFESTOS_NOVO_MODELO.has(nome)) return []
  const problemas: string[] = []
  const porChave = new Map(m.blocks.map((block) => [String(block.key), block]))

  for (const [indice, section] of m.sections.entries()) {
    const chave = String(section.key)
    const blockKeys = section.blockKeys as string[]
    const blocos = blockKeys.map((key) => porChave.get(key)).filter(Boolean) as Array<
      Record<string, unknown>
    >
    const conteudos = blocos.map((block) => ({
      key: String(block.key),
      plannedVideo: typeof block.plannedVideo === 'string',
      content: block.content as Record<string, unknown> | undefined,
    }))
    const videos = conteudos.filter((block) => block.plannedVideo)
    const dialogos = conteudos.filter((block) => block.content?.kind === 'dialogue')
    const quizzes = conteudos.filter((block) => block.content?.kind === 'quiz')
    const experiencias = conteudos.filter((block) => {
      const activity = block.content?.activity as Record<string, unknown> | undefined
      return block.content?.kind === 'interactive' && activity?.type === 'experimentation'
    })
    const completion = section.completion as {
      blockIds?: string[]
      projectChecks?: unknown[]
      platformAction?: unknown
    }
    const conclui = new Set(completion.blockIds ?? [])
    const posicao = (block: { key: string } | undefined) =>
      block ? blockKeys.indexOf(block.key) : -1

    if (videos.length > 1)
      problemas.push(`seção "${chave}": tem ${videos.length} vídeos; o máximo é um`)
    if (dialogos.length > 1)
      problemas.push(`seção "${chave}": tem ${dialogos.length} falas do Zappy; o máximo é uma`)

    if (quizzes.length) {
      if (
        quizzes.length !== 1 ||
        dialogos.length !== 1 ||
        conteudos.length !== 2 ||
        section.workspaceKey ||
        section.externalTool
      )
        problemas.push(
          `seção "${chave}": quiz deve ficar sozinho com uma fala introdutória do Zappy`,
        )
      if (!conclui.has(quizzes[0]?.key ?? ''))
        problemas.push(`seção "${chave}": o quiz não participa da conclusão`)
      const existeEntregaDepois = m.sections
        .slice(indice + 1)
        .some((seguinte) => seguinte.intent === 'delivery')
      if (!existeEntregaDepois)
        problemas.push(`seção "${chave}": o quiz deve vir antes da entrega final`)
    }

    if (experiencias.length) {
      if (videos.length !== 1)
        problemas.push(`seção "${chave}": conceito com experiência precisa de um vídeo`)
      if (dialogos.length !== 1)
        problemas.push(
          `seção "${chave}": conceito com experiência precisa de uma fala-ponte do Zappy`,
        )
      if (
        videos.length === 1 &&
        dialogos.length === 1 &&
        (posicao(videos[0]) > posicao(dialogos[0]) ||
          posicao(dialogos[0]) > posicao(experiencias[0]))
      )
        problemas.push(`seção "${chave}": a ordem deve ser vídeo, fala-ponte e experiência`)
      for (const bloco of [...videos, ...experiencias])
        if (!conclui.has(bloco.key))
          problemas.push(`seção "${chave}": conclusão não inclui "${bloco.key}"`)
    }

    if (section.workspaceKey || section.externalTool) {
      if (videos.length !== 1)
        problemas.push(`seção "${chave}": prática com ferramenta precisa de um vídeo`)
      if (section.intent === 'application') {
        if (dialogos.length !== 1)
          problemas.push(`seção "${chave}": prática guiada precisa de uma fala-tarefa do Zappy`)
        if (
          videos.length === 1 &&
          dialogos.length === 1 &&
          posicao(videos[0]) > posicao(dialogos[0])
        )
          problemas.push(`seção "${chave}": a fala-tarefa deve vir depois do vídeo`)
      }
      for (const video of videos)
        if (!conclui.has(video.key))
          problemas.push(`seção "${chave}": conclusão não inclui o vídeo "${video.key}"`)
      if (
        section.workspaceKey &&
        !conclui.has(String(section.workspaceKey)) &&
        !completion.projectChecks?.length
      )
        problemas.push(`seção "${chave}": conclusão não comprova a prática no projeto`)
      if (section.externalTool && !completion.platformAction)
        problemas.push(`seção "${chave}": conclusão não comprova a prática na ferramenta externa`)
    }
  }

  return problemas
}

let ok = 0
const falhas: string[] = []
const bloqueados: string[] = []
let avisosTotal = 0

for (const nome of arquivos) {
  let dados: unknown
  try {
    dados = JSON.parse(readFileSync(resolve(DIR, nome), 'utf8'))
  } catch (e) {
    falhas.push(`${nome}\n    JSON inválido: ${(e as Error).message}`)
    continue
  }

  if (!isLearningManifest(dados)) {
    const ausentes = cenasAusentes(dados as Record<string, unknown>)
    const motivos = diagnosticar(dados as Record<string, unknown>).filter(
      (m) => !(ausentes.length && m.includes('bloco interativo inválido')),
    )
    if (ausentes.length && motivos.length === 0) {
      bloqueados.push(
        `${nome}\n    depende de cena que o catálogo ainda não tem: ${ausentes.join(', ')}`,
      )
      continue
    }
    falhas.push(
      `${nome}\n    ${[...motivos, ...(ausentes.length ? [`(também depende das cenas ainda inexistentes: ${ausentes.join(', ')})`] : [])].join('\n    ') || '(schema recusou, mas nenhuma regra isolada falhou: revise à mão)'}`,
    )
    continue
  }

  const m = dados as {
    blocks: Array<Record<string, unknown>>
    sections: Array<Record<string, unknown>>
  }
  const avisos: string[] = []
  avisos.push(...diagnosticarNovoModelo(nome, m))
  for (const b of m.blocks)
    if (typeof b.plannedVideo === 'string' && !b.plannedVideo.startsWith('Título: '))
      avisos.push(`vídeo sem "Título: " na primeira linha: ${String(b.key)}`)

  const cena = new Set(
    m.blocks
      .filter((b) => {
        const c = b.content as Record<string, unknown> | undefined
        const a = c?.activity as Record<string, unknown> | undefined
        return (
          c?.kind === 'interactive' &&
          (a?.type === 'experimentation' || a?.type === 'demonstration')
        )
      })
      .map((b) => String(b.key)),
  )
  for (const s of m.sections) {
    const naDireita = (s.blockKeys as string[]).filter((k) => cena.has(k))
    const total = naDireita.length + (s.workspaceKey ? 1 : 0)
    if (total > 1)
      avisos.push(
        `seção "${String(s.key)}": ${total} blocos disputam a coluna da direita (${[...naDireita, s.workspaceKey ? `ferramenta ${String(s.workspaceKey)}` : ''].filter(Boolean).join(' + ')})`,
      )
    const c = s.completion as { blockIds?: string[]; projectChecks?: unknown[] } | undefined
    if (!c?.blockIds?.length && !c?.projectChecks?.length && !('platformAction' in (c ?? {})))
      avisos.push(`seção "${String(s.key)}": não conclui nada (completion vazio)`)
  }
  for (const k of cena) {
    const b = m.blocks.find((x) => String(x.key) === k)
    const c = b?.content as Record<string, unknown>
    const usada = m.sections.some((s) =>
      (s.completion as { blockIds?: string[] })?.blockIds?.includes(k),
    )
    if (usada && c?.required !== true)
      avisos.push(`cena "${k}" é critério de conclusão mas está com required: false`)
  }

  avisosTotal += avisos.length
  ok++
  console.log(
    `OK   ${nome}${avisos.length ? `\n     aviso: ${avisos.join('\n     aviso: ')}` : ''}`,
  )
}

console.log('')
console.log(
  `${ok} válidos, ${bloqueados.length} esperando cena nova, ${falhas.length} reprovados, de ${arquivos.length} manifestos. ${avisosTotal} avisos de convenção.`,
)
if (bloqueados.length) {
  console.log('')
  for (const b of bloqueados) console.log(`AGUARDA ${b}\n`)
}
if (falhas.length) {
  console.log('')
  for (const f of falhas) console.log(`FALHA ${f}\n`)
}
if (falhas.length || bloqueados.length || avisosTotal) process.exit(1)
