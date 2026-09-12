import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  EXPLORATION_DEFINITIONS,
  type ExplorationMission,
  type LearningManifest,
  type ProjectBlockPattern,
  type SectionProjectCheck,
  type SectionStructureRule,
} from '../../../packages/core/src/learning'

export type Check = SectionProjectCheck
type Rule = Extract<SectionStructureRule, { type: 'usesBlock' }>
export const p = (
  blockType: string,
  extra: Omit<ProjectBlockPattern, 'blockType'> = {},
): ProjectBlockPattern => ({ blockType, ...extra })
export const c = (
  id: string,
  label: string,
  blockType: string,
  extra: Omit<Rule, 'type' | 'blockType'> = {},
): Check => ({ id, label, rule: { type: 'usesBlock', blockType, ...extra } })
export const frame = 'sz_g2d_update_each_frame'
export const timer = 'sz_g2d_every_seconds'
export const iff = 'sz_js_if_else'
export const scene = (name: string) => p('sz_g2d_scene_is', { fields: { SCENE: name } })
export const inLoop = { area: 'loops' as const, withinBlock: frame }
export const absent = (id: string, title: string, block: string) =>
  c(id, title, block, { count: 0 })
export const guarded = (action: ProjectBlockPattern, name = 'jogando') =>
  p(iff, { inputBlocks: { COND: scene(name), THEN: action } })

export interface Step {
  key: string
  title: string
  kind: 'build' | 'observe' | 'experiment'
  focus: string
  reason: string
  say: string
  part?: number
  from?: string
  to?: string
  edit?: string
  visual?: string
  mission?: ExplorationMission
  checks?: Check[]
}
export interface Recipe {
  title: string
  entry: string
  exit: string
  steps: Step[]
  finalChecks: Check[]
  test: string
  corrections: string[]
  quiz: [string, string, string, string][] // question, correct, distractor, explanation
}
export type SourcePart = { heading: string; narration: string; stage: string }
export function readOriginal(directory: string, lesson: number) {
  const file = `roteiro-aula-${String(lesson).padStart(2, '0')}-corre-dino.md`
  const raw = readFileSync(resolve(directory, file), 'utf8')
  const parts: SourcePart[] = raw
    .split(/^## /m)
    .slice(1)
    .map((chunk) => {
      const [heading, ...body] = chunk.split(/\r?\n/)
      const text = body.join('\n')
      const split = text.split('**Narração:**')
      return {
        heading: heading!.trim(),
        stage: split[0]!.trim(),
        narration: (split[1] ?? '').trim().replace(/^"|"$/g, ''),
      }
    })
  return { file, hash: createHash('sha256').update(raw).digest('hex'), parts }
}
const plain = (s: string) => s.replaceAll('**', '').replace(/\s+/g, ' ').trim()

export function buildEditorial(
  source: LearningManifest,
  recipe: Recipe,
  original: ReturnType<typeof readOriginal>,
) {
  const manifest = structuredClone(source)
  const workspace = manifest.blocks.find((block) => block.key === 'projeto')
  const oldQuiz = manifest.blocks.find((block) => block.key === 'quiz-final')
  if (!workspace || !oldQuiz || !('content' in oldQuiz) || oldQuiz.content.kind !== 'quiz')
    throw new Error('Projeto/quiz ausente')
  const quiz = structuredClone(oldQuiz)
  if (!('content' in quiz) || quiz.content.kind !== 'quiz') throw new Error('Quiz ausente')
  quiz.content.questions = recipe.quiz.map(([prompt, correct, wrong, explanation], index) => ({
    id: `q${index + 1}`,
    prompt,
    choices:
      index % 2
        ? [
            { id: 'b', label: wrong },
            { id: 'a', label: correct },
          ]
        : [
            { id: 'a', label: correct },
            { id: 'b', label: wrong },
          ],
    correctChoiceIds: ['a'],
    explanation,
  }))
  const blocks: LearningManifest['blocks'] = [workspace, quiz]
  const sections: LearningManifest['sections'] = []
  const clips: Array<{
    key: string
    sourceFile: string
    sourceSection: string
    entry: string
    exit: string
    edit: string
    narration: string
    visual: string
    newNarration: string
    production: string
    inSeconds: null
    outSeconds: null
  }> = []
  function video(
    key: string,
    part: SourcePart,
    edit: string,
    newNarration = '',
    visual?: string,
    from?: string,
    to?: string,
  ) {
    const spoken = plain(part.narration)
    const begin = from ? spoken.indexOf(plain(from)) : 0
    const end = to ? spoken.indexOf(plain(to), begin) + plain(to).length : spoken.length
    if (begin < 0 || end <= begin || (to && !spoken.includes(plain(to))))
      throw new Error(`Âncora inválida: ${original.file}/${key}`)
    const narration = spoken.slice(begin, end)
    const clip = {
      key,
      sourceFile: original.file,
      sourceSection: part.heading,
      entry: narration.slice(0, 100),
      exit: narration.slice(-100),
      edit,
      narration,
      visual: visual ?? part.stage,
      newNarration,
      production: visual || newNarration ? 'recorte-e-complemento' : 'recorte',
      inSeconds: null,
      outSeconds: null,
    }
    clips.push(clip)
    blocks.push({
      key,
      plannedVideo: `Fonte: ${original.file}, ${part.heading}. Entrada: “${clip.entry}”. Saída: “${clip.exit}”. ${edit} ${newNarration ? `Ponte nova: “${newNarration}”` : ''} ${visual ?? ''} Conferir timecodes no vídeo original; roteiro completo em montagem.json.`,
    })
    return key
  }
  function section(
    key: string,
    title: string,
    intent: LearningManifest['sections'][number]['intent'],
    objective: string,
    keys: string[],
    checks?: Check[],
  ) {
    sections.push({
      key,
      title,
      intent,
      objective,
      blockKeys: keys,
      workspaceKey: checks ? 'projeto' : null,
      externalTool: null,
      pendingMedia: [],
      completion: {
        version: 1,
        blockIds: checks ? [] : keys.filter((k) => !k.startsWith('fala-')),
        ...(checks ? { projectChecks: checks } : {}),
      },
    })
  }
  const opening = original.parts.find((part) => part.heading.startsWith('Abertura'))!
  const closing = original.parts.find((part) => part.heading.startsWith('Fecho'))!
  section('abertura-editorial', 'O que vamos fazer hoje', 'presentation', recipe.entry, [
    video(
      'video-abertura-editorial',
      opening,
      'Reaproveitar a retomada e o resultado de hoje. Trocar convites a exploração livre pela missão delimitada abaixo.',
      recipe.entry,
    ),
  ])
  for (const step of recipe.steps) {
    if (step.kind === 'experiment') {
      if (!step.mission) throw new Error(`Missão ausente: ${step.key}`)
      const definition = EXPLORATION_DEFINITIONS[step.mission]
      const key = `experiencia-${step.key}`
      blocks.push({
        key,
        content: {
          kind: 'interactive',
          title: step.title,
          instructions: step.say,
          hints: [...definition.hints],
          required: false,
          activity: { type: 'exploration', version: 3, mission: step.mission, mode: 'explore' },
        },
      })
      section(step.key, step.title, 'exploration', step.focus, [key])
    } else {
      const part = original.parts.find((part) => part.heading.startsWith(`Parte ${step.part}.`))
      if (!part) throw new Error(`Parte ausente: ${step.key}`)
      const key = video(
        `video-${step.key}`,
        part,
        step.edit ?? '',
        step.say,
        step.visual,
        step.from,
        step.to,
      )
      if (step.kind === 'observe') section(step.key, step.title, 'demonstration', step.focus, [key])
      else {
        blocks.push({
          key: `fala-${step.key}`,
          content: { kind: 'dialogue', pose: 'speaking', text: step.say },
        })
        section(
          step.key,
          step.title,
          'application',
          step.focus,
          [key, `fala-${step.key}`],
          step.checks,
        )
      }
    }
  }
  blocks.push({
    key: 'fala-entrega-editorial',
    content: {
      kind: 'dialogue',
      pose: 'speaking',
      text: `${recipe.test} Confira os objetivos e envie o projeto ao professor.`,
    },
  })
  section(
    'entrega-editorial',
    'Teste e entregue sua construção',
    'delivery',
    recipe.exit,
    ['fala-entrega-editorial', 'projeto'],
    recipe.finalChecks,
  )
  sections.at(-1)!.completion!.blockIds = ['projeto']
  section('fecho-editorial', 'Veja o que você aprendeu', 'closing', recipe.exit, [
    video(
      'video-fecho-editorial',
      closing,
      `Manter a recapitulação. ${recipe.corrections.join(' ')} Terminar indicando o quiz, sem abrir desafios extras.`,
      'Sua construção está guardada. Agora responda três perguntas curtas sobre o que mudou hoje.',
    ),
  ])
  section(
    'quiz-editorial',
    'Confira as ideias de hoje',
    'closing',
    'Explicar as relações que acabamos de construir.',
    ['quiz-final'],
  )
  manifest.title = recipe.title
  manifest.blocks = blocks
  manifest.sections = sections
  manifest.retireBlockKeys = [
    ...new Set([...(source.retireBlockKeys ?? []), ...source.blocks.map((b) => b.key)]),
  ].filter((key) => !blocks.some((b) => b.key === key))
  return {
    manifest,
    montage: {
      sourceFile: original.file,
      sourceHash: original.hash,
      status: 'Âncoras do roteiro conferidas. Timecodes e edição dependem dos vídeos gravados.',
      clips,
    },
    recipe,
  }
}

export function editorialMarkdown(result: ReturnType<typeof buildEditorial>) {
  const { manifest, recipe, montage } = result
  const text = [
    `# ${manifest.lessonSlug} — ${recipe.title}`,
    '',
    'Revisão baseada no roteiro original gravado. Demonstração é observação; experimentação é uma atividade separada e delimitada. Todas as construções usam o mesmo Estúdio da aula.',
    '',
    `**Entrada:** ${recipe.entry}`,
    '',
    `**Saída esperada:** ${recipe.exit}`,
    '',
    '**Vídeos:** as falas abaixo são material de montagem por âncoras, não timecodes. O editor deve aplicar os cortes e as substituições indicados antes de exportar cada clipe. Não concatenar automaticamente a fala original inteira com a ponte nova.',
    '',
    '## Percurso da criança',
    '',
    '| Seção | Experiência | Objetivo |',
    '| --- | --- | --- |',
    ...manifest.sections.map(
      (s, index) => `| ${index + 1}. ${s.title} | ${s.intent} | ${s.objective} |`,
    ),
    '',
    '## Decisões e roteiro de cada seção',
    '',
  ]
  for (const step of recipe.steps) {
    text.push(
      `### ${step.title}`,
      '',
      `**Por que aqui:** ${step.reason}`,
      '',
      `**Foco:** ${step.focus}`,
      '',
      `**Fala de ligação / orientação ao aluno:** “${step.say}”`,
      '',
    )
    if (step.kind === 'experiment') {
      const definition = EXPLORATION_DEFINITIONS[step.mission!]
      text.push(
        `**Experiência nativa:** ${step.mission}. Modelo didático separado do projeto; não promete reproduzir todos os números e a física do Estúdio.`,
        '',
        `**Conclusão observável:** ${definition.goals.map((goal) => goal.label).join('; ')}.`,
        '',
        '**Interação:** usar apenas os controles desta missão. Ajudas em três níveis conduzem ao mesmo objetivo. Ao concluir, oferecer continuar ou rever; não acrescentar outra missão.',
        '',
      )
    } else {
      const clip = montage.clips.find((clip) => clip.key === `video-${step.key}`)!
      text.push(
        `**Fonte:** ${clip.sourceFile} → ${clip.sourceSection}.`,
        '',
        `**Montagem:** ${clip.edit}`,
        '',
        `**Na tela:** ${clip.visual}`,
        '',
        `**Trecho original selecionado, antes da edição:** ${clip.narration}`,
        '',
      )
      if (step.kind === 'observe')
        text.push(
          '**Aluno:** assiste, pausa ou revê. Sem alterar parâmetros e sem converter esta seção em experimentação. Conclui com 90% do clipe assistido.',
          '',
        )
      else
        text.push(
          '**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.',
          '',
          '**Critérios automáticos:**',
          '',
          ...(step.checks ?? []).map((check) => `- ${check.label}`),
          '',
          '**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.',
          '',
        )
    }
  }
  text.push(
    '## Conferência final e quiz',
    '',
    recipe.test,
    '',
    '**Critérios da entrega:**',
    '',
    ...recipe.finalChecks.map((check) => `- ${check.label}`),
    '',
    ...recipe.quiz.flatMap(([question, correct, wrong, explanation]) => [
      `**${question}**`,
      '',
      `- ${correct} (correta)`,
      `- ${wrong}`,
      '',
      explanation,
      '',
    ]),
    '## Orientação ao professor e à edição',
    '',
    ...recipe.corrections.map((correction) => `- ${correction}`),
    '',
    'O professor acompanha os objetivos e a entrega, confere o comportamento descrito acima e intervém no ponto da dificuldade. A checagem estrutural verifica a montagem; não equivale a uma prova automática de jogabilidade, contraste ou áudio.',
    '',
    `Fonte íntegra conferida por SHA-256: ${montage.sourceHash}. O mapa de cortes completo, com entrada, saída e novas falas, está em [montagem.json](montagem.json).`,
    '',
  )
  return text.join('\n')
}
