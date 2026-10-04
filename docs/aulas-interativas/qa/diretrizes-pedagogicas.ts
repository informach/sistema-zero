import type { LearningManifest } from '../../../packages/core/src/learning'

/** Cobertura aprovada desta revisão; cursos antigos não são declarados revisados por engano. */
export const CURSOS_DIRETRIZES_ATUAIS = new Set(['cade-todo-mundo', 'desafio-primeiro-jogo'])

/** Regras verificáveis; clareza das falas e compreensão ainda exigem revisão e ensaio. */
export function problemasPedagogicos(m: LearningManifest, jogoInicial = false): string[] {
  const errors: string[] = []
  const byKey = new Map(m.blocks.map((block) => [block.key, block]))
  for (const section of m.sections) {
    const blocks = section.blockKeys.map((key) => byKey.get(key))
    const videos = blocks.filter((block) => block && 'plannedVideo' in block)
    const dialogues = blocks.filter((block) => block?.content?.kind === 'dialogue')
    const quizzes = blocks.filter((block) => block?.content?.kind === 'quiz')
    const report = (message: string) => errors.push(`${section.key}: ${message}`)
    if (videos.length > 1) report('no máximo um vídeo por seção')
    if (dialogues.length > 1) report('no máximo uma fala externa do Zappy')
    for (const video of videos) {
      const index = blocks.indexOf(video)
      if (blocks[index + 1]?.content?.kind !== 'dialogue')
        report('o vídeo precisa da ponte do Zappy imediatamente depois')
    }
    for (const dialogue of dialogues)
      if (dialogue && section.completion?.blockIds.includes(dialogue.key))
        report('a fala de orientação não é critério de conclusão')
    if (quizzes.length) {
      if (
        blocks.length !== 2 ||
        blocks[0]?.content?.kind !== 'dialogue' ||
        blocks[1]?.content?.kind !== 'quiz' ||
        section.workspaceKey ||
        section.externalTool
      )
        report('quiz: somente Zappy antes do quiz, sem vídeo nem ferramenta')
      for (const quiz of quizzes) {
        if (quiz?.content?.kind !== 'quiz') continue
        if (!section.completion?.blockIds.includes(quiz.key))
          report('quiz formativo precisa participar da conclusão')
        if (quiz.content.questions.some((q) => !q.explanation?.trim()))
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
      if (block.content?.kind === 'studio') {
        visit(block.content.initialProject)
        for (const type of block.content.allowBlocks ?? [])
          if (/^sz_(html|css)_/.test(type)) errors.push(`paleta inicial não pode liberar ${type}`)
      }
      if (block.content?.kind === 'interactive' && block.content.activity.type === 'project-play')
        visit(block.content.activity.project)
    }
  }
  return [...new Set(errors)]
}
