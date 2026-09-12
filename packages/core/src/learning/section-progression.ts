import { isInteractiveBlock, type LessonSection } from './index'

export type SectionStructureRule =
  | { type: 'usesLoop' }
  | { type: 'declaresVariable'; name: string }
  | { type: 'definesFunction'; name: string }
  | { type: 'callsFunction'; name: string }
  | {
      type: 'usesBlock'
      blockType: string
      area?: 'structure' | 'appearance' | 'molds' | 'start' | 'events' | 'loops'
      withinBlock?: string
      fields?: Record<string, string | number | boolean>
      inputs?: Record<string, string | number | boolean>
    }

export interface SectionProjectCheck {
  id: string
  label: string
  rule: SectionStructureRule
}

/** Presence on every section opts a published lesson into sequential progression. */
export interface SectionCompletion {
  version: 1
  blockIds: string[]
  projectChecks?: SectionProjectCheck[]
}

export interface SectionProgressRecord {
  sectionId: string
  revision: string
  completedAt: string | null
  projectPassed: boolean
}

export interface SectionProgressView {
  revision: string
  completed: number
  total: number
  percent: number
  sections: Array<{
    id: string
    title: string
    status: 'locked' | 'available' | 'completed'
    pending: string[]
  }>
}

const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const label = (v: unknown): v is string =>
  typeof v === 'string' && v.trim().length > 0 && v.length <= 200

export function isSectionCompletion(v: unknown): v is SectionCompletion {
  if (
    !record(v) ||
    v.version !== 1 ||
    !Array.isArray(v.blockIds) ||
    v.blockIds.length > 200 ||
    !v.blockIds.every(label) ||
    new Set(v.blockIds).size !== v.blockIds.length
  )
    return false
  if (v.projectChecks === undefined) return true
  if (!Array.isArray(v.projectChecks) || v.projectChecks.length > 20) return false
  return (
    new Set(v.projectChecks.map((c) => (record(c) ? c.id : null))).size ===
      v.projectChecks.length &&
    v.projectChecks.every((c) => {
      if (
        !record(c) ||
        !label(c.id) ||
        !(typeof c.label === 'string' && c.label.length <= 200) ||
        !record(c.rule)
      )
        return false
      switch (c.rule.type) {
        case 'usesLoop':
          return true
        case 'usesBlock':
          return (
            typeof c.rule.blockType === 'string' &&
            c.rule.blockType.length <= 200 &&
            (c.rule.area === undefined ||
              ['structure', 'appearance', 'molds', 'start', 'events', 'loops'].includes(
                String(c.rule.area),
              )) &&
            (c.rule.withinBlock === undefined || label(c.rule.withinBlock)) &&
            [c.rule.fields, c.rule.inputs].every(
              (values) =>
                values === undefined ||
                (record(values) &&
                  Object.keys(values).length <= 20 &&
                  Object.entries(values).every(
                    ([key, val]) =>
                      label(key) &&
                      (typeof val === 'boolean' ||
                        (typeof val === 'number' && Number.isFinite(val)) ||
                        (typeof val === 'string' && val.length <= 200)),
                  )),
            )
          )
        case 'declaresVariable':
        case 'definesFunction':
        case 'callsFunction':
          return typeof c.rule.name === 'string' && c.rule.name.length <= 200
        default:
          return false
      }
    })
  )
}

export function hasSectionProgression(sections: { completion?: SectionCompletion }[]): boolean {
  return sections.some((s) => s.completion !== undefined)
}

/** Shared by publication and submission: the final delivery closes the actual lesson order. */
export function isFinalProjectSection(
  sections: readonly Pick<LessonSection, 'id' | 'intent'>[],
  sectionId: string,
): boolean {
  const last = sections.at(-1)
  return last?.id === sectionId && last.intent === 'closing'
}

/** Validate at publication, not while an author is still writing a draft. */
export function sectionCompletionIssues(
  sections: LessonSection[],
  blocks: { id: string; content: unknown }[],
  options: { purpose?: 'publication' | 'playback' } = {},
): Array<{ sectionId: string; message: string }> {
  if (!hasSectionProgression(sections)) return []
  if (blocks.some((block) => record(block.content) && block.content.kind === 'certificate'))
    return sections.map((section) => ({
      sectionId: section.id,
      message: 'A aula de certificado usa seu próprio fluxo de conclusão, sem critérios por seção.',
    }))
  return sections.flatMap((s) => {
    const issues: Array<{ sectionId: string; message: string }> = []
    const add = (message: string) => issues.push({ sectionId: s.id, message })
    const c = s.completion
    if (!isSectionCompletion(c)) {
      add('Configure os critérios de conclusão desta seção.')
      return issues
    }
    if (!c.blockIds.length && !c.projectChecks?.length)
      add('Esta seção precisa de uma checagem ou objetivo verificável.')
    for (const id of c.blockIds) {
      const block = blocks.find((b) => b.id === id)
      if (!s.blockIds.includes(id) || !block || !record(block.content)) {
        add('A checagem deve pertencer à própria seção.')
        continue
      }
      const content = block.content
      if (content.kind === 'interactive') {
        if (
          !isInteractiveBlock(content) ||
          (content.activity.type !== 'sequence' && !content.checkpoint)
        )
          add('A descoberta precisa de uma resposta corrigida no servidor.')
      } else if (content.kind === 'quiz') {
        if (
          typeof content.passingScore !== 'number' ||
          content.passingScore <= 0 ||
          !Array.isArray(content.questions) ||
          !content.questions.length
        )
          add('O quiz precisa de perguntas e nota mínima maior que zero.')
      } else if (content.kind === 'studio' || content.kind === 'pinta') {
        if (content.purpose === 'experiment' || s.intent !== 'closing')
          add('A entrega obrigatória do projeto deve ficar no fechamento.')
        if (
          options.purpose !== 'playback' &&
          content.kind === 'studio' &&
          record(content.activity) &&
          typeof content.activity.passingScore === 'number' &&
          content.activity.passingScore > 0 &&
          Array.isArray(content.activity.checks) &&
          content.activity.checks.some((check) => !record(check) || check.kind !== 'structure')
        )
          add(
            'Para exigir aprovação do projeto nesta seção, use apenas checagens estruturais. Deixe testes de execução como formativos ou acrescente uma pergunta corrigida pelo servidor.',
          )
      } else add('Use uma pergunta, desafio ou entrega como critério de conclusão.')
    }
    if (
      c.projectChecks?.some(
        (check) =>
          !label(check.label) ||
          (check.rule.type === 'usesBlock'
            ? !label(check.rule.blockType)
            : check.rule.type === 'usesLoop'
              ? false
              : !label(check.rule.name)),
      )
    )
      add('Preencha o objetivo e o nome esperado na verificação do Estúdio.')
    if (
      c.projectChecks?.length &&
      !blocks.some(
        (b) => b.id === s.workspaceBlockId && record(b.content) && b.content.kind === 'studio',
      )
    )
      add('A verificação de projeto precisa de um Estúdio incorporado nesta seção.')
    for (const b of blocks) {
      if (!s.blockIds.includes(b.id) || !record(b.content)) continue
      if (
        (b.content.kind === 'studio' || b.content.kind === 'pinta') &&
        b.content.purpose !== 'experiment' &&
        !isFinalProjectSection(sections, s.id)
      )
        add('Mova a entrega para a última seção do percurso, marcada como fechamento.')
    }
    return issues
  })
}

/** Completed milestones survive review. Only the first unfinished section is available. */
export function sectionProgressView(
  revision: string,
  sections: { id: string; title: string }[],
  completedIds: ReadonlySet<string>,
  pending: ReadonlyMap<string, string[]>,
): SectionProgressView {
  let available = true
  const states = sections.map((s) => {
    if (completedIds.has(s.id))
      return { id: s.id, title: s.title, status: 'completed' as const, pending: [] }
    const status = available ? ('available' as const) : ('locked' as const)
    available = false
    return {
      id: s.id,
      title: s.title,
      status,
      pending: status === 'locked' ? ['Conclua a seção anterior.'] : (pending.get(s.id) ?? []),
    }
  })
  const completed = states.filter((s) => s.status === 'completed').length
  return {
    revision,
    sections: states,
    completed,
    total: sections.length,
    percent: sections.length ? (completed / sections.length) * 100 : 0,
  }
}
