import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  isLearningManifest,
  type LearningManifest,
  type SectionProjectCheck,
} from '../../../packages/core/src/learning'
import { experimentHtml, experiments } from './desafio-interacoes'

export type Question = [string, string, string, string]
export interface Step {
  key: string
  title: string
  kind: 'build' | 'observe' | 'experiment'
  source: string
  from?: string
  to?: string
  focus: string
  reason: string
  say: string
  edit: string
  visual: string
  help: string
  checks?: SectionProjectCheck[]
  experiment?: keyof typeof experiments
  question?: Question
}
export interface Recipe {
  title: string
  entry: string
  exit: string
  minutes: string
  opening: string
  closing: string
  steps: Step[]
  test: string
  finalChecks: SectionProjectCheck[]
  corrections: string[]
  omitted?: Record<string, string>
  quiz: Question[]
}
export const plain = (s: string) => s.replaceAll('**', '').replace(/\s+/g, ' ').trim()
export function originalOf(directory: string, day: number) {
  const file = `roteiro-aula-${day ? `dia${day}` : 'introdutoria'}-desafio-primeiro-jogo.md`
  const raw = readFileSync(resolve(directory, file), 'utf8')
  const parts = raw
    .split(/^#{2,3} /m)
    .slice(1)
    .map((chunk) => {
      const [heading, ...lines] = chunk.split(/\r?\n/)
      const text = lines.join('\n')
      const split = text.search(/\*\*Narração(?: de abertura da parte)?:\*\*/)
      return {
        heading: heading!.trim(),
        stage: split < 0 ? text.trim() : text.slice(0, split).trim(),
        narration:
          split < 0
            ? ''
            : plain(
                text.slice(split).replace(/^\*\*Narração(?: de abertura da parte)?:\*\*/, ''),
              ).replace(/^"|"$/g, ''),
      }
    })
  return { file, hash: createHash('sha256').update(raw).digest('hex'), parts }
}
export function buildLesson(day: number, recipe: Recipe, original: ReturnType<typeof originalOf>) {
  const slug = day ? `dia-${day}` : 'introducao'
  const previous: LearningManifest = JSON.parse(
    readFileSync(
      resolve(import.meta.dir, `../desafio-primeiro-jogo/${slug}/manifesto.json`),
      'utf8',
    ),
  )
  const blocks: LearningManifest['blocks'] = day
    ? [{ key: 'projeto', existing: { kind: 'studio', index: 0 } }]
    : []
  const sections: LearningManifest['sections'] = []
  const clips: Array<{
    key: string
    sourceFile: string
    sourceSection: string
    entry: string
    exit: string
    narration: string
    edit: string
    visual: string
    newNarration: string
    inSeconds: null
    outSeconds: null
  }> = []
  function video(
    key: string,
    source: string,
    edit: string,
    visual: string,
    say: string,
    from?: string,
    to?: string,
  ) {
    const part = original.parts.find((p) => p.heading.startsWith(source))
    if (!part?.narration) throw new Error(`${slug}/${key}: fonte ausente ${source}`)
    const start = from ? part.narration.indexOf(plain(from)) : 0
    const end = to ? part.narration.indexOf(plain(to), Math.max(0, start)) : part.narration.length
    if (start < 0 || end < start) throw new Error(`${slug}/${key}: âncora inválida`)
    const narration = part.narration.slice(start, to ? end + plain(to).length : end)
    clips.push({
      key,
      sourceFile: original.file,
      sourceSection: part.heading,
      entry: narration.slice(0, 100),
      exit: narration.slice(-100),
      narration,
      edit,
      visual,
      newNarration: say,
      inSeconds: null,
      outSeconds: null,
    })
    blocks.push({
      key,
      plannedVideo: `${original.file} → ${part.heading}. Entrada: “${narration.slice(0, 100)}”. Saída: “${narration.slice(-100)}”. ${edit} Fala complementar: “${say}” Montagem e imagem em montagem.json. Conferir tempos na gravação.`,
    })
    return key
  }
  function section(
    key: string,
    title: string,
    intent: LearningManifest['sections'][number]['intent'],
    objective: string,
    keys: string[],
    checks?: SectionProjectCheck[],
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
        blockIds: checks ? [] : keys,
        ...(checks ? { projectChecks: checks } : {}),
      },
    })
  }
  section('abertura-v6', 'O que vamos fazer hoje', 'presentation', recipe.entry, [
    video(
      'video-abertura-v6',
      'Abertura',
      'Manter a apresentação do resultado; substituir a enumeração antiga de passos. Usar somente a abertura curta revisada, sem repetir a fala inteira.',
      'Jogo no resultado possível ao final deste dia; na introdução, entrada do curso.',
      recipe.opening,
    ),
  ])
  for (const step of recipe.steps) {
    if (step.kind === 'experiment') {
      if (!step.experiment || !step.question) throw new Error(`Experimento incompleto: ${step.key}`)
      const [prompt, correct, wrong, explanation] = step.question
      const key = `experiencia-${step.key}`
      blocks.push({
        key,
        content: {
          kind: 'interactive',
          title: step.title,
          instructions: step.say,
          hints: [step.help],
          required: false,
          activity: { type: 'html', html: experimentHtml(step.experiment) },
          checkpoint: {
            prompt,
            choices: [
              { id: 'a', label: correct },
              { id: 'b', label: wrong },
            ].sort((a, b) => (day % 2 ? b.id.localeCompare(a.id) : a.id.localeCompare(b.id))),
            correctChoiceId: 'a',
            explanation,
          },
        },
      })
      section(step.key, step.title, 'exploration', step.focus, [key])
    } else {
      const key = video(
        `video-${step.key}`,
        step.source,
        step.edit,
        step.visual,
        step.say,
        step.from,
        step.to,
      )
      if (step.kind === 'observe') section(step.key, step.title, 'demonstration', step.focus, [key])
      else {
        if (!step.checks?.length) throw new Error(`Construção sem critério: ${step.key}`)
        const instruction = `fala-${step.key}`
        blocks.push({
          key: instruction,
          content: { kind: 'dialogue', pose: 'speaking', text: step.say },
        })
        section(step.key, step.title, 'application', step.focus, [key, instruction], step.checks)
      }
    }
  }
  if (day) {
    blocks.push({ key: 'entrega-fala-v6', content: { kind: 'rich_text', markdown: recipe.test } })
    section(
      'entrega-v6',
      day === 5 ? 'Teste, entregue e compartilhe' : 'Teste e envie sua construção',
      'delivery',
      recipe.exit,
      ['entrega-fala-v6', 'projeto'],
      recipe.finalChecks,
    )
    sections.at(-1)!.completion!.blockIds = ['projeto']
  }
  section('fecho-v6', 'Veja o que você construiu', 'closing', recipe.exit, [
    video(
      'video-fecho-v6',
      'Fecho',
      'Reaproveitar a conquista. Substituir o resumo numerado e convites abertos pela fala curta revisada. No Dia 5, não afirmar que a publicação já ocorreu.',
      'Resultado do dia e convite para duas perguntas finais.',
      recipe.closing,
    ),
  ])
  blocks.push({
    key: 'quiz-v6',
    content: {
      kind: 'quiz',
      passingScore: 100,
      questions: recipe.quiz.map(([prompt, correct, wrong, explanation], i) => ({
        id: `q${i + 1}`,
        prompt,
        choices: [
          { id: 'a', label: correct },
          { id: 'b', label: wrong },
        ].sort((a, b) => (i % 2 ? b.id.localeCompare(a.id) : a.id.localeCompare(b.id))),
        correctChoiceIds: ['a'],
        explanation,
      })),
    },
  })
  section(
    'quiz-v6',
    'Hora do Desafio',
    'closing',
    'Reconhecer duas relações importantes desta aula.',
    ['quiz-v6'],
  )
  const manifest: LearningManifest = {
    version: 4,
    courseSlug: previous.courseSlug,
    lessonSlug: previous.lessonSlug,
    title: recipe.title,
    blocks,
    sections,
    retireBlockKeys: [
      ...new Set([...(previous.retireBlockKeys ?? []), ...previous.blocks.map((b) => b.key)]),
    ].filter((key) => !blocks.some((b) => b.key === key)),
  }
  if (!isLearningManifest(manifest)) throw new Error(`Manifesto inválido: ${slug}`)
  const sourceReview = original.parts.map((part) => ({
    heading: part.heading,
    clips: clips.filter((c) => c.sourceSection === part.heading).map((c) => c.key),
    decision:
      recipe.omitted?.[part.heading] ??
      (part.heading === 'Especificações'
        ? 'Referência de formato e ritmo; a duração interativa é estimada separadamente.'
        : clips.some((c) => c.sourceSection === part.heading)
          ? 'Recortar com as substituições e imagens indicadas.'
          : recipe.steps.some((s) => part.heading.startsWith(s.source))
            ? 'Conceito transposto para a experiência separada; não repetir a explicação inteira.'
            : 'Consultar as decisões editoriais desta aula antes de reaproveitar; não inserir automaticamente.'),
  }))
  return {
    manifest,
    recipe,
    montage: {
      sourceFile: original.file,
      sourceHash: original.hash,
      status: 'Roteiro conferido; tempos, imagens atuais e edição pendentes de montagem.',
      clips,
      sourceReview,
    },
  }
}
export function scriptMarkdown(result: ReturnType<typeof buildLesson>) {
  const { manifest: m, recipe: r, montage } = result
  const labels = {
    presentation: 'Assistir',
    demonstration: 'Observar',
    exploration: 'Experimentar',
    application: 'Fazer no Estúdio',
    delivery: 'Entregar',
    closing: 'Fechar',
    explanation: 'Entender',
    material: 'Consultar',
  }
  return [
    `# ${m.lessonSlug} — ${r.title}`,
    '',
    `**Entrada:** ${r.entry}`,
    '',
    `**Resultado:** ${r.exit}`,
    '',
    `**Tempo de percurso estimado:** ${r.minutes}. Estimativa editorial incluindo montagem; validar com crianças. Não é duração medida dos vídeos.`,
    '',
    'A demonstração tem apenas vídeo, com pausa e repetição. O experimento é separado do projeto e tem uma comparação finita. A construção usa o mesmo Estúdio da aula, sem reiniciar a cada seção.',
    '',
    '## Percurso',
    '',
    '| Seção | O que aparece | Objetivo |',
    '| --- | --- | --- |',
    ...m.sections.map(
      (s, i) => `| ${i + 1}. ${s.title} | ${labels[s.intent ?? 'explanation']} | ${s.objective} |`,
    ),
    '',
    '## Abertura',
    '',
    `“${r.opening}”`,
    '',
    ...r.steps.flatMap((s) => {
      const clip = montage.clips.find((c) => c.key === `video-${s.key}`)
      return [
        `## ${s.title}`,
        '',
        `**Por que aqui:** ${s.reason}`,
        '',
        `**Foco:** ${s.focus}`,
        '',
        `**Fala revisada / orientação:** “${s.say}”`,
        '',
        `**Imagem:** ${s.visual}`,
        '',
        ...(s.kind === 'experiment'
          ? [
              `**Controles:** ${experiments[s.experiment!].options.join(' ou ')}; ${experiments[s.experiment!].steps === 1 ? 'mostrar cada posição uma vez' : 'avançar os três passos de cada comparação'}. Só essas duas situações. Resultado fica guardado; ao terminar, controles se encerram. Não altera o Estúdio.`,
              '',
              '**Conclusão:** registrar as duas situações e acertar a pergunta externa ao quadro. Estado HTML é participação informada pelo cliente; a resposta é corrigida no servidor, sem alegar auditoria dos comandos.',
              '',
              `**Pergunta:** ${s.question![0]}`,
              '',
              `**Resposta:** ${s.question![1]}. ${s.question![3]}`,
              '',
            ]
          : [
              `**Fonte:** ${clip!.sourceFile} → ${clip!.sourceSection}.`,
              '',
              `**Montagem:** ${s.edit}`,
              '',
              `**Trecho original antes da edição:** ${clip!.narration}`,
              '',
              s.kind === 'observe'
                ? '**Conclusão:** 90% do clipe assistido. Pausar e rever são as únicas opções. O vídeo não abre controles de experimentar.'
                : '**Conclusão:** construir e usar a conferência da etapa. O vídeo orienta; os encaixes ativos do projeto são verificados.',
              '',
              ...(s.checks ?? []).map((c) => `- ${c.label}`),
              '',
            ]),
        `**Ajuda no mesmo objetivo:** ${s.help}`,
        '',
      ]
    }),
    '## Teste final e acompanhamento',
    '',
    r.test,
    '',
    ...r.finalChecks.map((c) => `- ${c.label}`),
    '',
    'Os critérios verificam estrutura, valores e relações indicados; o professor confere o jogo rodando, legibilidade, som e resultado. Não prometer avaliação automática de toda a jogabilidade.',
    '',
    '## Fecho e quiz',
    '',
    `“${r.closing}”`,
    '',
    ...r.quiz.flatMap(([q, a, b, why]) => [
      `**${q}**`,
      '',
      `- ${a} (correta)`,
      `- ${b}`,
      '',
      why,
      '',
    ]),
    '## Decisões para edição e professor',
    '',
    ...r.corrections.map((c) => `- ${c}`),
    '',
    '## Destino de todo o roteiro original',
    '',
    ...montage.sourceReview.map(
      (s) =>
        `- **${s.heading}:** ${s.decision} ${s.clips.length ? `Clipes: ${s.clips.join(', ')}.` : ''}`,
    ),
    '',
    `Fonte preservada, SHA-256: ${montage.sourceHash}. [Mapa de montagem](montagem.json) com âncoras textuais, falas novas e imagens. Os tempos ficam nulos até conferir a gravação. Cortes substituem falas; não concatenar toda a narração original com todos os complementos.`,
    '',
  ].join('\n')
}
