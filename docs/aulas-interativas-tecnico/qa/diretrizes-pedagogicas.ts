import type { LearningManifest } from '../../../packages/core/src/learning'

/** Vídeos planejados têm chave, mas ainda não têm conteúdo de bloco. */
export function conteudoBloco(block: LearningManifest['blocks'][number] | undefined) {
  return block && 'content' in block ? block.content : undefined
}

/** Cobertura aprovada desta revisão; cursos antigos não são declarados revisados por engano. */
export const CURSOS_DIRETRIZES_ATUAIS = new Set([
  'cade-todo-mundo',
  'desafio-primeiro-jogo',
  'nave-contra-asteroides',
  'corre-dino',
  'o-jogo-do-meu-jeito',
])

/** A prática externa é conferida pelo aluno; o recebimento é comprovado na galeria. */
export function temEntregaExterna(m: LearningManifest, sectionIndex: number): boolean {
  const tool = m.sections[sectionIndex]?.externalTool
  if (!tool) return false
  const kind = tool === 'estudio' ? 'studio' : tool
  return m.sections.slice(sectionIndex).some(
    (section) =>
      section.intent === 'delivery' &&
      section.externalTool === tool &&
      section.blockKeys.some((key) => {
        const content = conteudoBloco(m.blocks.find((block) => block.key === key))
        return (
          content?.kind === kind &&
          'gallery' in content &&
          Boolean(content.gallery) &&
          'purpose' in content &&
          content.purpose === 'submission' &&
          Boolean(section.completion?.blockIds.includes(key))
        )
      }),
  )
}

/** Regras verificáveis; clareza das falas e compreensão ainda exigem revisão e ensaio. */
export function problemasPedagogicos(m: LearningManifest, jogoInicial = false): string[] {
  const errors: string[] = []
  const byKey = new Map(m.blocks.map((block) => [block.key, block]))
  for (const [sectionIndex, section] of m.sections.entries()) {
    const blocks = section.blockKeys.map((key) => byKey.get(key))
    const videos = blocks.filter((block) => block && 'plannedVideo' in block)
    const dialogues = blocks.filter((block) => conteudoBloco(block)?.kind === 'dialogue')
    const quizzes = blocks.filter((block) => conteudoBloco(block)?.kind === 'quiz')
    const report = (message: string) => errors.push(`${section.key}: ${message}`)
    if (section.externalTool && !temEntregaExterna(m, sectionIndex))
      report(
        'atividade externa precisa de entrega obrigatória posterior na galeria da mesma ferramenta',
      )
    if (videos.length > 1) report('no máximo um vídeo por seção')
    if (dialogues.length > 1) report('no máximo uma fala externa do Zappy')
    for (const video of videos) {
      const index = blocks.indexOf(video)
      if (conteudoBloco(blocks[index + 1])?.kind !== 'dialogue')
        report('o vídeo precisa da ponte do Zappy imediatamente depois')
    }
    for (const dialogue of dialogues)
      if (dialogue && section.completion?.blockIds.includes(dialogue.key))
        report('a fala de orientação não é critério de conclusão')
    if (quizzes.length) {
      if (
        blocks.length !== 2 ||
        conteudoBloco(blocks[0])?.kind !== 'dialogue' ||
        conteudoBloco(blocks[1])?.kind !== 'quiz' ||
        section.workspaceKey ||
        section.externalTool
      )
        report('quiz: somente Zappy antes do quiz, sem vídeo nem ferramenta')
      for (const quiz of quizzes) {
        const content = conteudoBloco(quiz)
        if (!quiz || content?.kind !== 'quiz') continue
        if (!section.completion?.blockIds.includes(quiz.key))
          report('quiz formativo precisa participar da conclusão')
        if (content.questions.some((q) => !q.explanation?.trim()))
          report('cada pergunta precisa de explicação para a correção')
      }
    }
  }
  if (jogoInicial) {
    const visit = (value: unknown): void => {
      if (Array.isArray(value)) {
        value.forEach(visit)
        return
      }
      if (!value || typeof value !== 'object') return
      const record = value as Record<string, unknown>
      if (typeof record.type === 'string' && /^sz_(html|css)_/.test(record.type))
        errors.push(`projeto inicial não pode usar ${record.type}`)
      // Arquivos gerados pelo motor podem conter HTML/CSS; árvores de blocos do aluno não.
      for (const [key, child] of Object.entries(record)) {
        if ((key === 'html' || key === 'css') && Array.isArray(child) && child.length)
          errors.push(`projeto inicial tem blocos na área ${key}`)
        visit(child)
      }
    }
    for (const block of m.blocks) {
      const content = conteudoBloco(block)
      if (content?.kind === 'studio') {
        visit(content.initialProject)
        for (const type of content.allowBlocks ?? [])
          if (/^sz_(html|css)_/.test(type)) errors.push(`paleta inicial não pode liberar ${type}`)
      }
      if (content?.kind === 'interactive' && content.activity.type === 'project-play')
        visit(content.activity.project)
    }
  }
  return [...new Set(errors)]
}
