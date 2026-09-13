import {
  defaultLessonSection,
  isFinalProjectSection,
  isGalleryBlock,
  type LessonDraftChange,
  type LessonDraftDocument,
  type LessonSection,
  PLATFORM_ACTION_LABELS,
  type SectionCompletion,
  sectionCompletionIssues,
} from '@sistemazero/core/learning'
import type { LessonBlockContent } from './types'

type Document = LessonDraftDocument<LessonBlockContent>
type Block = Document['blocks'][number]
export type ProjectCopyMode = 'shared' | 'independent'
export interface SectionStarterOptions {
  tool: 'studio' | 'pinta'
  project: 'new' | 'existing' | 'external'
  workspaceBlockId: string
}

export function lessonContentLabel(block: Block): string {
  const c = block.content
  switch (c.kind) {
    case 'interactive':
      return c.title || 'Escolher uma cena'
    case 'dialogue':
      return c.text.split('\n')[0]?.slice(0, 90) || 'Escrever a fala do Zappy'
    case 'rich_text':
      return (
        (c.markdown ?? c.html ?? '')
          .replace(/<[^>]+>/g, '')
          .replace(/^#+\s*/, '')
          .split('\n')[0]
          ?.slice(0, 90) || 'Escrever o texto'
      )
    case 'video':
      return c.src ? 'Vídeo da seção' : 'Vídeo aguardando envio'
    case 'ebook':
      return c.title || 'Caderno do curso'
    case 'studio':
      return isGalleryBlock(c)
        ? 'Entrega da galeria do Estúdio'
        : c.initialProject?.name || 'Projeto no Estúdio'
    case 'pinta':
      return isGalleryBlock(c) ? 'Entrega da galeria do Pinta' : 'Desenho no Pinta'
    case 'quiz':
      return `${c.questions.length} pergunta${c.questions.length === 1 ? '' : 's'}`
    case 'image':
      return c.caption || c.alt || 'Imagem da seção'
    case 'audio':
      return 'Áudio da seção'
    case 'embed':
      return 'Conteúdo em HTML'
    case 'certificate':
      return 'Certificado do curso'
    case 'coming_soon':
      return c.message || 'Aula em produção'
  }
}

export function completionBlockLabel(content: LessonBlockContent): string {
  switch (content.kind) {
    case 'video':
      return 'Assistir a 90% do vídeo'
    case 'ebook':
      return 'Abrir o livro ou baixar o PDF'
    case 'studio':
    case 'pinta':
      return isGalleryBlock(content)
        ? 'Enviar a criação da galeria ao professor'
        : 'Enviar a criação ao professor'
    case 'quiz':
      return `Passar no quiz (${content.passingScore ?? 0}%)`
    case 'interactive':
      if (content.activity.type === 'exploration')
        return content.activity.version === 3 && content.activity.mode === 'demonstrate'
          ? 'Acompanhar a demonstração'
          : 'Concluir as descobertas da missão'
      if (content.activity.type === 'simulation') return 'Explorar e comparar a cena'
      if (content.activity.type === 'sequence') return 'Resolver a sequência'
      return 'Responder à atividade'
    default:
      return 'Concluir a atividade'
  }
}

export function sectionCompletionSummary(section: LessonSection, blocks: Block[]): string {
  const c = section.completion
  if (!c) return 'Conclusão conforme as regras atuais da aula'
  if (c.platformAction) return PLATFORM_ACTION_LABELS[c.platformAction]
  const labels = c.blockIds.map((id) => {
    const block = blocks.find((b) => b.id === id)
    return block ? completionBlockLabel(block.content) : 'Revisar atividade removida'
  })
  if (c.projectChecks?.length) {
    const project = blocks.find((b) => b.id === section.workspaceBlockId)
    labels.push(
      `Conferir ${c.projectChecks.length} objetivo${c.projectChecks.length === 1 ? '' : 's'}${project ? ` em ${lessonContentLabel(project)}` : ' no Estúdio'}`,
    )
  }
  return labels.join(' + ') || 'Falta definir o avanço'
}

export function sectionCompletionCandidates(document: Document, section: LessonSection) {
  return section.blockIds.flatMap((id) => {
    const block = document.blocks.find((b) => b.id === id)
    if (
      !block ||
      !['interactive', 'quiz', 'studio', 'pinta', 'ebook', 'video'].includes(block.content.kind)
    )
      return []
    const issue = sectionCompletionIssues(
      [{ ...section, completion: { version: 1, blockIds: [id] } }],
      document.blocks,
    ).find((i) => i.sectionId === section.id)?.message
    const delivery = block.content.kind === 'studio' || block.content.kind === 'pinta'
    return [
      {
        id,
        label: lessonContentLabel(block),
        model: completionBlockLabel(block.content),
        issue:
          delivery && !isFinalProjectSection(document.sections, section.id)
            ? 'Coloque a entrega antes do quiz final, sem etapas de criação depois dela.'
            : issue,
      },
    ]
  })
}

export function suggestedCompletion(
  document: Document,
  section: LessonSection,
): SectionCompletion | null {
  const candidates = sectionCompletionCandidates(document, section).filter((c) => !c.issue)
  // Multiple possibilities need an explicit teacher choice, as do structural project goals.
  return candidates.length === 1 && !section.workspaceBlockId && !section.externalTool
    ? { version: 1, blockIds: [candidates[0]!.id] }
    : null
}

export function newAuthoringSection(id = crypto.randomUUID()): LessonSection {
  return { ...defaultLessonSection(id, 'Nova seção', []), completion: { version: 1, blockIds: [] } }
}

/** Only authoring identities are regenerated; media and project-internal connections survive. */
export function copyLessonContent(
  content: LessonBlockContent,
  id = () => crypto.randomUUID(),
): LessonBlockContent {
  const copy = structuredClone(content)
  if (copy.kind === 'studio') {
    if (copy.initialProject) copy.initialProject.id = id()
    delete copy.chain
  } else if (copy.kind === 'pinta') {
    delete copy.chain
  } else if (copy.kind === 'interactive' || copy.kind === 'quiz') {
    const ids = new Map<string, string>()
    const collect = (value: unknown) => {
      if (!value || typeof value !== 'object') return
      if ('id' in value && typeof value.id === 'string') ids.set(value.id, id())
      for (const child of Object.values(value)) collect(child)
    }
    const remap = (value: unknown): unknown => {
      if (typeof value === 'string') return ids.get(value) ?? value
      if (Array.isArray(value)) return value.map(remap)
      if (value && typeof value === 'object')
        return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, remap(child)]))
      return value
    }
    collect(copy)
    return remap(copy) as LessonBlockContent
  }
  return copy
}

export function canShareSectionProject(section: LessonSection): boolean {
  return Boolean(section.workspaceBlockId && !section.blockIds.includes(section.workspaceBlockId))
}

/** Keep every existing block assigned after each saved operation, including a moved delivery. */
export function appendLessonSection(
  document: Document,
  section: LessonSection,
  blocks: Block[],
  sourceSections = document.sections,
): LessonDraftChange<LessonBlockContent>[] {
  const existingIds = new Set(document.blocks.map((b) => b.id))
  if (
    document.sections.length >= 60 ||
    document.blocks.length + blocks.filter((b) => !existingIds.has(b.id)).length > 200
  )
    throw new Error(
      'A aula permite até 60 seções e 200 conteúdos. Organize a aula antes de acrescentar esta seção.',
    )
  const moved = new Set(blocks.filter((b) => existingIds.has(b.id)).map((b) => b.id))
  const sections = sourceSections.map((s) => ({
    ...s,
    blockIds: s.blockIds.filter((id) => !moved.has(id)),
  }))
  const supportBlockIds = document.supportBlockIds.filter((id) => !moved.has(id))
  return [
    {
      type: 'structure',
      sections: [...sections, { ...section, blockIds: [...moved] }],
      supportBlockIds,
    },
    ...blocks.map((block) => ({ type: 'block' as const, block, sectionId: section.id })),
    {
      type: 'structure',
      sections: [...sections, { ...section, blockIds: blocks.map((b) => b.id) }],
      supportBlockIds,
    },
  ]
}

export function duplicateLessonSection(
  document: Document,
  sectionId: string,
  mode: ProjectCopyMode,
  id = () => crypto.randomUUID(),
): LessonDraftChange<LessonBlockContent>[] {
  const section = document.sections.find((s) => s.id === sectionId)
  if (!section || document.sections.length >= 60) return []
  if (mode === 'shared' && section.workspaceBlockId && !canShareSectionProject(section))
    throw new Error(
      'Esta seção contém o bloco do projeto. Faça uma cópia independente para preservar sua entrega.',
    )
  const sectionCopyId = id()
  const sources = [...section.blockIds]
  if (
    mode === 'independent' &&
    section.workspaceBlockId &&
    !sources.includes(section.workspaceBlockId)
  )
    sources.push(section.workspaceBlockId)
  const copies = sources.flatMap((sourceId) => {
    const block = document.blocks.find((b) => b.id === sourceId)
    return block
      ? [{ sourceId, block: { id: id(), content: copyLessonContent(block.content, id) } }]
      : []
  })
  if (document.blocks.length + copies.length > 200)
    throw new Error('A cópia ultrapassaria o limite de 200 conteúdos desta aula.')
  const remap = (value: string) => copies.find((c) => c.sourceId === value)?.block.id ?? value
  const copy: LessonSection = {
    ...structuredClone(section),
    id: sectionCopyId,
    title: `${section.title} (cópia)`.slice(0, 200),
    blockIds: copies.map((c) => c.block.id),
    workspaceBlockId: section.workspaceBlockId
      ? mode === 'shared'
        ? section.workspaceBlockId
        : remap(section.workspaceBlockId)
      : null,
    ...(section.completion
      ? {
          completion: {
            ...structuredClone(section.completion),
            blockIds: section.completion.blockIds.map(remap),
            projectChecks: section.completion.projectChecks?.map((check) => ({
              ...structuredClone(check),
              id: id(),
            })),
          },
        }
      : {}),
  }
  const sections = document.sections.flatMap((s) => (s.id === sectionId ? [s, copy] : [s]))
  // Create the section first, so incremental draft operations always have a valid destination.
  return [
    {
      type: 'structure',
      sections: sections.map((s) => (s.id === copy.id ? { ...copy, blockIds: [] } : s)),
      supportBlockIds: document.supportBlockIds,
    },
    ...copies.map(({ block }) => ({ type: 'block' as const, block, sectionId: copy.id })),
    { type: 'structure', sections, supportBlockIds: document.supportBlockIds },
    {
      type: 'planned-videos',
      plannedVideos: [
        ...document.plannedVideos,
        ...document.plannedVideos
          .filter((v) => copies.some((c) => c.sourceId === v.blockId))
          .map((v) => ({ ...v, blockId: remap(v.blockId) })),
      ],
    },
  ]
}
