import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { isLearningManifest, type LearningManifest } from '../../../packages/core/src/learning'

export type Question = [prompt: string, correct: string, wrong: string, explanation: string]
export interface Step {
  key: string
  title: string
  kind: 'build' | 'observe' | 'experiment'
  part: number
  from?: string
  to?: string
  focus: string
  reason: string
  say: string
  edit: string
  visual: string
  criteria: string[]
  help: string
  question?: Question
  experiment?: 'espelho' | 'quadros' | 'bordas' | 'ordem' | 'folha'
}
export interface Recipe {
  title: string
  tool: 'estudio' | 'pinta'
  entry: string
  exit: string
  opening: string
  closing: string
  choices: string
  steps: Step[]
  delivery: string
  rubric: string[]
  corrections: string[]
  quiz: Question[]
}
export const plain = (s: string) => s.replaceAll('**', '').replace(/\s+/g, ' ').trim()
export function originalOf(directory: string, lesson: number) {
  const file = `roteiro-aula-${String(lesson).padStart(2, '0')}-o-jogo-do-meu-jeito.md`
  const raw = readFileSync(resolve(directory, file), 'utf8')
  const parts = raw
    .split(/^## /m)
    .slice(1)
    .map((chunk) => {
      const [heading, ...lines] = chunk.split(/\r?\n/)
      const [stage, narration = ''] = lines.join('\n').split('**Narração:**')
      return {
        heading: heading!.trim(),
        stage: stage!.trim(),
        narration: plain(narration)
          .replace(/^"|"$/g, '')
          .replace(/\s*---$/, '')
          .trim(),
      }
    })
  return { file, hash: createHash('sha256').update(raw).digest('hex'), parts }
}

export function buildLesson(
  lesson: number,
  recipe: Recipe,
  original: ReturnType<typeof originalOf>,
) {
  const root = resolve(import.meta.dir, '..')
  const slug = `aula-${String(lesson).padStart(2, '0')}`
  const previous = JSON.parse(
    readFileSync(resolve(root, 'o-jogo-do-meu-jeito', slug, 'manifesto.json'), 'utf8'),
  ) as LearningManifest
  const blocks: LearningManifest['blocks'] = []
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
    heading: string,
    edit: string,
    visual: string,
    say: string,
    from?: string,
    to?: string,
  ) {
    const part = original.parts.find((p) => p.heading.startsWith(heading))
    if (!part?.narration) throw new Error(`${slug}: fonte ausente ${heading}`)
    const start = from ? part.narration.indexOf(plain(from)) : 0
    const stop = to ? part.narration.indexOf(plain(to), Math.max(0, start)) : part.narration.length
    if (start < 0 || stop < start)
      throw new Error(`${slug}/${key}: âncoras inválidas (${from} / ${to})`)
    const narration = part.narration.slice(start, to ? stop + plain(to).length : stop)
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
      plannedVideo: `${original.file} → ${part.heading}. Entrada: “${narration.slice(0, 100)}”. Saída: “${narration.slice(-100)}”. ${edit} Complemento: “${say}” Ver montagem.json para imagem, cortes e substituições. Timecodes a conferir no vídeo gravado.`,
    })
    return key
  }
  function section(
    key: string,
    title: string,
    intent: LearningManifest['sections'][number]['intent'],
    objective: string,
    keys: string[],
    completion: string[],
    tool: Recipe['tool'] | null = null,
  ) {
    sections.push({
      key,
      title,
      intent,
      objective,
      blockKeys: keys,
      workspaceKey: null,
      externalTool: tool,
      pendingMedia: [],
      completion: { version: 1, blockIds: completion },
    })
  }
  function checkpoint(
    key: string,
    question: Question,
    instructions: string,
    help: string,
    html?: string,
  ) {
    const [prompt, correct, wrong, explanation] = question
    const correctId = blocks.length % 2 ? 'opcao-2' : 'opcao-1'
    const choices = [
      { id: correctId, label: correct },
      { id: correctId === 'opcao-1' ? 'opcao-2' : 'opcao-1', label: wrong },
    ].sort((a, b) => a.id.localeCompare(b.id))
    blocks.push({
      key,
      content: {
        kind: 'interactive',
        title: html ? 'Compare e explique' : 'Confira esta ideia',
        instructions,
        hints: [help],
        required: false,
        activity: html ? { type: 'html', html } : { type: 'checkpoint' },
        checkpoint: { prompt, choices, correctChoiceId: correctId, explanation },
      },
    })
    return key
  }
  const intro = video(
    'video-abertura-v6',
    'Abertura',
    'Preservar a retomada e a vitória do dia; substituir a contagem antiga de passos pela fala de abertura revisada. Remover promessas de desbloqueios específicos não confirmados no perfil.',
    'Mostrar primeiro o resultado de hoje, sem antecipar ferramentas ou detalhes de outras aulas.',
    recipe.opening,
  )
  section('abertura-v6', 'O que vamos criar hoje', 'presentation', recipe.entry, [intro], [intro])
  for (const step of recipe.steps) {
    if (step.kind === 'experiment') {
      if (!step.experiment || !step.question) throw new Error(`Experimento incompleto: ${step.key}`)
      const html = readFileSync(
        resolve(root, 'o-jogo-do-meu-jeito-v6', 'interacoes', `${step.experiment}.html`),
        'utf8',
      )
      const key = checkpoint(`experimento-${step.key}`, step.question, step.say, step.help, html)
      section(step.key, step.title, 'exploration', step.focus, [key], [key])
      continue
    }
    const key = video(
      `video-${step.key}`,
      `Parte ${step.part}.`,
      step.edit,
      step.visual,
      step.say,
      step.from,
      step.to,
    )
    if (step.kind === 'observe') {
      section(step.key, step.title, 'demonstration', step.focus, [key], [key])
      continue
    }
    if (!step.question) throw new Error(`Pergunta ausente: ${step.key}`)
    const guide = `orientacao-${step.key}`
    blocks.push({
      key: guide,
      content: {
        kind: 'rich_text',
        markdown: `${step.say}\n\n**Antes de voltar à aula, confira:**\n\n${step.criteria.map((s) => `- ${s}`).join('\n')}\n\n${step.help}\n\nPause o vídeo e use **Abrir ${recipe.tool === 'pinta' ? 'meu Pinta' : 'meu Estúdio'}**. Continue na mesma aba da ferramenta e volte a esta aba quando terminar.`,
      },
    })
    const check = checkpoint(
      `conferir-${step.key}`,
      step.question,
      'Depois de fazer e conferir seu trabalho na ferramenta, responda esta pergunta sobre o que acabou de usar.',
      step.help,
    )
    section(
      step.key,
      step.title,
      'application',
      step.focus,
      [key, guide, check],
      [check],
      recipe.tool,
    )
  }
  const deliveryKey = 'entrega-galeria-v6'
  blocks.push({
    key: 'orientacao-entrega-v6',
    content: {
      kind: 'rich_text',
      markdown: `${recipe.delivery}\n\n**Confira na sua criação:**\n\n${recipe.rubric.map((s) => `- ${s}`).join('\n')}\n\nEspere **Guardado na sua conta**, escolha a criação abaixo e envie ao professor. Se ainda não estiver na lista, confira o salvamento e tente carregar a lista novamente. O envio guarda uma cópia deste momento; você continua criando na ferramenta.`,
    },
  })
  blocks.push({
    key: deliveryKey,
    existing: { kind: recipe.tool === 'estudio' ? 'studio' : 'pinta', index: 0 },
  })
  section(
    'entrega-v6',
    'Confira e envie sua criação',
    'delivery',
    recipe.exit,
    ['orientacao-entrega-v6', deliveryKey],
    [deliveryKey],
    recipe.tool,
  )
  const closing = video(
    'video-fecho-v6',
    'Fecho',
    `Reaproveitar a recapitulação, ajustando: ${recipe.corrections.join(' ')} Trocar o encerramento pela fala revisada; não acrescentar tarefas extras para passar.`,
    'Retomar o antes e o depois da criação, sem animação decorativa atrás de texto. Finalizar com o resultado desta aula.',
    recipe.closing,
  )
  section('fecho-v6', 'Veja o que você aprendeu', 'closing', recipe.exit, [closing], [closing])
  blocks.push({
    key: 'quiz-v6',
    content: {
      kind: 'quiz',
      passingScore: 100,
      questions: recipe.quiz.map(([prompt, correct, wrong, explanation], i) => ({
        id: `q${i + 1}`,
        prompt,
        choices:
          i % 2
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
      })),
    },
  })
  section(
    'quiz-v6',
    'Duas ideias para guardar',
    'closing',
    'Aplicar as ideias da aula em duas situações curtas. Pode consultar as pistas e tentar novamente.',
    ['quiz-v6'],
    ['quiz-v6'],
  )
  const manifest: LearningManifest = {
    version: 4,
    courseSlug: previous.courseSlug,
    lessonSlug: previous.lessonSlug,
    title: recipe.title,
    retireBlockKeys: previous.blocks
      .map((b) => b.key)
      .filter((key) => !blocks.some((b) => b.key === key)),
    blocks,
    sections,
  }
  if (!isLearningManifest(manifest)) throw new Error(`Manifesto inválido: ${slug}`)
  const montage = {
    sourceFile: original.file,
    sourceHash: original.hash,
    status:
      'Âncoras conferidas no texto; mídia e timecodes ainda precisam de edição e conferência.',
    clips,
  }
  return { manifest, montage, recipe }
}

export function scriptMarkdown({ manifest, montage, recipe }: ReturnType<typeof buildLesson>) {
  const lines = [
    `# ${manifest.lessonSlug} — ${recipe.title}`,
    '',
    'Adaptação do roteiro gravado: Helena narra; Júlio desenha nas aulas 2–5. Uma aula original continua sendo uma aula, agora dividida em seções.',
    '',
    `**Ponto de partida:** ${recipe.entry}`,
    '',
    `**Resultado:** ${recipe.exit}`,
    '',
    `**Escolhas da criança:** ${recipe.choices}`,
    '',
    '## Percurso',
    '',
    '| Seção | Formato | Objetivo |',
    '| --- | --- | --- |',
    ...manifest.sections.map((s, i) => `| ${i + 1}. ${s.title} | ${s.intent} | ${s.objective} |`),
    '',
    '## Abertura — narração revisada',
    '',
    recipe.opening,
    '',
    'Reutilizar o resultado mostrado na abertura original; substituir sua lista de passos pela orientação acima. O índice da aula mostra a sequência nova.',
    '',
    '## Roteiro das seções',
    '',
  ]
  for (const step of recipe.steps) {
    lines.push(
      `### ${step.title}`,
      '',
      `**Por que neste momento:** ${step.reason}`,
      '',
      `**Narração revisada / ponte:** “${step.say}”`,
      '',
      `**Imagem e condução:** ${step.visual}`,
      '',
    )
    if (step.kind === 'experiment') {
      lines.push(
        `**Atividade implementada:** [${step.experiment}.html](../interacoes/${step.experiment}.html), incorporada ao manifesto. Modelo didático separado da criação.`,
        '',
        '**Criança:** escolhe as duas situações previstas, observa e registra cada resultado. Depois de registrar os dois, os controles encerram; a comparação fica visível e uma pergunta nativa verifica a conclusão. Nenhum desafio adicional é aberto.',
        '',
        '**Conclusão:** o iframe registra participação local; a pergunta é corrigida no servidor. Esse registro não equivale a uma prova de domínio nem inspeciona a galeria.',
        '',
      )
    } else {
      const clip = montage.clips.find((c) => c.key === `video-${step.key}`)!
      lines.push(
        `**Fonte para recortar:** ${clip.sourceFile} → ${clip.sourceSection}.`,
        '',
        `**Entrada:** “${clip.entry}”`,
        '',
        `**Saída:** “${clip.exit}”`,
        '',
        `**Edição:** ${step.edit}`,
        '',
        `**Trecho original de referência, antes da edição:** ${clip.narration}`,
        '',
      )
      if (step.kind === 'observe')
        lines.push(
          '**Criança:** apenas assiste, pausa e revê. Conclusão com 90% do clipe; sem controles de experimento e sem abrir a ferramenta nesta seção.',
          '',
        )
      else
        lines.push(
          `**Criança:** pausa o clipe, continua no mesmo ${recipe.tool === 'pinta' ? 'desenho do Pinta' : 'projeto do Estúdio Completo'} e confere o resultado abaixo. O botão abre outra aba; voltar à aba da aula após fazer.`,
          '',
          '**Conclusão da seção:** pergunta corrigida no servidor. Os critérios de criação abaixo são conferidos pela criança e, na entrega, pelo professor; não são inspeção automática do projeto externo.',
          '',
        )
    }
    lines.push(
      '**O que observar:**',
      '',
      ...step.criteria.map((s) => `- ${s}`),
      '',
      `**Ajuda no ponto da dificuldade:** ${step.help}`,
      '',
    )
    if (step.question)
      lines.push(
        `**Pergunta:** ${step.question[0]}`,
        '',
        `- ${step.question[1]} (correta)`,
        `- ${step.question[2]}`,
        '',
        `**Devolutiva:** ${step.question[3]}`,
        '',
      )
  }
  lines.push(
    '## Entrega e revisão do professor',
    '',
    recipe.delivery,
    '',
    ...recipe.rubric.map((s) => `- ${s}`),
    '',
    `**Configuração obrigatória antes da importação:** primeiro bloco de ${recipe.tool === 'pinta' ? 'Pinta' : 'Estúdio'} da aula em “Na ferramenta completa, com entrega pela galeria”. ${manifest.lessonSlug === 'aula-05' ? 'Mínimo e máximo: 2 desenhos (nave e asteroide).' : 'Mínimo e máximo: 1 criação.'} A referência é por tipo e índice 0: conferir que aponta para a entrega, nunca um editor incorporado.`,
    '',
    'O recebimento é verificado pela plataforma. Qualidade visual, resultado funcional e identidade da criação são revisão do professor. Não aprovar automaticamente uma arte só porque uma pergunta foi respondida. Se a criação enviada for outra, pedir reenvio pelo fluxo existente, com orientação específica.',
    '',
    '## Fechamento — narração revisada',
    '',
    recipe.closing,
    '',
    '## Quiz final',
    '',
    ...recipe.quiz.flatMap(([q, a, b, explanation]) => [
      `**${q}**`,
      '',
      `- ${a} (correta)`,
      `- ${b}`,
      '',
      explanation,
      '',
    ]),
    '## Ajustes de produção',
    '',
    ...recipe.corrections.map((s) => `- ${s}`),
    '',
    'As falas originais selecionadas são matéria-prima: aplicar cortes e substituições antes de exportar. Não somar a narração antiga inteira à ponte nova. Nenhum timecode foi inventado; marcar entrada e saída assistindo ao arquivo gravado. Textos e títulos devem ter legenda, foco visual único e tamanho legível.',
    '',
    `Fonte: ${montage.sourceFile}. SHA-256: ${montage.sourceHash}. Mapa completo: [montagem.json](montagem.json).`,
    '',
  )
  return lines.join('\n')
}
