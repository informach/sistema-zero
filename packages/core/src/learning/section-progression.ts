import { compareContentFingerprints } from '../creations/content-fingerprint'
import { isInteractiveBlock, type LessonSection } from './index'
import { isPlatformAction, type PlatformAction } from './platform-action'
import {
  EXECUTION_LIMITS,
  isExecutionRule,
  isSectionExecutionRule,
  type SectionExecutionRule,
} from './project-execution'
import {
  isSectionPythonProjectCheck,
  type SectionPythonProjectCheck,
  sectionProjectChecksEnvironmentIssue,
} from './python-project-checks'
import type { LessonRequirementReason } from './requirements'

export interface ProjectFieldRange {
  min?: number
  max?: number
  minExclusive?: true
  maxExclusive?: true
}

export interface ProjectFieldText {
  nonBlank: true
  /** Every group requires one of its explicit phrases; this is not semantic analysis. */
  containsAll?: string[][]
}

/** Words only: punctuation separates phrases, and accents/case do not prescribe spelling. */
export function normalizeProjectFieldText(value: string): string {
  return (
    value
      .normalize('NFKD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .match(/[\p{L}\p{N}]+/gu) ?? []
  ).join(' ')
}

export interface ProjectBlockPattern {
  blockType: string
  fields?: Record<string, string | number | boolean>
  /** A field may match any of these explicit names, e.g. alternative lit lighthouse images. */
  fieldOptions?: Record<string, string[]>
  /** Finite numeric bounds on a field; an exclusive bound requires its endpoint. */
  fieldRanges?: Record<string, ProjectFieldRange>
  /** Accept the learner's own nonblank text without prescribing its contents. */
  fieldText?: Record<string, ProjectFieldText>
  /** One complete field map must match; keys are identical in every alternative. */
  fieldAlternatives?: Record<string, string | number | boolean>[]
  inputs?: Record<string, string | number | boolean>
  /** A later enabled sibling in this same statement chain, never another branch. */
  beforeBlock?: string
  /** A complete later enabled sibling in this same chain; exclusive with beforeBlock. */
  beforePattern?: ProjectBlockPattern
  /** Match an active child in this named input, keeping all conditions on that same child. */
  inputBlocks?: Record<string, ProjectBlockPattern>
  /** Every pattern matches the same socket chain. This does not require distinct occurrences. */
  inputBlocksAll?: Record<string, ProjectBlockPattern[]>
}

export type SectionStructureRule =
  | { type: 'usesLoop' }
  | { type: 'declaresVariable'; name: string }
  | { type: 'definesFunction'; name: string }
  | { type: 'callsFunction'; name: string }
  | (ProjectBlockPattern & {
      type: 'usesBlock'
      area?: 'structure' | 'appearance' | 'molds' | 'start' | 'events' | 'loops'
      withinBlock?: string
      /** Exact number of matching active blocks; zero checks removal. */
      count?: number
    })

/**
 * A regra de um objetivo: ESTRUTURA (o que o projeto tem, conferido na hora) ou EXECUÇÃO (o que o
 * jogo faz quando roda, conferido pelo `studio-runtime`; ver `project-execution.ts`).
 */
export type SectionObjectiveRule = SectionStructureRule | SectionExecutionRule

export interface SectionJavaScriptProjectCheck {
  id: string
  programmingLanguage?: 'javascript'
  /** A frase que a criança lê na lista "Objetivos desta parte". */
  label: string
  rule: SectionObjectiveRule
  /** O que dizer quando o objetivo ainda não foi cumprido (a criança lê). */
  hint?: string
  /**
   * EXTRA: um desafio a mais. Não tranca a parte e dá XP uma vez quando cumprido. Sem o campo, o
   * objetivo é obrigatório para seguir (todos os objetivos anteriores a 18/10/2026).
   */
  optional?: true
}

/**
 * O jeito de conferir, na língua da autoria (o Admin e a lista da criança usam o mesmo nome):
 * um bloco, uma ideia de programação, o que o jogo faz (`game`), a resposta de uma função
 * (`function`) ou uma regra em JavaScript (`script`).
 */
export type ProjectObjectiveKind = 'block' | 'idea' | 'game' | 'function' | 'script'

export function projectObjectiveKind(rule: SectionObjectiveRule): ProjectObjectiveKind {
  switch (rule.type) {
    case 'usesBlock':
      return 'block'
    case 'behavior':
      return 'game'
    case 'functionReturns':
      return 'function'
    case 'script':
      return 'script'
    default:
      return 'idea'
  }
}

/** Os objetivos que precisam RODAR o jogo (e por isso do executor). */
export function executionProjectChecks<T extends { rule: { type: string } }>(
  checks: readonly T[] | undefined,
): T[] {
  return (checks ?? []).filter((check) => isExecutionRule(check.rule))
}

/**
 * O que a CRIANÇA recebe de cada objetivo: nunca a regra. Com os objetivos de execução a regra
 * carrega a resposta esperada, e mesmo a de estrutura não é da conta do navegador dela.
 */
export interface ProjectObjectiveView {
  id: string
  label: string
  hint?: string
  optional?: true
  kind: ProjectObjectiveKind
}

export function projectObjectiveView(check: SectionProjectCheck): ProjectObjectiveView {
  return {
    id: check.id,
    label: check.label,
    ...(check.hint ? { hint: check.hint } : {}),
    ...(check.optional ? { optional: true as const } : {}),
    kind:
      check.programmingLanguage === 'python'
        ? check.rule.type === 'behavior'
          ? 'game'
          : check.rule.type === 'functionReturns'
            ? 'function'
            : 'idea'
        : projectObjectiveKind(check.rule),
  }
}

/** A conclusão como a criança a recebe: a mesma, com os objetivos trocados pela vista. */
export type SectionCompletionView = Omit<SectionCompletion, 'projectChecks'> & {
  projectChecks?: ProjectObjectiveView[]
}

export function sectionCompletionView(completion: SectionCompletion): SectionCompletionView {
  return {
    version: completion.version,
    blockIds: [...completion.blockIds],
    ...(completion.materialItems
      ? {
          materialItems: completion.materialItems.map((item) => ({
            blockId: item.blockId,
            itemIds: [...item.itemIds],
          })),
        }
      : {}),
    ...(completion.platformAction ? { platformAction: completion.platformAction } : {}),
    ...(completion.submissionUpToDate ? { submissionUpToDate: completion.submissionUpToDate } : {}),
    ...(completion.projectChecks
      ? { projectChecks: completion.projectChecks.map(projectObjectiveView) }
      : {}),
  }
}

/** Os objetivos que TRANCAM a parte. */
export function requiredProjectChecks<T extends { optional?: true }>(
  checks: readonly T[] | undefined,
): T[] {
  return (checks ?? []).filter((check) => !check.optional)
}

/** O resultado guardado de cada objetivo na última verificação (por revisão da parte). */
export interface ProjectObjectiveResult {
  id: string
  passed: boolean
}
export type SectionProjectCheck = SectionJavaScriptProjectCheck | SectionPythonProjectCheck

/** Presence on every section opts a published lesson into sequential progression. */
export interface SectionCompletion {
  version: 1
  blockIds: string[]
  /** Arquivos efetivamente exigidos em cada bloco de materiais escolhido. */
  materialItems?: { blockId: string; itemIds: string[] }[]
  projectChecks?: SectionProjectCheck[]
  platformAction?: PlatformAction
  /**
   * "Envio em dia" (10/10/2026): a parte só fecha quando o último envio do Estúdio ou do Pinta
   * dela (o `workspaceBlockId`) é igual ao projeto de agora. Mexeu depois de enviar? A faixa pede
   * "Enviar de novo". Opcional e só nas partes que a autora marca: a régua compara a impressão
   * digital do rascunho guardado na conta com a do envio (ver `submissionFreshness`).
   */
  submissionUpToDate?: true
}

export interface SectionProgressRecord {
  sectionId: string
  revision: string
  completedAt: string | null
  projectPassed: boolean
  /**
   * O último resultado de cada objetivo (da última verificação desta revisão). Ausente na
   * gravação = mantém o que estava guardado; só a verificação o escreve.
   */
  objectiveResults?: ProjectObjectiveResult[] | null
}

/**
 * Por que a parte ainda não fechou, TIPADO (30/09/2026): o `kind` é o que escolhe o ícone e a cor
 * na faixa "o que falta para seguir" do rodapé da aula. As razões de requisito vêm de
 * `lessonCompletionRequirements`; `platform-action`, `project-check` e `authoring` são as outras
 * três coisas que o members acrescenta; `locked` é a parte que espera a anterior; `lesson` é o
 * motivo do "Concluir aula" travado que o player conhece; `other` é um texto sem razão (fixtures).
 */
export type SectionPendingKind =
  | LessonRequirementReason
  | 'platform-action'
  | 'project-check'
  | 'submission-outdated'
  | 'authoring'
  | 'locked'
  | 'lesson'
  | 'other'
export interface SectionPendingItem {
  kind: SectionPendingKind
  text: string
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
    /** As frases do que falta (compatibilidade: ajuda ao professor, recados). */
    pending: string[]
    /** As mesmas frases, com o `kind`: é o que a faixa do rodapé lê. */
    pendingItems: SectionPendingItem[]
    /** O resultado de cada objetivo na última "Verificar esta parte" desta revisão. */
    objectives?: ProjectObjectiveResult[]
  }>
}

/** Teto da dica de um objetivo. */
export const PROJECT_CHECK_HINT_MAX = 300

const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const label = (v: unknown): v is string =>
  typeof v === 'string' && v.trim().length > 0 && v.length <= 200

/** Authors save half-filled objectives; an empty block type is the placeholder, not a broken draft. */
const blockName = (v: unknown): v is string => typeof v === 'string' && v.length <= 200
const fieldLiteral = (value: unknown) =>
  typeof value === 'boolean' ||
  (typeof value === 'number' && Number.isFinite(value)) ||
  (typeof value === 'string' && value.length <= 200)

export function isProjectFieldRange(value: unknown): value is ProjectFieldRange {
  if (
    !record(value) ||
    Object.keys(value).some((key) => !['min', 'max', 'minExclusive', 'maxExclusive'].includes(key))
  )
    return false
  const { min, max, minExclusive, maxExclusive } = value
  if (min === undefined && max === undefined) return false
  if (min !== undefined && (typeof min !== 'number' || !Number.isFinite(min))) return false
  if (max !== undefined && (typeof max !== 'number' || !Number.isFinite(max))) return false
  if (minExclusive !== undefined && (minExclusive !== true || min === undefined)) return false
  if (maxExclusive !== undefined && (maxExclusive !== true || max === undefined)) return false
  return !(
    typeof min === 'number' &&
    typeof max === 'number' &&
    (min > max || (min === max && (minExclusive || maxExclusive)))
  )
}

export function isProjectFieldText(value: unknown): value is ProjectFieldText {
  if (
    !record(value) ||
    !Object.hasOwn(value, 'nonBlank') ||
    value.nonBlank !== true ||
    Object.keys(value).some((key) => key !== 'nonBlank' && key !== 'containsAll')
  )
    return false
  const groups = value.containsAll
  return (
    groups === undefined ||
    (Array.isArray(groups) &&
      groups.length >= 1 &&
      groups.length <= 10 &&
      groups.every(
        (alternatives) =>
          Array.isArray(alternatives) &&
          alternatives.length >= 1 &&
          alternatives.length <= 10 &&
          alternatives.every(
            (phrase) =>
              typeof phrase === 'string' &&
              phrase.length >= 1 &&
              phrase.length <= 120 &&
              normalizeProjectFieldText(phrase).length > 0,
          ),
      ))
  )
}

export function isProjectBlockPattern(value: unknown): value is ProjectBlockPattern {
  let remaining = 64
  function valid(v: unknown, depth: number): boolean {
    if (!record(v) || !blockName(v.blockType) || depth > 4 || --remaining < 0) return false
    if (v.beforeBlock !== undefined && !label(v.beforeBlock)) return false
    if (v.beforePattern !== undefined) {
      if (v.beforeBlock !== undefined || !valid(v.beforePattern, depth + 1)) return false
    }
    if (
      ![v.fields, v.inputs].every(
        (values) =>
          values === undefined ||
          (record(values) &&
            Object.keys(values).length <= 20 &&
            Object.entries(values).every(([key, val]) => label(key) && fieldLiteral(val))),
      )
    )
      return false
    const constrainedFields = new Set<string>()
    for (const map of [v.fields, v.fieldOptions, v.fieldRanges, v.fieldText]) {
      if (map === undefined) continue
      if (!record(map) || Object.keys(map).length > 20) return false
      for (const key of Object.keys(map)) {
        if (!label(key) || constrainedFields.has(key)) return false
        constrainedFields.add(key)
      }
    }
    if (v.fieldAlternatives !== undefined) {
      if (
        !Array.isArray(v.fieldAlternatives) ||
        !v.fieldAlternatives.length ||
        v.fieldAlternatives.length > 10
      )
        return false
      let names: string[] | undefined
      for (const alternative of v.fieldAlternatives) {
        if (!record(alternative)) return false
        const keys = Object.keys(alternative)
        if (
          !keys.length ||
          keys.length > 20 ||
          !keys.every(
            (key) => label(key) && !constrainedFields.has(key) && fieldLiteral(alternative[key]),
          )
        )
          return false
        if (
          names &&
          (keys.length !== names.length || !names.every((key) => Object.hasOwn(alternative, key)))
        )
          return false
        names ??= keys
      }
    }
    if (
      v.fieldOptions !== undefined &&
      (!record(v.fieldOptions) ||
        Object.keys(v.fieldOptions).length > 20 ||
        !Object.entries(v.fieldOptions).every(
          ([key, options]) =>
            label(key) &&
            Array.isArray(options) &&
            options.length > 0 &&
            options.length <= 50 &&
            options.every(label) &&
            new Set(options).size === options.length,
        ))
    )
      return false
    if (record(v.fieldRanges) && !Object.values(v.fieldRanges).every(isProjectFieldRange))
      return false
    if (record(v.fieldText) && !Object.values(v.fieldText).every(isProjectFieldText)) return false
    const constrainedInputs = new Set(record(v.inputs) ? Object.keys(v.inputs) : [])
    for (const kind of ['inputBlocks', 'inputBlocksAll'] as const) {
      const sockets = v[kind]
      if (sockets === undefined) continue
      if (
        !record(sockets) ||
        Object.keys(sockets).length > 20 ||
        (kind === 'inputBlocksAll' && !Object.keys(sockets).length)
      )
        return false
      for (const [key, child] of Object.entries(sockets)) {
        if (!label(key) || constrainedInputs.has(key)) return false
        constrainedInputs.add(key)
        if (kind === 'inputBlocks') {
          if (!valid(child, depth + 1)) return false
        } else if (
          !Array.isArray(child) ||
          !child.length ||
          child.length > 20 ||
          !child.every((pattern) => valid(pattern, depth + 1))
        )
          return false
      }
    }
    return true
  }
  return valid(value, 0)
}

/** A placeholder still without a block, at the top or in any connected socket, is an editorial warning. */
function hasBlankBlockType(pattern: ProjectBlockPattern): boolean {
  return (
    !label(pattern.blockType) ||
    (pattern.beforePattern !== undefined && hasBlankBlockType(pattern.beforePattern)) ||
    Object.values(pattern.inputBlocks ?? {}).some(hasBlankBlockType) ||
    Object.values(pattern.inputBlocksAll ?? {}).some((patterns) => patterns.some(hasBlankBlockType))
  )
}

export function isSectionCompletion(v: unknown): v is SectionCompletion {
  if (record(v) && (Object.hasOwn(v, 'projectExamples') || Object.hasOwn(v, 'solutionProject')))
    return false
  if (
    !record(v) ||
    v.version !== 1 ||
    !Array.isArray(v.blockIds) ||
    v.blockIds.length > 200 ||
    !v.blockIds.every(label) ||
    new Set(v.blockIds).size !== v.blockIds.length
  )
    return false
  if (v.platformAction !== undefined && !isPlatformAction(v.platformAction)) return false
  if (v.submissionUpToDate !== undefined && v.submissionUpToDate !== true) return false
  if (v.materialItems !== undefined) {
    if (
      !Array.isArray(v.materialItems) ||
      v.materialItems.length > 20 ||
      !v.materialItems.every(
        (entry) =>
          record(entry) &&
          label(entry.blockId) &&
          Array.isArray(entry.itemIds) &&
          entry.itemIds.length > 0 &&
          entry.itemIds.length <= 20 &&
          entry.itemIds.every(label) &&
          new Set(entry.itemIds).size === entry.itemIds.length,
      ) ||
      new Set(v.materialItems.map((entry) => entry.blockId)).size !== v.materialItems.length
    )
      return false
  }
  if (v.projectChecks === undefined) return true
  if (!Array.isArray(v.projectChecks) || v.projectChecks.length > 20) return false
  // Cada objetivo de execução abre o jogo do zero num navegador: o teto é por parte.
  if (
    v.projectChecks.filter(
      (c) => record(c) && record(c.rule) && isExecutionRule(c.rule as { type: string }),
    ).length > EXECUTION_LIMITS.maxObjectives
  )
    return false
  return (
    new Set(v.projectChecks.map((c) => (record(c) ? c.id : null))).size ===
      v.projectChecks.length &&
    v.projectChecks.every((c) => {
      if (record(c) && c.programmingLanguage === 'python') return isSectionPythonProjectCheck(c)
      if (
        !record(c) ||
        (c.programmingLanguage !== undefined && c.programmingLanguage !== 'javascript') ||
        !label(c.id) ||
        !(typeof c.label === 'string' && c.label.length <= 200) ||
        (c.hint !== undefined &&
          !(typeof c.hint === 'string' && c.hint.length <= PROJECT_CHECK_HINT_MAX)) ||
        (c.optional !== undefined && c.optional !== true) ||
        !record(c.rule)
      )
        return false
      switch (c.rule.type) {
        case 'usesLoop':
          return true
        case 'usesBlock':
          return (
            isProjectBlockPattern(c.rule) &&
            (c.rule.count === undefined ||
              (Number.isInteger(c.rule.count) &&
                Number(c.rule.count) >= 0 &&
                Number(c.rule.count) <= 200_000)) &&
            (c.rule.beforeBlock === undefined || label(c.rule.beforeBlock)) &&
            (c.rule.area === undefined ||
              ['structure', 'appearance', 'molds', 'start', 'events', 'loops'].includes(
                String(c.rule.area),
              )) &&
            (c.rule.withinBlock === undefined || label(c.rule.withinBlock))
          )
        case 'declaresVariable':
        case 'definesFunction':
        case 'callsFunction':
          return typeof c.rule.name === 'string' && c.rule.name.length <= 200
        case 'behavior':
        case 'functionReturns':
        case 'script':
          return isSectionExecutionRule(c.rule)
        default:
          return false
      }
    })
  )
}

export function hasSectionProgression(sections: { completion?: SectionCompletion }[]): boolean {
  return sections.some((s) => s.completion !== undefined)
}

/** Delivery may precede the final review. Historical closing sections remain valid. */
export function isFinalProjectSection(
  sections: readonly Pick<LessonSection, 'id' | 'intent'>[],
  sectionId: string,
): boolean {
  const index = sections.findIndex((section) => section.id === sectionId)
  const section = sections[index]
  if (!section) return false
  if (section.intent === 'closing') return index === sections.length - 1
  return (
    section.intent === 'delivery' &&
    sections.slice(index + 1).every((following) => following.intent === 'closing')
  )
}

/** Validate at publication, not while an author is still writing a draft. */
export function sectionCompletionIssues(
  sections: LessonSection[],
  blocks: { id: string; content: unknown }[],
): Array<{ sectionId: string; message: string }> {
  if (!hasSectionProgression(sections)) return []
  return sections.flatMap((s) => {
    const issues: Array<{ sectionId: string; message: string }> = []
    const add = (message: string) => issues.push({ sectionId: s.id, message })
    const c = s.completion
    if (
      s.workspaceBlockId &&
      blocks.some((b) => b.id === s.workspaceBlockId && record(b.content) && b.content.gallery)
    )
      add(
        'Uma entrega pela galeria não é um espaço de trabalho incorporado. Coloque o bloco na seção de entrega.',
      )
    if (!isSectionCompletion(c)) {
      add('Configure os critérios de conclusão desta parte.')
      return issues
    }
    if (
      !c.blockIds.length &&
      !requiredProjectChecks(c.projectChecks).length &&
      !c.platformAction &&
      !c.submissionUpToDate
    )
      add(
        c.projectChecks?.length
          ? 'Objetivos extras não trancam a parte. Marque ao menos um objetivo como obrigatório ou escolha outro critério.'
          : 'Esta parte precisa de uma checagem ou objetivo verificável.',
      )
    if (
      blocks.some(
        (block) =>
          s.blockIds.includes(block.id) &&
          record(block.content) &&
          block.content.kind === 'certificate' &&
          !c.blockIds.includes(block.id),
      )
    )
      add('Inclua a emissão do certificado como critério desta parte.')
    if (
      c.platformAction &&
      (c.blockIds.length ||
        c.materialItems?.length ||
        c.projectChecks?.length ||
        s.workspaceBlockId ||
        s.externalTool)
    )
      add('A ação da plataforma é o critério desta etapa. Separe outras atividades em outra seção.')
    for (const id of c.blockIds) {
      const block = blocks.find((b) => b.id === id)
      if (!s.blockIds.includes(id) || !block || !record(block.content)) {
        add('A checagem deve pertencer à própria seção.')
        continue
      }
      const content = block.content
      if (content.kind === 'interactive') {
        // A cena traz a própria sessão; o jogo pronto traz os alvos encontrados
        // (evidência de participação, não prova antitrapaça). HTML livre ainda
        // exige uma pergunta corrigida pelo servidor.
        const atividadeObservavel =
          isInteractiveBlock(content) &&
          (content.activity.type === 'experimentation' || content.activity.type === 'project-play')
        if (!isInteractiveBlock(content) || (!atividadeObservavel && !content.checkpoint))
          add(
            'Use uma exploração nativa ou jogo pronto com objetivo observável, ou uma resposta corrigida no servidor.',
          )
      } else if (content.kind === 'video') {
        // A porcentagem assistida é evidência própria do vídeo e pode ser combinada com arquivos.
      } else if (content.kind === 'certificate') {
        // O registro emitido é a evidência; a conclusão da aula espera as demais seções.
      } else if (content.kind === 'materials') {
        const selected = c.materialItems?.find((entry) => entry.blockId === id)?.itemIds
        const items = content.items
        if (!selected?.length) {
          add('Escolha ao menos um arquivo do bloco de materiais para exigir o download.')
        } else if (
          !Array.isArray(items) ||
          selected.some(
            (itemId) =>
              !items.some(
                (item: unknown) =>
                  record(item) &&
                  item.id === itemId &&
                  item.kind === 'file' &&
                  label(item.attachmentId),
              ),
          )
        ) {
          add('Um arquivo obrigatório foi removido ou ainda não foi enviado.')
        }
      } else if (content.kind === 'ebook') {
        if (s.intent !== 'material') add('Use a parte Material do curso para exigir abrir o livro.')
      } else if (content.kind === 'quiz') {
        if (
          typeof content.passingScore !== 'number' ||
          content.passingScore <= 0 ||
          !Array.isArray(content.questions) ||
          !content.questions.length
        )
          add('O quiz precisa de perguntas e nota mínima maior que zero.')
      } else if (content.kind === 'studio' || content.kind === 'pinta') {
        if (content.purpose === 'experiment' || !['closing', 'delivery'].includes(s.intent))
          add(
            'A entrega obrigatória do projeto deve ficar em Entrega e compartilhamento ou no fechamento.',
          )
      } else add('Use uma pergunta, desafio ou entrega como critério de conclusão.')
    }
    for (const requirement of c.materialItems ?? []) {
      if (
        !c.blockIds.includes(requirement.blockId) ||
        !blocks.some(
          (block) =>
            block.id === requirement.blockId &&
            record(block.content) &&
            block.content.kind === 'materials',
        )
      )
        add('A seleção de arquivos obrigatórios deve pertencer a um bloco de materiais escolhido.')
    }
    if (
      c.projectChecks?.some(
        (check) =>
          !label(check.label) ||
          (check.programmingLanguage === 'python'
            ? false
            : check.rule.type === 'usesBlock'
              ? hasBlankBlockType(check.rule)
              : check.rule.type === 'usesLoop' ||
                  check.rule.type === 'behavior' ||
                  check.rule.type === 'script'
                ? false
                : !label(check.rule.name)),
      )
    )
      add('Preencha o objetivo e o nome esperado na verificação do Estúdio.')
    if (c.projectChecks?.length) {
      const workspace = blocks.find((block) => block.id === s.workspaceBlockId)
      const project = record(workspace?.content) ? workspace.content.initialProject : undefined
      const issue = sectionProjectChecksEnvironmentIssue(c.projectChecks, project)
      if (issue) add(issue)
    }
    if (
      s.intent === 'material' &&
      (c.platformAction ||
        s.workspaceBlockId ||
        s.externalTool ||
        c.projectChecks?.length ||
        c.blockIds.some(
          (id) =>
            !blocks.some(
              (b) =>
                b.id === id &&
                record(b.content) &&
                ['ebook', 'materials', 'video'].includes(String(b.content.kind)),
            ),
        ))
    )
      add(
        'Em Material do curso, escolha o livro, os arquivos para baixar ou o vídeo desta parte. Separe quiz e entrega de projeto em outra seção.',
      )
    if (
      c.projectChecks?.length &&
      !blocks.some(
        (b) =>
          b.id === s.workspaceBlockId &&
          record(b.content) &&
          b.content.kind === 'studio' &&
          !b.content.gallery,
      )
    )
      add('A verificação de projeto precisa de um Estúdio incorporado nesta parte.')
    if (c.submissionUpToDate && !submissionUpToDateWorkspace(sections, blocks, s.id))
      add(
        'O envio em dia precisa de um Estúdio ou Pinta incorporado nesta parte, já entregue numa seção de entrega anterior.',
      )
    for (const b of blocks) {
      if (!s.blockIds.includes(b.id) || !record(b.content)) continue
      if (
        (b.content.kind === 'studio' || b.content.kind === 'pinta') &&
        b.content.purpose !== 'experiment' &&
        !isFinalProjectSection(sections, s.id)
      )
        add(
          'Coloque a entrega antes do quiz final, em Entrega e compartilhamento, ou no último Fechamento.',
        )
    }
    return issues
  })
}

/**
 * O espaço de trabalho que o "envio em dia" confere: um Estúdio ou Pinta incorporado (não a
 * galeria, que entrega trabalhos de fora da aula) cuja seção DONA é a de entrega do projeto e vem
 * antes desta (ou é esta). Sem isso não há envio a conferir, e a parte nunca fecharia.
 */
export function submissionUpToDateWorkspace(
  sections: readonly Pick<LessonSection, 'id' | 'intent' | 'blockIds' | 'workspaceBlockId'>[],
  blocks: readonly { id: string; content: unknown }[],
  sectionId: string,
): { blockId: string; kind: 'studio' | 'pinta' } | null {
  const index = sections.findIndex((section) => section.id === sectionId)
  const blockId = sections[index]?.workspaceBlockId
  if (!blockId) return null
  const block = blocks.find((b) => b.id === blockId)
  if (
    !block ||
    !record(block.content) ||
    (block.content.kind !== 'studio' && block.content.kind !== 'pinta') ||
    block.content.gallery ||
    block.content.purpose === 'experiment'
  )
    return null
  const owner = sections.findIndex((section) => section.blockIds.includes(blockId))
  if (owner < 0 || owner > index || !isFinalProjectSection(sections, sections[owner]?.id ?? ''))
    return null
  return { blockId, kind: block.content.kind }
}

/** A comparação do "envio em dia", pura: o members só junta os dois lados e pergunta aqui. */
export type SubmissionFreshness = 'missing' | 'outdated' | 'fresh'

/**
 * `missing` = nada enviado; `outdated` = o rascunho guardado na conta é DIFERENTE do envio e foi
 * guardado DEPOIS dele (os dois relógios são do servidor); senão `fresh`.
 *
 * ⚠️ Faltando a impressão de qualquer lado (envio antigo, rascunho que nunca subiu, navegador sem
 * `crypto.subtle`), a régua deixa passar: ela existe para lembrar a criança, nunca para prendê-la
 * por uma informação que o sistema não tem.
 * Versões diferentes também são incomparáveis: migrar o formato não comprova que o aluno
 * editou o programa. O próximo envio e rascunho usam a mesma régua e retomam a conferência.
 */
export function submissionFreshness(input: {
  submission: { fingerprint: string | null; submittedAt: Date } | null
  draft: { fingerprint: string | null; syncedAt: Date } | null
}): SubmissionFreshness {
  if (!input.submission) return 'missing'
  const sent = input.submission.fingerprint
  const draft = input.draft
  if (!sent || !draft?.fingerprint) return 'fresh'
  if (compareContentFingerprints(draft.fingerprint, sent) !== 'different') return 'fresh'
  return draft.syncedAt.getTime() > input.submission.submittedAt.getTime() ? 'outdated' : 'fresh'
}

/** Completed milestones survive review. Only the first unfinished section is available. */
function semRepetidos(itens: readonly SectionPendingItem[]): SectionPendingItem[] {
  const vistos = new Set<string>()
  return itens.filter((item) => {
    const chave = `${item.kind}\u0000${item.text}`
    if (vistos.has(chave)) return false
    vistos.add(chave)
    return true
  })
}

export function sectionProgressView(
  revision: string,
  sections: { id: string; title: string }[],
  completedIds: ReadonlySet<string>,
  /** Texto cru vira `kind: 'other'`; o members manda itens tipados. */
  pending: ReadonlyMap<string, readonly (string | SectionPendingItem)[]>,
  /**
   * Curso AO VIVO: nenhuma parte fica trancada pela anterior. Durante o encontro quem conduz é a
   * professora (ela abre as partes na sala); depois, a criança vai no próprio ritmo.
   */
  options: {
    freeOrder?: boolean
    /** O último resultado de cada objetivo por seção (só os da revisão atual). */
    objectiveResults?: ReadonlyMap<string, readonly ProjectObjectiveResult[]>
  } = {},
): SectionProgressView {
  let available = true
  const objetivos = (id: string) => {
    const results = options.objectiveResults?.get(id)
    return results?.length
      ? { objectives: results.map((r) => ({ id: r.id, passed: r.passed })) }
      : {}
  }
  const states = sections.map((s) => {
    if (completedIds.has(s.id))
      return {
        id: s.id,
        title: s.title,
        status: 'completed' as const,
        pending: [],
        pendingItems: [],
        ...objetivos(s.id),
      }
    const status = available ? ('available' as const) : ('locked' as const)
    available = Boolean(options.freeOrder)
    // ⚠️ Sem repetidos: `lessonCompletionRequirements` cria UM requisito por bloco, e uma parte com
    // três descobertas obrigatórias virava três "Termine o experimento" (review do lote 2).
    const itens: SectionPendingItem[] =
      status === 'locked'
        ? [{ kind: 'locked', text: 'Conclua a parte anterior' }]
        : semRepetidos(
            (pending.get(s.id) ?? []).map((item) =>
              typeof item === 'string' ? { kind: 'other', text: item } : item,
            ),
          )
    return {
      id: s.id,
      title: s.title,
      status,
      pending: itens.map((item) => item.text),
      pendingItems: itens,
      ...(status === 'locked' ? {} : objetivos(s.id)),
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
