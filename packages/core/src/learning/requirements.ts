import type { LessonLearningProgress, LessonSection, SectionProgressView } from './index'
import { VIDEO_WATCH_THRESHOLD, videoWatchedFraction } from './video-watch'

export type LessonRequirementReason =
  | 'SECTION_GATE_INCOMPLETE'
  | 'LEARNING_GATE_INCOMPLETE'
  | 'QUIZ_GATE_NOT_PASSED'
  | 'STUDIO_GATE_NOT_SUBMITTED'
  | 'STUDIO_GATE_NOT_PASSED'
  | 'PINTA_GATE_NOT_SUBMITTED'
  | 'CERTIFICATE_GATE_NOT_ISSUED'
  | 'LESSON_COMING_SOON'
  | 'VIDEO_GATE_NOT_WATCHED'
  | 'MATERIAL_GATE_NOT_ACCESSED'
export interface LessonRequirement {
  blockId: string
  sectionId: string | null
  title: string
  complete: boolean
  action: string
  reason: LessonRequirementReason
}
interface RequirementBlock {
  id: string
  kind: string
  content: unknown
  blockRevision?: string
  quizState?: { passed: boolean } | null
  studioState?: { submitted: boolean; passed?: boolean } | null
  pintaState?: { submitted: boolean } | null
}
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Shared by the server's completion command and the lesson UI. No answer keys are needed. */
export function lessonCompletionRequirements(input: {
  blocks: RequirementBlock[]
  sections?: Pick<LessonSection, 'id' | 'title' | 'blockIds'>[]
  learningProgress?: LessonLearningProgress
  completed: boolean
  sectionProgress?: SectionProgressView
  /** Selected only for a section whose sole activity is its video. */
  videoBlockIds?: string[]
  materialBlockIds?: string[]
}): LessonRequirement[] {
  if (input.sectionProgress)
    return input.sectionProgress.sections.map((s) => ({
      blockId: s.id,
      sectionId: s.id,
      title: s.title,
      complete: input.completed || s.status === 'completed',
      action: s.pending.join(' '),
      reason: 'SECTION_GATE_INCOMPLETE',
    }))
  const requirements: LessonRequirement[] = []
  const comingSoon = input.blocks.find((b) => b.kind === 'coming_soon')
  for (const block of comingSoon ? [comingSoon] : input.blocks) {
    if (!record(block.content)) continue
    const content = block.content
    const section = input.sections?.find((s) => s.blockIds.includes(block.id))
    const add = (
      reason: LessonRequirementReason,
      action: string,
      complete: boolean,
      fallback: string,
    ) => {
      requirements.push({
        blockId: block.id,
        sectionId: section?.id ?? null,
        title:
          typeof content.title === 'string' && content.title.trim()
            ? content.title
            : (section?.title ?? fallback),
        reason,
        action,
        complete: input.completed || complete,
      })
    }
    switch (block.kind) {
      case 'ebook': {
        if (!input.materialBlockIds?.includes(block.id)) break
        const saved = input.learningProgress?.blocks.find(
          (p) => p.blockId === block.id && p.revision === block.blockRevision,
        )
        add(
          'MATERIAL_GATE_NOT_ACCESSED',
          'Abra o livro ou baixe o PDF',
          saved?.answers.materialAccess === 'opened' ||
            saved?.answers.materialAccess === 'downloaded',
          'Material da aula',
        )
        break
      }
      case 'video': {
        if (!input.videoBlockIds?.includes(block.id)) break
        const saved = input.learningProgress?.blocks.find(
          (p) => p.blockId === block.id && p.revision === block.blockRevision,
        )
        const fraction = videoWatchedFraction(saved?.answers ?? {})
        add(
          'VIDEO_GATE_NOT_WATCHED',
          `Assista a 90% do vídeo (${Math.floor(fraction * 100)}% assistido)`,
          fraction >= VIDEO_WATCH_THRESHOLD,
          'Vídeo da aula',
        )
        break
      }
      case 'coming_soon':
        add('LESSON_COMING_SOON', 'Aguardar a aula ficar pronta', false, 'Aula em produção')
        break
      case 'interactive':
        if (content.required === true)
          add(
            'LEARNING_GATE_INCOMPLETE',
            'Conferir a descoberta',
            Boolean(
              input.learningProgress?.blocks.some(
                (p) =>
                  p.blockId === block.id && p.revision === block.blockRevision && p.result?.passed,
              ),
            ),
            'Descoberta',
          )
        break
      case 'quiz':
        if (
          typeof content.passingScore === 'number' &&
          Array.isArray(content.questions) &&
          content.questions.length > 0
        )
          add(
            'QUIZ_GATE_NOT_PASSED',
            `Atingir a nota mínima (${content.passingScore}%)`,
            block.quizState?.passed === true,
            'Quiz',
          )
        break
      case 'studio':
        if (content.purpose !== 'experiment') {
          const graded =
            record(content.activity) && typeof content.activity.passingScore === 'number'
          const submitted = block.studioState?.submitted === true
          add(
            submitted && graded ? 'STUDIO_GATE_NOT_PASSED' : 'STUDIO_GATE_NOT_SUBMITTED',
            submitted && graded ? 'Atingir a nota mínima do projeto' : 'Enviar projeto',
            submitted && (!graded || block.studioState?.passed === true),
            'Projeto no Estúdio',
          )
        }
        break
      case 'pinta':
        if (content.purpose !== 'experiment')
          add(
            'PINTA_GATE_NOT_SUBMITTED',
            'Enviar desenho',
            block.pintaState?.submitted === true,
            'Desenho no Pinta',
          )
        break
      case 'certificate':
        add('CERTIFICATE_GATE_NOT_ISSUED', 'Emitir certificado', false, 'Certificado')
        break
    }
  }
  return requirements
}
